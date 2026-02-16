/**
 * Execution Service
 *
 * Manages test execution lifecycle, logging, and step tracking.
 */

import {
  executionRepository,
  executionLogRepository,
  executionStepRepository,
  projectRepository,
  testFlowRepository,
  workflowRepository,
} from '../db/repositories/mongo';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import type { Execution, ExecutionLog } from '@playwright-web-app/shared';

interface RecentExecutionScenario {
  id: string;
  name: string;
  status: string;
  duration: number | null;
  error: string | null;
  traceUrl: string;
  screenshot: string | null;
  steps: unknown[];
}

interface RecentExecution {
  id: string;
  testFlowId: string;
  applicationId?: string;
  projectId?: string;
  projectName?: string;
  testFlowName: string;
  status: string;
  target: string;
  triggeredBy: { type: string; name?: string };
  startedAt?: string;
  finishedAt?: string;
  stepCount: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  duration?: number;
  configSnapshot?: unknown;
  scenarios: RecentExecutionScenario[];
  logs: { id: string; message: string; level: string; timestamp: string }[];
}

export class ExecutionService {
  async updateStatus(
    executionId: string,
    status: string,
    exitCode?: number,
    testFlowId?: string
  ): Promise<Execution | null> {
    const data: Partial<import('@playwright-web-app/shared').Execution> = {};

    if (status === 'running') {
      data.startedAt = new Date();
    } else if (['passed', 'failed', 'cancelled'].includes(status)) {
      data.finishedAt = new Date();
      if (exitCode !== undefined) {
        data.exitCode = exitCode;
      }
    }

    // Try to update existing record atomically
    const execution = await executionRepository.updateStatus(
      executionId,
      status as 'pending' | 'running' | 'passed' | 'failed' | 'cancelled',
      data
    );

    if (execution) {
      return this.formatExecution(execution);
    }

    // If record not found and we have testFlowId, create it
    if (testFlowId) {
      const newExecution = await executionRepository.create({
        id: executionId, // Use the provided ID if creating new
        testFlowId,
        status: status as 'pending' | 'running' | 'passed' | 'failed' | 'cancelled',
        target: 'local',
        triggeredBy: 'manual',
        startedAt: status === 'running' ? new Date() : undefined,
        finishedAt: ['passed', 'failed', 'cancelled'].includes(status) ? new Date() : undefined,
        exitCode: exitCode,
      });
      return this.formatExecution(newExecution);
    }

    // If record not found but no testFlowId, return null (non-critical)
    return null;
  }

  async addLog(
    executionId: string,
    message: string,
    level: 'info' | 'warn' | 'error' = 'info'
  ): Promise<ExecutionLog> {
    const log = await executionLogRepository.create({
      executionId,
      message,
      level,
      timestamp: new Date(),
    });

    return {
      id: log.id,
      executionId: log.executionId,
      message: log.message,
      level: log.level as 'info' | 'warn' | 'error',
      timestamp: log.timestamp,
    };
  }

  /**
   * Find recent executions across all test flows for a user
   */
  async findRecent(userId: string, limit: number = 200, applicationId?: string): Promise<RecentExecution[]> {
    const scopedApplicationId =
      typeof applicationId === 'string' && applicationId.trim().length > 0
        ? applicationId.trim()
        : undefined;

    // Get all workflows for user
    const workflows = await workflowRepository.findByUserId(userId);
    const workflowMap = new Map(workflows.map((workflow) => [workflow.id, workflow]));
    const scopedWorkflows = scopedApplicationId
      ? workflows.filter((workflow) => workflow.applicationId === scopedApplicationId)
      : workflows;
    const workflowIds = scopedWorkflows.map((workflow) => workflow.id);
    if (workflowIds.length === 0) {
      return [];
    }

    // Get all test flows for those workflows
    const testFlowsPromises = workflowIds.map(wid => testFlowRepository.findByWorkflowId(wid));
    const testFlowsArrays = await Promise.all(testFlowsPromises);
    const testFlows = testFlowsArrays.flat();
    const testFlowMap = new Map(testFlows.map(tf => [tf.id, tf]));
    if (testFlows.length === 0) {
      return [];
    }

    // Get recent executions
    const executions = await executionRepository.findRecent(limit);

    // Filter to only user's test flows (children already excluded at query level).
    // When applicationId is provided, enforce strict app scope and allow
    // workflow-based fallback for legacy executions missing applicationId.
    const userExecutions = executions.filter((exec) => {
      const testFlow = testFlowMap.get(exec.testFlowId);
      if (!testFlow) return false;
      if (!scopedApplicationId) return true;

      const workflow = workflowMap.get(testFlow.workflowId);
      const effectiveApplicationId = exec.applicationId || workflow?.applicationId;
      return effectiveApplicationId === scopedApplicationId;
    });
    if (userExecutions.length === 0) {
      return [];
    }

    const projectNameById = new Map<string, string>();
    if (scopedApplicationId) {
      const applicationProjects = await projectRepository.findByApplicationId(scopedApplicationId);
      for (const project of applicationProjects) {
        projectNameById.set(project.id, project.name);
      }
    } else {
      const projectIds = Array.from(
        new Set(
          userExecutions
            .map((execution) => execution.projectId)
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        )
      );
      const projects = await Promise.all(projectIds.map((projectId) => projectRepository.findById(projectId)));
      for (const project of projects) {
        if (project) {
          projectNameById.set(project.id, project.name);
        }
      }
    }

    // Batch fetch steps and logs regarding userExecutions
    const executionIds = userExecutions.map(e => e.id);
    const [allSteps, allLogs] = await Promise.all([
      executionStepRepository.findByExecutionIds(executionIds),
      executionLogRepository.findByExecutionIds(executionIds)
    ]);

    // Group steps and logs by executionId
    const stepsByExecId = new Map<string, any[]>();
    for (const step of allSteps) {
      if (!stepsByExecId.has(step.executionId)) {
        stepsByExecId.set(step.executionId, []);
      }
      stepsByExecId.get(step.executionId)!.push(step);
    }

    const logsByExecId = new Map<string, any[]>();
    for (const log of allLogs) {
      if (!logsByExecId.has(log.executionId)) {
        logsByExecId.set(log.executionId, []);
      }
      logsByExecId.get(log.executionId)!.push(log);
    }

    // Batch-fetch matrix children for any parent executions
    const matrixParentIds = userExecutions
      .filter((e) => e.isMatrixParent)
      .map((e) => e.id);
    const matrixChildExecutions = matrixParentIds.length > 0
      ? await executionRepository.findByMatrixParentIds(matrixParentIds)
      : [];
    const matrixChildrenByParent = new Map<string, typeof matrixChildExecutions>();
    for (const child of matrixChildExecutions) {
      if (!child.matrixParentId) continue;
      if (!matrixChildrenByParent.has(child.matrixParentId)) {
        matrixChildrenByParent.set(child.matrixParentId, []);
      }
      matrixChildrenByParent.get(child.matrixParentId)!.push(child);
    }

    // Batch-fetch steps for matrix children to compute their metrics
    const matrixChildIds = matrixChildExecutions.map((c) => c.id);
    const matrixChildSteps = matrixChildIds.length > 0
      ? await executionStepRepository.findByExecutionIds(matrixChildIds)
      : [];
    const matrixStepsByExecId = new Map<string, any[]>();
    for (const step of matrixChildSteps) {
      if (!matrixStepsByExecId.has(step.executionId)) {
        matrixStepsByExecId.set(step.executionId, []);
      }
      matrixStepsByExecId.get(step.executionId)!.push(step);
    }

    const enrichedExecutions = userExecutions.map((exec) => {
      const testFlow = testFlowMap.get(exec.testFlowId)!;
      const workflow = workflowMap.get(testFlow.workflowId);
      const executionApplicationId = exec.applicationId || workflow?.applicationId;
      const executionProjectId =
        typeof exec.projectId === 'string' && exec.projectId.trim().length > 0
          ? exec.projectId
          : undefined;
      const resolvedProjectName = executionProjectId ? projectNameById.get(executionProjectId) : undefined;
      const projectName = resolvedProjectName || (scopedApplicationId ? 'Unassigned' : undefined);
      const steps = stepsByExecId.get(exec.id) || [];
      const logs = logsByExecId.get(exec.id) || [];

      // For matrix parents, aggregate metrics from children instead of (empty) parent steps
      let passedCount: number;
      let failedCount: number;
      let skippedCount: number;
      let stepCount: number;
      let matrixChildrenData: any[] | undefined;

      if (exec.isMatrixParent) {
        const children = matrixChildrenByParent.get(exec.id) || [];
        matrixChildrenData = children.map((child) => {
          const childSteps = matrixStepsByExecId.get(child.id) || [];
          return {
            id: child.id,
            label: child.matrixLabel || '',
            status: child.status,
            durationLabel: child.startedAt && child.finishedAt
              ? `${Math.round((new Date(child.finishedAt).getTime() - new Date(child.startedAt).getTime()) / 1000)}s`
              : '',
            passedCount: childSteps.filter((s) => s.status === 'passed').length,
            failedCount: childSteps.filter((s) => s.status === 'failed').length,
            skippedCount: childSteps.filter((s) => s.status === 'skipped').length,
          };
        });
        passedCount = matrixChildrenData.reduce((sum, c) => sum + c.passedCount, 0);
        failedCount = matrixChildrenData.reduce((sum, c) => sum + c.failedCount, 0);
        skippedCount = matrixChildrenData.reduce((sum, c) => sum + c.skippedCount, 0);
        stepCount = passedCount + failedCount + skippedCount;
        // When children haven't reported yet, fall back to parent's own steps
        if (stepCount === 0 && steps.length > 0) {
          passedCount = steps.filter((s) => s.status === 'passed').length;
          failedCount = steps.filter((s) => s.status === 'failed').length;
          skippedCount = steps.filter((s) => s.status === 'skipped').length;
          stepCount = steps.length;
        }
      } else {
        passedCount = steps.filter((s) => s.status === 'passed').length;
        failedCount = steps.filter((s) => s.status === 'failed').length;
        skippedCount = steps.filter((s) => s.status === 'skipped').length;
        stepCount = steps.length;
      }

      return {
        id: exec.id,
        testFlowId: exec.testFlowId,
        applicationId: executionApplicationId,
        projectId: executionProjectId,
        projectName,
        testFlowName: testFlow.name,
        status: exec.status,
        target: exec.target,
        triggeredBy: {
          type: exec.triggeredBy || 'manual',
          name: exec.scheduleName || (exec.triggeredBy === 'schedule' ? 'Scheduled' : undefined),
          scheduleId: exec.scheduleId,
        },
        startedAt: exec.startedAt?.toISOString(),
        finishedAt: exec.finishedAt?.toISOString(),
        stepCount,
        passedCount,
        failedCount,
        skippedCount,
        // Frontend-compatible aliases
        totalTests: stepCount,
        passedTests: passedCount,
        failedTests: failedCount,
        duration: exec.startedAt && exec.finishedAt
          ? new Date(exec.finishedAt).getTime() - new Date(exec.startedAt).getTime()
          : undefined,
        configSnapshot: exec.configSnapshot ? JSON.parse(exec.configSnapshot) : undefined,
        // Map steps to scenarios for frontend display
        scenarios: steps.map((step) => {
          const scenarioName = step.description || `Test ${step.stepNumber}`;
          // Generate screenshot URL based on scenario name (for local executions)
          const scenarioSlug = scenarioName.toLowerCase().replace(/\s+/g, '-');
          return {
            id: step.id,
            name: scenarioName,
            status: step.status,
            duration: step.duration || null,
            error: step.error || null,
            traceUrl: `/api/executions/${exec.id}/trace`,
            screenshot: step.screenshot || `/api/executions/local/screenshot/${encodeURIComponent(scenarioSlug)}`,
            steps: step.stepsJson ? JSON.parse(step.stepsJson) : [],
          };
        }),
        logs: logs.slice(0, 50).map((log) => ({
          id: log.id,
          message: log.message,
          level: log.level,
          timestamp: log.timestamp.toISOString(),
        })),
        ...(exec.isMatrixParent && matrixChildrenData && {
          isMatrixParent: true,
          matrixChildren: matrixChildrenData,
        }),
      };
    });

    // Compute runNumber relative to the filtered result set.
    // When applicationId scoping is active, number within the scoped view
    // so run numbers remain contiguous rather than showing gaps.
    return enrichedExecutions.map((exec, index) => ({
      ...exec,
      runNumber: userExecutions.length - index,
    }));
  }

  async delete(userId: string, executionId: string): Promise<void> {
    const execution = await executionRepository.findById(executionId);

    if (!execution) {
      throw new NotFoundError('Execution not found');
    }

    // Get test flow and workflow to check access
    const testFlow = await testFlowRepository.findById(execution.testFlowId);
    if (!testFlow) {
      throw new NotFoundError('Test flow not found');
    }

    const workflow = await workflowRepository.findById(testFlow.workflowId);
    if (!workflow || workflow.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    // Delete related data
    await executionLogRepository.deleteByExecutionId(executionId);
    await executionStepRepository.deleteByExecutionId(executionId);
    await executionRepository.delete(executionId);
  }

  private formatExecution(execution: any): Execution {
    return {
      id: execution.id,
      testFlowId: execution.testFlowId,
      status: execution.status,
      exitCode: execution.exitCode,
      target: execution.target,
      agentId: execution.agentId,
      startedAt: execution.startedAt,
      finishedAt: execution.finishedAt,
      createdAt: execution.createdAt,
      logs: execution.logs?.map((log: any) => ({
        id: log.id,
        executionId: log.executionId,
        message: log.message,
        level: log.level,
        timestamp: log.timestamp,
      })),
    };
  }
}

/**
 * Execution Service
 * NOW USES MONGODB INSTEAD OF PRISMA
 */

import { executionRepository, executionLogRepository, executionStepRepository, testFlowRepository, workflowRepository } from '../db/repositories/mongo';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import type { Execution, ExecutionCreate, ExecutionLog } from '@playwright-web-app/shared';
import { v4 as uuidv4 } from 'uuid';

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
  /**
   * Verify user has access to a test flow
   */
  private async verifyTestFlowAccess(userId: string, testFlowId: string): Promise<void> {
    const testFlow = await testFlowRepository.findById(testFlowId);
    if (!testFlow) {
      throw new NotFoundError('Test flow not found');
    }

    const workflow = await workflowRepository.findById(testFlow.workflowId);
    if (!workflow || workflow.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }
  }

  async create(userId: string, testFlowId: string, data: ExecutionCreate): Promise<Execution> {
    await this.verifyTestFlowAccess(userId, testFlowId);

    const execution = await executionRepository.create({
      testFlowId,
      status: 'pending',
      target: data.target,
      agentId: data.agentId,
      triggeredBy: 'manual',
    });

    return this.formatExecution(execution);
  }

  async findAll(userId: string, testFlowId: string): Promise<Execution[]> {
    await this.verifyTestFlowAccess(userId, testFlowId);

    const executions = await executionRepository.findByTestFlowId(testFlowId, 200);
    return executions.map(this.formatExecution);
  }

  async findOne(userId: string, executionId: string): Promise<Execution> {
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

    // Get logs
    const logs = await executionLogRepository.findByExecutionId(executionId);

    return this.formatExecution({ ...execution, logs });
  }

  async updateStatus(
    executionId: string,
    status: string,
    exitCode?: number,
    testFlowId?: string
  ): Promise<Execution | null> {
    const data: { status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled'; startedAt?: Date; finishedAt?: Date; exitCode?: number } = {
      status: status as 'pending' | 'running' | 'passed' | 'failed' | 'cancelled'
    };

    if (status === 'running') {
      data.startedAt = new Date();
    } else if (['passed', 'failed', 'cancelled'].includes(status)) {
      data.finishedAt = new Date();
      if (exitCode !== undefined) {
        data.exitCode = exitCode;
      }
    }

    // Try to update existing record
    const existing = await executionRepository.findById(executionId);

    if (existing) {
      const execution = await executionRepository.update(executionId, data);
      return execution ? this.formatExecution(execution) : null;
    }

    // If record not found and we have testFlowId, create it
    if (testFlowId) {
      const execution = await executionRepository.create({
        testFlowId,
        status: status as 'pending' | 'running' | 'passed' | 'failed' | 'cancelled',
        target: 'local',
        triggeredBy: 'manual',
        startedAt: status === 'running' ? new Date() : undefined,
        finishedAt: ['passed', 'failed', 'cancelled'].includes(status) ? new Date() : undefined,
        exitCode: exitCode,
      });
      return this.formatExecution(execution);
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
  async findRecent(userId: string, limit: number = 200): Promise<RecentExecution[]> {
    // Get all workflows for user
    const workflows = await workflowRepository.findByUserId(userId);
    const workflowIds = workflows.map(w => w.id);

    // Get all test flows for those workflows
    const testFlowsPromises = workflowIds.map(wid => testFlowRepository.findByWorkflowId(wid));
    const testFlowsArrays = await Promise.all(testFlowsPromises);
    const testFlows = testFlowsArrays.flat();
    const testFlowMap = new Map(testFlows.map(tf => [tf.id, tf]));

    // Get recent executions
    const executions = await executionRepository.findRecent(limit);

    // Filter to only user's test flows and enrich with related data
    const userExecutions = executions.filter(exec => testFlowMap.has(exec.testFlowId));

    const enrichedExecutions = await Promise.all(
      userExecutions.map(async (exec) => {
        const testFlow = testFlowMap.get(exec.testFlowId)!;
        const steps = await executionStepRepository.findByExecutionId(exec.id);
        const logs = await executionLogRepository.findByExecutionId(exec.id);

        return {
          id: exec.id,
          testFlowId: exec.testFlowId,
          testFlowName: testFlow.name,
          status: exec.status,
          target: exec.target,
          triggeredBy: {
            type: exec.triggeredBy || 'manual',
            name: exec.triggeredBy === 'schedule' ? 'Scheduled' : undefined,
          },
          startedAt: exec.startedAt?.toISOString(),
          finishedAt: exec.finishedAt?.toISOString(),
          stepCount: steps.length,
          passedCount: steps.filter((s) => s.status === 'passed').length,
          failedCount: steps.filter((s) => s.status === 'failed').length,
          skippedCount: steps.filter((s) => s.status === 'skipped').length,
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
        };
      })
    );

    return enrichedExecutions;
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

import { prisma } from '../db/prisma';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import type { Execution, ExecutionCreate, ExecutionLog } from '@playwright-web-app/shared';

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
  async create(userId: string, testFlowId: string, data: ExecutionCreate): Promise<Execution> {
    // Verify test flow belongs to user
    const testFlow = await prisma.testFlow.findUnique({
      where: { id: testFlowId },
      include: { workflow: true },
    });

    if (!testFlow) {
      throw new NotFoundError('Test flow not found');
    }

    if (testFlow.workflow.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const execution = await prisma.execution.create({
      data: {
        testFlowId,
        status: 'pending',
        target: data.target,
        agentId: data.agentId,
      },
    });

    return this.formatExecution(execution);
  }

  async findAll(userId: string, testFlowId: string): Promise<Execution[]> {
    // Verify test flow belongs to user
    const testFlow = await prisma.testFlow.findUnique({
      where: { id: testFlowId },
      include: { workflow: true },
    });

    if (!testFlow) {
      throw new NotFoundError('Test flow not found');
    }

    if (testFlow.workflow.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const executions = await prisma.execution.findMany({
      where: { testFlowId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return executions.map(this.formatExecution);
  }

  async findOne(userId: string, executionId: string): Promise<Execution> {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      include: {
        testFlow: {
          include: { workflow: true },
        },
        logs: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!execution) {
      throw new NotFoundError('Execution not found');
    }

    if (execution.testFlow.workflow.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    return this.formatExecution(execution);
  }

  async updateStatus(
    executionId: string,
    status: string,
    exitCode?: number,
    testFlowId?: string
  ): Promise<Execution | null> {
    const data: { status: string; startedAt?: Date; finishedAt?: Date; exitCode?: number } = { status };

    if (status === 'running') {
      data.startedAt = new Date();
    } else if (['passed', 'failed', 'cancelled'].includes(status)) {
      data.finishedAt = new Date();
      if (exitCode !== undefined) {
        data.exitCode = exitCode;
      }
    }

    try {
      // Try to update existing record
      const execution = await prisma.execution.update({
        where: { id: executionId },
        data,
      });
      return this.formatExecution(execution);
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      // If record not found and we have testFlowId, create it
      if (prismaError.code === 'P2025' && testFlowId) {
        const execution = await prisma.execution.create({
          data: {
            id: executionId,
            testFlowId,
            status,
            target: 'local',
            startedAt: status === 'running' ? new Date() : undefined,
            finishedAt: ['passed', 'failed', 'cancelled'].includes(status) ? new Date() : undefined,
            exitCode: exitCode,
          },
        });
        return this.formatExecution(execution);
      }
      // If record not found but no testFlowId, return null (non-critical)
      if (prismaError.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  async addLog(
    executionId: string,
    message: string,
    level: 'info' | 'warn' | 'error' = 'info'
  ): Promise<ExecutionLog> {
    const log = await prisma.executionLog.create({
      data: {
        executionId,
        message,
        level,
      },
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
    const executions = await prisma.execution.findMany({
      where: {
        testFlow: {
          workflow: {
            userId,
          },
        },
      },
      include: {
        testFlow: {
          select: {
            id: true,
            name: true,
          },
        },
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
        logs: {
          orderBy: { timestamp: 'asc' },
          take: 50,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return executions.map((exec) => ({
      id: exec.id,
      testFlowId: exec.testFlowId,
      testFlowName: exec.testFlow.name,
      status: exec.status,
      target: exec.target,
      triggeredBy: {
        type: exec.triggeredBy || 'manual',
        name: exec.triggeredBy === 'schedule' ? 'Scheduled' : undefined,
      },
      startedAt: exec.startedAt?.toISOString(),
      finishedAt: exec.finishedAt?.toISOString(),
      stepCount: exec.steps.length,
      passedCount: exec.steps.filter((s) => s.status === 'passed').length,
      failedCount: exec.steps.filter((s) => s.status === 'failed').length,
      skippedCount: exec.steps.filter((s) => s.status === 'skipped').length,
      duration: exec.startedAt && exec.finishedAt
        ? new Date(exec.finishedAt).getTime() - new Date(exec.startedAt).getTime()
        : undefined,
      configSnapshot: exec.configSnapshot ? JSON.parse(exec.configSnapshot) : undefined,
      // Map steps to scenarios for frontend display
      scenarios: exec.steps.map((step) => {
        const scenarioName = step.description || `Test ${step.stepNumber}`;
        // Generate screenshot URL based on scenario name (for local executions)
        const scenarioSlug = scenarioName.toLowerCase().replace(/\s+/g, '-');
        return {
          id: step.id,
          name: scenarioName,
          status: step.status,
          duration: step.duration,
          error: step.error,
          traceUrl: `/api/executions/${exec.id}/trace`,
          screenshot: step.screenshot || `/api/executions/local/screenshot/${encodeURIComponent(scenarioSlug)}`,
          steps: step.stepsJson ? JSON.parse(step.stepsJson) : [],
        };
      }),
      logs: exec.logs.map((log) => ({
        id: log.id,
        message: log.message,
        level: log.level,
        timestamp: log.timestamp.toISOString(),
      })),
    }));
  }

  async delete(userId: string, executionId: string): Promise<void> {
    const existing = await prisma.execution.findUnique({
      where: { id: executionId },
      include: {
        testFlow: {
          include: { workflow: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Execution not found');
    }

    if (existing.testFlow.workflow.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    await prisma.execution.delete({
      where: { id: executionId },
    });
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

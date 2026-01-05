import { prisma } from '../db/prisma';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import type { Execution, ExecutionCreate, ExecutionLog } from '@playwright-web-app/shared';

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
    const data: any = { status };

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
    } catch (error: any) {
      // If record not found and we have testFlowId, create it
      if (error.code === 'P2025' && testFlowId) {
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
      // If record not found but no testFlowId, just log and return null (non-critical)
      if (error.code === 'P2025') {
        console.warn(`Execution ${executionId} not found, skipping status update`);
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

import { prisma } from '../db/prisma';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import type { TestFlow, TestFlowCreate, TestFlowUpdate } from '@playwright-web-app/shared';

export class TestFlowService {
  async create(userId: string, workflowId: string, data: TestFlowCreate): Promise<TestFlow> {
    // Verify workflow belongs to user
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    if (workflow.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const testFlow = await prisma.testFlow.create({
      data: {
        workflowId,
        name: data.name,
        code: data.code,
        nodes: data.nodes,
        edges: data.edges,
        language: data.language || 'typescript',
      },
    });

    return this.formatTestFlow(testFlow);
  }

  async findAll(userId: string, workflowId: string): Promise<TestFlow[]> {
    // Verify workflow belongs to user
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    if (workflow.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const testFlows = await prisma.testFlow.findMany({
      where: { workflowId },
      include: {
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return testFlows.map(this.formatTestFlow);
  }

  async findOne(userId: string, testFlowId: string): Promise<TestFlow> {
    const testFlow = await prisma.testFlow.findUnique({
      where: { id: testFlowId },
      include: {
        workflow: true,
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!testFlow) {
      throw new NotFoundError('Test flow not found');
    }

    if (testFlow.workflow.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    return this.formatTestFlow(testFlow);
  }

  async update(userId: string, testFlowId: string, data: TestFlowUpdate): Promise<TestFlow> {
    const existing = await prisma.testFlow.findUnique({
      where: { id: testFlowId },
      include: { workflow: true },
    });

    if (!existing) {
      throw new NotFoundError('Test flow not found');
    }

    if (existing.workflow.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const testFlow = await prisma.testFlow.update({
      where: { id: testFlowId },
      data: {
        name: data.name,
        code: data.code,
        nodes: data.nodes,
        edges: data.edges,
        language: data.language,
      },
    });

    return this.formatTestFlow(testFlow);
  }

  async delete(userId: string, testFlowId: string): Promise<void> {
    const existing = await prisma.testFlow.findUnique({
      where: { id: testFlowId },
      include: { workflow: true },
    });

    if (!existing) {
      throw new NotFoundError('Test flow not found');
    }

    if (existing.workflow.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    await prisma.testFlow.delete({
      where: { id: testFlowId },
    });
  }

  async clone(userId: string, testFlowId: string): Promise<TestFlow> {
    const existing = await prisma.testFlow.findUnique({
      where: { id: testFlowId },
      include: { workflow: true },
    });

    if (!existing) {
      throw new NotFoundError('Test flow not found');
    }

    if (existing.workflow.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const cloned = await prisma.testFlow.create({
      data: {
        workflowId: existing.workflowId,
        name: `${existing.name} (Copy)`,
        code: existing.code,
        language: existing.language,
      },
    });

    return this.formatTestFlow(cloned);
  }

  private formatTestFlow(testFlow: any): TestFlow {
    return {
      id: testFlow.id,
      workflowId: testFlow.workflowId,
      name: testFlow.name,
      code: testFlow.code,
      nodes: testFlow.nodes,
      edges: testFlow.edges,
      language: testFlow.language,
      createdAt: testFlow.createdAt,
      updatedAt: testFlow.updatedAt,
      executions: testFlow.executions?.map((ex: any) => ({
        id: ex.id,
        testFlowId: ex.testFlowId,
        status: ex.status,
        exitCode: ex.exitCode,
        target: ex.target,
        agentId: ex.agentId,
        startedAt: ex.startedAt,
        finishedAt: ex.finishedAt,
        createdAt: ex.createdAt,
      })),
    };
  }
}

/**
 * TestFlow Service
 *
 * Manages test flows within workflows.
 */

import { testFlowRepository, workflowRepository, executionRepository } from '../db/repositories/mongo';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import type { TestFlow, TestFlowCreate, TestFlowUpdate } from '@playwright-web-app/shared';

export class TestFlowService {
  private async verifyWorkflowAccess(userId: string, workflowId: string): Promise<void> {
    const workflow = await workflowRepository.findById(workflowId);

    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    if (workflow.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }
  }

  /**
   * Verify the user owns the workflow that contains the given test flow.
   * Returns the test flow record.
   */
  private async verifyTestFlowAccess(userId: string, testFlowId: string): Promise<any> {
    const testFlow = await testFlowRepository.findById(testFlowId);

    if (!testFlow) {
      throw new NotFoundError('Test flow not found');
    }

    const workflow = await workflowRepository.findById(testFlow.workflowId);

    if (!workflow || workflow.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    return testFlow;
  }

  async create(userId: string, workflowId: string, data: TestFlowCreate): Promise<TestFlow> {
    await this.verifyWorkflowAccess(userId, workflowId);

    const testFlow = await testFlowRepository.create({
      workflowId,
      name: data.name,
      code: data.code,
      nodes: data.nodes,
      edges: data.edges,
      language: data.language || 'typescript',
      tags: [],
    });

    return this.formatTestFlow(testFlow);
  }

  async findAll(userId: string, workflowId: string): Promise<TestFlow[]> {
    await this.verifyWorkflowAccess(userId, workflowId);

    const testFlows = await testFlowRepository.findByWorkflowId(workflowId);

    // Enrich with recent executions
    const testFlowsWithExecutions = await Promise.all(
      testFlows.map(async (tf) => {
        const executions = await executionRepository.findByTestFlowId(tf.id, 5);
        return { ...tf, executions };
      })
    );

    return testFlowsWithExecutions.map(this.formatTestFlow);
  }

  async findOne(userId: string, testFlowId: string): Promise<TestFlow> {
    const testFlow = await this.verifyTestFlowAccess(userId, testFlowId);

    const executions = await executionRepository.findByTestFlowId(testFlowId, 10);

    return this.formatTestFlow({ ...testFlow, executions });
  }

  async update(userId: string, testFlowId: string, data: TestFlowUpdate): Promise<TestFlow> {
    await this.verifyTestFlowAccess(userId, testFlowId);

    const testFlow = await testFlowRepository.update(testFlowId, {
      name: data.name,
      code: data.code,
      nodes: data.nodes,
      edges: data.edges,
      language: data.language,
    });

    if (!testFlow) {
      throw new NotFoundError('Test flow not found');
    }

    return this.formatTestFlow(testFlow);
  }

  async delete(userId: string, testFlowId: string): Promise<void> {
    await this.verifyTestFlowAccess(userId, testFlowId);
    await testFlowRepository.delete(testFlowId);
  }

  async clone(userId: string, testFlowId: string): Promise<TestFlow> {
    const existing = await this.verifyTestFlowAccess(userId, testFlowId);

    const cloned = await testFlowRepository.create({
      workflowId: existing.workflowId,
      name: `${existing.name} (Copy)`,
      code: existing.code,
      language: existing.language,
      tags: existing.tags || [],
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

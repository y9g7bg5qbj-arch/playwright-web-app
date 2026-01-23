/**
 * Workflow Service
 * NOW USES MONGODB INSTEAD OF PRISMA
 */

import { workflowRepository, applicationRepository, testFlowRepository, executionRepository } from '../db/repositories/mongo';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import type { Workflow, WorkflowCreate, WorkflowUpdate } from '@playwright-web-app/shared';

export class WorkflowService {
  /**
   * Check if user has access to an application (owner)
   * Note: Multi-tenant member access removed - single company mode
   */
  private async checkApplicationAccess(userId: string, applicationId: string): Promise<boolean> {
    const application = await applicationRepository.findById(applicationId);

    if (!application) {
      return false;
    }

    // User is owner of the application
    return application.userId === userId;
  }

  async create(userId: string, data: WorkflowCreate): Promise<Workflow> {
    // Verify user has access to the application
    const hasAccess = await this.checkApplicationAccess(userId, data.applicationId);
    if (!hasAccess) {
      throw new ForbiddenError('Access denied to this application');
    }

    const workflow = await workflowRepository.create({
      applicationId: data.applicationId,
      userId,
      name: data.name,
      description: data.description,
    });

    return this.formatWorkflow({ ...workflow, testFlows: [] });
  }

  /**
   * Find all workflows in an application that user has access to
   */
  async findAll(userId: string, applicationId?: string): Promise<Workflow[]> {
    let workflows;

    // If applicationId is provided, filter by application
    if (applicationId) {
      const hasAccess = await this.checkApplicationAccess(userId, applicationId);
      if (!hasAccess) {
        throw new ForbiddenError('Access denied to this application');
      }

      workflows = await workflowRepository.findByApplicationId(applicationId);
    } else {
      // Return all workflows user owns
      workflows = await workflowRepository.findByUserId(userId);
    }

    // Enrich with test flows and their latest execution
    const enrichedWorkflows = await Promise.all(
      workflows.map(async (workflow) => {
        const testFlows = await testFlowRepository.findByWorkflowId(workflow.id);
        const testFlowsWithExecutions = await Promise.all(
          testFlows.map(async (tf) => {
            const executions = await executionRepository.findByTestFlowId(tf.id, 1);
            return { ...tf, executions };
          })
        );
        return { ...workflow, testFlows: testFlowsWithExecutions };
      })
    );

    return enrichedWorkflows.map(this.formatWorkflow);
  }

  async findOne(userId: string, workflowId: string): Promise<Workflow> {
    const workflow = await workflowRepository.findById(workflowId);

    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    // Check access via application ownership
    if (workflow.applicationId) {
      const hasAccess = await this.checkApplicationAccess(userId, workflow.applicationId);
      if (!hasAccess) {
        throw new ForbiddenError('Access denied');
      }
    } else if (workflow.userId !== userId) {
      // Legacy workflows without applicationId - check userId
      throw new ForbiddenError('Access denied');
    }

    // Get test flows with executions
    const testFlows = await testFlowRepository.findByWorkflowId(workflowId);
    const testFlowsWithExecutions = await Promise.all(
      testFlows.map(async (tf) => {
        const executions = await executionRepository.findByTestFlowId(tf.id, 5);
        return { ...tf, executions };
      })
    );

    return this.formatWorkflow({ ...workflow, testFlows: testFlowsWithExecutions });
  }

  async update(userId: string, workflowId: string, data: WorkflowUpdate): Promise<Workflow> {
    const existing = await workflowRepository.findById(workflowId);

    if (!existing) {
      throw new NotFoundError('Workflow not found');
    }

    // Check access via application ownership
    if (existing.applicationId) {
      const hasAccess = await this.checkApplicationAccess(userId, existing.applicationId);
      if (!hasAccess) {
        throw new ForbiddenError('Access denied');
      }
    } else if (existing.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const workflow = await workflowRepository.update(workflowId, {
      name: data.name,
      description: data.description,
    });

    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    // Get test flows
    const testFlows = await testFlowRepository.findByWorkflowId(workflowId);

    return this.formatWorkflow({ ...workflow, testFlows });
  }

  async delete(userId: string, workflowId: string): Promise<void> {
    const existing = await workflowRepository.findById(workflowId);

    if (!existing) {
      throw new NotFoundError('Workflow not found');
    }

    // Check access via application ownership
    if (existing.applicationId) {
      const hasAccess = await this.checkApplicationAccess(userId, existing.applicationId);
      if (!hasAccess) {
        throw new ForbiddenError('Access denied');
      }
    } else if (existing.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    await workflowRepository.delete(workflowId);
  }

  private formatWorkflow(workflow: any): Workflow {
    return {
      id: workflow.id,
      applicationId: workflow.applicationId || '',
      userId: workflow.userId,
      name: workflow.name,
      description: workflow.description,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      testFlows: workflow.testFlows?.map((tf: any) => ({
        id: tf.id,
        workflowId: tf.workflowId,
        name: tf.name,
        code: tf.code,
        nodes: tf.nodes,
        edges: tf.edges,
        language: tf.language,
        createdAt: tf.createdAt,
        updatedAt: tf.updatedAt,
        executions: tf.executions?.map((ex: any) => ({
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
      })),
    };
  }
}

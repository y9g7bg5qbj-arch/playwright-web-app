import { prisma } from '../db/prisma';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import type { Workflow, WorkflowCreate, WorkflowUpdate } from '@playwright-web-app/shared';

export class WorkflowService {
  /**
   * Check if user has access to an application (owner or member)
   */
  private async checkApplicationAccess(userId: string, applicationId: string): Promise<boolean> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { members: true },
    });

    if (!application) {
      return false;
    }

    // User is owner of the application or a member
    return application.userId === userId ||
      application.members.some(m => m.userId === userId);
  }

  async create(userId: string, data: WorkflowCreate): Promise<Workflow> {
    // Verify user has access to the application
    const hasAccess = await this.checkApplicationAccess(userId, data.applicationId);
    if (!hasAccess) {
      throw new ForbiddenError('Access denied to this application');
    }

    const workflow = await prisma.workflow.create({
      data: {
        applicationId: data.applicationId,
        userId,
        name: data.name,
        description: data.description,
      },
      include: {
        testFlows: true,
      },
    });

    return this.formatWorkflow(workflow);
  }

  /**
   * Find all workflows in an application that user has access to
   */
  async findAll(userId: string, applicationId?: string): Promise<Workflow[]> {
    // If applicationId is provided, filter by application
    if (applicationId) {
      const hasAccess = await this.checkApplicationAccess(userId, applicationId);
      if (!hasAccess) {
        throw new ForbiddenError('Access denied to this application');
      }

      const workflows = await prisma.workflow.findMany({
        where: { applicationId },
        include: {
          testFlows: {
            include: {
              executions: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return workflows.map(this.formatWorkflow);
    }

    // Legacy: If no applicationId, return all workflows user owns
    // This maintains backward compatibility
    const workflows = await prisma.workflow.findMany({
      where: { userId },
      include: {
        testFlows: {
          include: {
            executions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return workflows.map(this.formatWorkflow);
  }

  async findOne(userId: string, workflowId: string): Promise<Workflow> {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        testFlows: {
          include: {
            executions: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    // Check access via application membership or ownership
    if (workflow.applicationId) {
      const hasAccess = await this.checkApplicationAccess(userId, workflow.applicationId);
      if (!hasAccess) {
        throw new ForbiddenError('Access denied');
      }
    } else if (workflow.userId !== userId) {
      // Legacy workflows without applicationId - check userId
      throw new ForbiddenError('Access denied');
    }

    return this.formatWorkflow(workflow);
  }

  async update(userId: string, workflowId: string, data: WorkflowUpdate): Promise<Workflow> {
    const existing = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!existing) {
      throw new NotFoundError('Workflow not found');
    }

    // Check access via application membership or ownership
    if (existing.applicationId) {
      const hasAccess = await this.checkApplicationAccess(userId, existing.applicationId);
      if (!hasAccess) {
        throw new ForbiddenError('Access denied');
      }
    } else if (existing.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const workflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        name: data.name,
        description: data.description,
      },
      include: {
        testFlows: true,
      },
    });

    return this.formatWorkflow(workflow);
  }

  async delete(userId: string, workflowId: string): Promise<void> {
    const existing = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!existing) {
      throw new NotFoundError('Workflow not found');
    }

    // Check access via application membership or ownership
    if (existing.applicationId) {
      const hasAccess = await this.checkApplicationAccess(userId, existing.applicationId);
      if (!hasAccess) {
        throw new ForbiddenError('Access denied');
      }
    } else if (existing.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    await prisma.workflow.delete({
      where: { id: workflowId },
    });
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

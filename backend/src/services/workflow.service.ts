import { prisma } from '../db/prisma';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import type { Workflow, WorkflowCreate, WorkflowUpdate } from '@playwright-web-app/shared';

export class WorkflowService {
  /**
   * Check if user has access to a project (owner or member)
   */
  private async checkProjectAccess(userId: string, projectId: string): Promise<boolean> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) {
      return false;
    }

    // User is owner or a member
    return project.userId === userId ||
           project.members.some(m => m.userId === userId);
  }

  async create(userId: string, data: WorkflowCreate): Promise<Workflow> {
    // Verify user has access to the project
    const hasAccess = await this.checkProjectAccess(userId, data.projectId);
    if (!hasAccess) {
      throw new ForbiddenError('Access denied to this project');
    }

    const workflow = await prisma.workflow.create({
      data: {
        projectId: data.projectId,
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
   * Find all workflows in a project that user has access to
   */
  async findAll(userId: string, projectId?: string): Promise<Workflow[]> {
    // If projectId is provided, filter by project
    if (projectId) {
      const hasAccess = await this.checkProjectAccess(userId, projectId);
      if (!hasAccess) {
        throw new ForbiddenError('Access denied to this project');
      }

      const workflows = await prisma.workflow.findMany({
        where: { projectId },
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

    // Legacy: If no projectId, return all workflows user owns
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

    // Check access via project membership or ownership
    if (workflow.projectId) {
      const hasAccess = await this.checkProjectAccess(userId, workflow.projectId);
      if (!hasAccess) {
        throw new ForbiddenError('Access denied');
      }
    } else if (workflow.userId !== userId) {
      // Legacy workflows without projectId - check userId
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

    // Check access via project membership or ownership
    if (existing.projectId) {
      const hasAccess = await this.checkProjectAccess(userId, existing.projectId);
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

    // Check access via project membership or ownership
    if (existing.projectId) {
      const hasAccess = await this.checkProjectAccess(userId, existing.projectId);
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
      projectId: workflow.projectId || '',
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

// Repository Service
// Business logic for Object Repository CRUD operations
// Uses MongoDB repositories for database operations

import { NotFoundError, ForbiddenError } from '../utils/errors';
import { isAdmin } from '../middleware/rbac';
import { workflowRepository, objectRepositoryRepository, pageObjectRepository } from '../db/repositories/mongo';
import { ObjectRepository, ObjectRepositoryUpdate, PageObject, PageObjectCreate, PageObjectUpdate, PageElementCreate, PageElementUpdate } from '@playwright-web-app/shared';

export class RepositoryService {
    private objectRepoRepo = objectRepositoryRepository;
    private pageObjectRepo = pageObjectRepository;

    // ============================================
    // OBJECT REPOSITORY OPERATIONS
    // ============================================

    /**
     * Get or create an Object Repository for a workflow
     */
    async getByWorkflowId(userId: string, workflowId: string, userRole?: string): Promise<ObjectRepository> {
        // Verify workflow belongs to user
        await this.verifyWorkflowAccess(userId, workflowId, userRole);

        return this.objectRepoRepo.getOrCreateByWorkflowId(workflowId);
    }

    /**
     * Update an Object Repository
     */
    async updateRepository(
        userId: string,
        workflowId: string,
        data: ObjectRepositoryUpdate,
        userRole?: string
    ): Promise<ObjectRepository> {
        await this.verifyWorkflowAccess(userId, workflowId, userRole);

        const repo = await this.objectRepoRepo.findByWorkflowId(workflowId);
        if (!repo) {
            throw new NotFoundError('Object Repository not found');
        }

        return this.objectRepoRepo.update(repo.id, data);
    }

    // ============================================
    // PAGE OBJECT OPERATIONS
    // ============================================

    /**
     * Get all pages in a repository
     */
    async getPages(userId: string, workflowId: string, userRole?: string): Promise<PageObject[]> {
        await this.verifyWorkflowAccess(userId, workflowId, userRole);

        const repo = await this.objectRepoRepo.findByWorkflowId(workflowId);
        if (!repo) {
            return [];
        }

        return this.pageObjectRepo.findByRepositoryId(repo.id);
    }

    /**
     * Create a new page in a repository
     */
    async createPage(
        userId: string,
        workflowId: string,
        data: Omit<PageObjectCreate, 'repositoryId'>,
        userRole?: string
    ): Promise<PageObject> {
        await this.verifyWorkflowAccess(userId, workflowId, userRole);

        // Get or create repository
        const repo = await this.objectRepoRepo.getOrCreateByWorkflowId(workflowId);

        return this.pageObjectRepo.create({
            ...data,
            repositoryId: repo.id,
        });
    }

    /**
     * Update a page
     */
    async updatePage(
        userId: string,
        workflowId: string,
        pageId: string,
        data: PageObjectUpdate,
        userRole?: string
    ): Promise<PageObject> {
        await this.verifyWorkflowAccess(userId, workflowId, userRole);
        await this.verifyPageBelongsToWorkflow(workflowId, pageId);

        return this.pageObjectRepo.update(pageId, data);
    }

    /**
     * Delete a page
     */
    async deletePage(userId: string, workflowId: string, pageId: string, userRole?: string): Promise<void> {
        await this.verifyWorkflowAccess(userId, workflowId, userRole);
        await this.verifyPageBelongsToWorkflow(workflowId, pageId);

        return this.pageObjectRepo.delete(pageId);
    }

    /**
     * Reorder pages
     */
    async reorderPages(
        userId: string,
        workflowId: string,
        pageIds: string[],
        userRole?: string
    ): Promise<void> {
        await this.verifyWorkflowAccess(userId, workflowId, userRole);

        const repo = await this.objectRepoRepo.findByWorkflowId(workflowId);
        if (!repo) {
            throw new NotFoundError('Object Repository not found');
        }

        return this.pageObjectRepo.reorder(repo.id, pageIds);
    }

    // ============================================
    // ELEMENT OPERATIONS
    // ============================================

    /**
     * Add an element to a page
     */
    async addElement(
        userId: string,
        workflowId: string,
        pageId: string,
        element: PageElementCreate,
        userRole?: string
    ): Promise<PageObject> {
        await this.verifyWorkflowAccess(userId, workflowId, userRole);
        await this.verifyPageBelongsToWorkflow(workflowId, pageId);

        return this.pageObjectRepo.addElement(pageId, element);
    }

    /**
     * Update an element
     */
    async updateElement(
        userId: string,
        workflowId: string,
        pageId: string,
        elementId: string,
        data: PageElementUpdate,
        userRole?: string
    ): Promise<PageObject> {
        await this.verifyWorkflowAccess(userId, workflowId, userRole);
        await this.verifyPageBelongsToWorkflow(workflowId, pageId);

        return this.pageObjectRepo.updateElement(pageId, elementId, data);
    }

    /**
     * Remove an element
     */
    async removeElement(
        userId: string,
        workflowId: string,
        pageId: string,
        elementId: string,
        userRole?: string
    ): Promise<PageObject> {
        await this.verifyWorkflowAccess(userId, workflowId, userRole);
        await this.verifyPageBelongsToWorkflow(workflowId, pageId);

        return this.pageObjectRepo.removeElement(pageId, elementId);
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Verify that a workflow belongs to the user
     */
    private async verifyWorkflowAccess(userId: string, workflowId: string, userRole?: string): Promise<void> {
        const workflow = await workflowRepository.findById(workflowId);

        if (!workflow) {
            throw new NotFoundError('Workflow not found');
        }

        if (!isAdmin(userRole) && workflow.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }
    }

    /**
     * Verify that a page belongs to the workflow's repository
     */
    private async verifyPageBelongsToWorkflow(workflowId: string, pageId: string): Promise<void> {
        const repo = await this.objectRepoRepo.findByWorkflowId(workflowId);
        if (!repo) {
            throw new NotFoundError('Object Repository not found');
        }

        const page = await this.pageObjectRepo.findById(pageId);
        if (!page) {
            throw new NotFoundError('Page not found');
        }

        if (page.repositoryId !== repo.id) {
            throw new ForbiddenError('Page does not belong to this workflow');
        }
    }
}

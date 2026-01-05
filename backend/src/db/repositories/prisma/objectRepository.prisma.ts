// Prisma Implementation of ObjectRepository Repo

import { prisma } from '../../prisma';
import { IObjectRepositoryRepo } from '../interfaces';
import {
    ObjectRepository,
    ObjectRepositoryCreate,
    ObjectRepositoryUpdate,
    PageElement,
} from '@playwright-web-app/shared';

export class PrismaObjectRepositoryRepo implements IObjectRepositoryRepo {
    /**
     * Find an ObjectRepository by ID
     */
    async findById(id: string): Promise<ObjectRepository | null> {
        const result = await prisma.objectRepository.findUnique({
            where: { id },
            include: { pages: { orderBy: { order: 'asc' } } },
        });

        if (!result) return null;

        return this.formatRepository(result);
    }

    /**
     * Find an ObjectRepository by workflow ID
     */
    async findByWorkflowId(workflowId: string): Promise<ObjectRepository | null> {
        const result = await prisma.objectRepository.findUnique({
            where: { workflowId },
            include: { pages: { orderBy: { order: 'asc' } } },
        });

        if (!result) return null;

        return this.formatRepository(result);
    }

    /**
     * Create a new ObjectRepository
     */
    async create(data: ObjectRepositoryCreate): Promise<ObjectRepository> {
        const result = await prisma.objectRepository.create({
            data: {
                workflowId: data.workflowId,
                name: data.name || 'Object Repository',
                description: data.description,
                globalElements: null,
            },
            include: { pages: { orderBy: { order: 'asc' } } },
        });

        return this.formatRepository(result);
    }

    /**
     * Update an ObjectRepository
     */
    async update(id: string, data: ObjectRepositoryUpdate): Promise<ObjectRepository> {
        const result = await prisma.objectRepository.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                globalElements: data.globalElements ? JSON.stringify(data.globalElements) : undefined,
            },
            include: { pages: { orderBy: { order: 'asc' } } },
        });

        return this.formatRepository(result);
    }

    /**
     * Delete an ObjectRepository
     */
    async delete(id: string): Promise<void> {
        await prisma.objectRepository.delete({
            where: { id },
        });
    }

    /**
     * Get or create an ObjectRepository for a workflow
     */
    async getOrCreateByWorkflowId(workflowId: string): Promise<ObjectRepository> {
        // Try to find existing
        const existing = await this.findByWorkflowId(workflowId);
        if (existing) return existing;

        // Create new
        return this.create({ workflowId });
    }

    /**
     * Format Prisma result to ObjectRepository type
     */
    private formatRepository(result: any): ObjectRepository {
        return {
            id: result.id,
            workflowId: result.workflowId,
            name: result.name,
            description: result.description || undefined,
            pages: result.pages.map((page: any) => ({
                id: page.id,
                repositoryId: page.repositoryId,
                name: page.name,
                description: page.description || undefined,
                urlPattern: page.urlPattern || undefined,
                baseUrl: page.baseUrl || undefined,
                elements: typeof page.elements === 'string' ? JSON.parse(page.elements) : (page.elements || []),
                order: page.order,
                createdAt: page.createdAt,
                updatedAt: page.updatedAt,
            })),
            globalElements: result.globalElements
                ? (typeof result.globalElements === 'string'
                    ? JSON.parse(result.globalElements)
                    : result.globalElements)
                : undefined,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
        };
    }
}

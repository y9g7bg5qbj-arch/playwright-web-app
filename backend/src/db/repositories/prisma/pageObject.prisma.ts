// Prisma Implementation of PageObject Repo

import { prisma } from '../../prisma';
import { IPageObjectRepo } from '../interfaces';
import {
    PageObject,
    PageObjectCreate,
    PageObjectUpdate,
    PageElement,
    PageElementCreate,
    PageElementUpdate,
} from '@playwright-web-app/shared';
import { v4 as uuidv4 } from 'uuid';

export class PrismaPageObjectRepo implements IPageObjectRepo {
    /**
     * Find a PageObject by ID
     */
    async findById(id: string): Promise<PageObject | null> {
        const result = await prisma.pageObject.findUnique({
            where: { id },
        });

        if (!result) return null;

        return this.formatPageObject(result);
    }

    /**
     * Find all PageObjects in a repository
     */
    async findByRepositoryId(repositoryId: string): Promise<PageObject[]> {
        const results = await prisma.pageObject.findMany({
            where: { repositoryId },
            orderBy: { order: 'asc' },
        });

        return results.map((result) => this.formatPageObject(result));
    }

    /**
     * Create a new PageObject
     */
    async create(data: PageObjectCreate): Promise<PageObject> {
        // Get next order number
        const maxOrder = await prisma.pageObject.aggregate({
            where: { repositoryId: data.repositoryId },
            _max: { order: true },
        });
        const nextOrder = (maxOrder._max.order ?? -1) + 1;

        const result = await prisma.pageObject.create({
            data: {
                repositoryId: data.repositoryId,
                name: data.name,
                description: data.description,
                urlPattern: data.urlPattern,
                baseUrl: data.baseUrl,
                elements: JSON.stringify(data.elements || []),
                order: data.order ?? nextOrder,
            },
        });

        return this.formatPageObject(result);
    }

    /**
     * Update a PageObject
     */
    async update(id: string, data: PageObjectUpdate): Promise<PageObject> {
        const result = await prisma.pageObject.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                urlPattern: data.urlPattern,
                baseUrl: data.baseUrl,
                elements: data.elements ? JSON.stringify(data.elements) : undefined,
                order: data.order,
            },
        });

        return this.formatPageObject(result);
    }

    /**
     * Delete a PageObject
     */
    async delete(id: string): Promise<void> {
        await prisma.pageObject.delete({
            where: { id },
        });
    }

    /**
     * Reorder pages within a repository
     */
    async reorder(repositoryId: string, pageIds: string[]): Promise<void> {
        // Update order for each page
        await prisma.$transaction(
            pageIds.map((id, index) =>
                prisma.pageObject.update({
                    where: { id },
                    data: { order: index },
                })
            )
        );
    }

    /**
     * Add an element to a PageObject
     */
    async addElement(pageId: string, element: PageElementCreate): Promise<PageObject> {
        const page = await this.findById(pageId);
        if (!page) {
            throw new Error(`PageObject not found: ${pageId}`);
        }

        const newElement: PageElement = {
            id: uuidv4(),
            name: element.name,
            description: element.description,
            locator: element.locator,
            tags: element.tags,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const updatedElements = [...page.elements, newElement];

        return this.update(pageId, { elements: updatedElements });
    }

    /**
     * Update an element within a PageObject
     */
    async updateElement(
        pageId: string,
        elementId: string,
        data: PageElementUpdate
    ): Promise<PageObject> {
        const page = await this.findById(pageId);
        if (!page) {
            throw new Error(`PageObject not found: ${pageId}`);
        }

        const elementIndex = page.elements.findIndex((e) => e.id === elementId);
        if (elementIndex === -1) {
            throw new Error(`Element not found: ${elementId}`);
        }

        const updatedElement: PageElement = {
            ...page.elements[elementIndex],
            name: data.name ?? page.elements[elementIndex].name,
            description: data.description ?? page.elements[elementIndex].description,
            locator: data.locator ?? page.elements[elementIndex].locator,
            tags: data.tags ?? page.elements[elementIndex].tags,
            updatedAt: new Date(),
        };

        const updatedElements = [...page.elements];
        updatedElements[elementIndex] = updatedElement;

        return this.update(pageId, { elements: updatedElements });
    }

    /**
     * Remove an element from a PageObject
     */
    async removeElement(pageId: string, elementId: string): Promise<PageObject> {
        const page = await this.findById(pageId);
        if (!page) {
            throw new Error(`PageObject not found: ${pageId}`);
        }

        const updatedElements = page.elements.filter((e) => e.id !== elementId);

        return this.update(pageId, { elements: updatedElements });
    }

    /**
     * Format Prisma result to PageObject type
     */
    private formatPageObject(result: any): PageObject {
        return {
            id: result.id,
            repositoryId: result.repositoryId,
            name: result.name,
            description: result.description || undefined,
            urlPattern: result.urlPattern || undefined,
            baseUrl: result.baseUrl || undefined,
            elements:
                typeof result.elements === 'string'
                    ? JSON.parse(result.elements)
                    : result.elements || [],
            order: result.order,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
        };
    }
}

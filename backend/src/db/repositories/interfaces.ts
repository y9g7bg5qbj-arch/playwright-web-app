// Database Repository Interfaces
// These interfaces define the contract for database operations,
// allowing easy switching between Prisma/SQL and MongoDB

import {
    ObjectRepository,
    ObjectRepositoryCreate,
    ObjectRepositoryUpdate,
    PageObject,
    PageObjectCreate,
    PageObjectUpdate,
    PageElement,
    PageElementCreate,
    PageElementUpdate,
} from '@playwright-web-app/shared';

// ============================================
// GENERIC REPOSITORY INTERFACE
// ============================================

export interface IRepository<T, CreateDTO, UpdateDTO> {
    findById(id: string): Promise<T | null>;
    findAll(filter?: Partial<T>): Promise<T[]>;
    create(data: CreateDTO): Promise<T>;
    update(id: string, data: UpdateDTO): Promise<T>;
    delete(id: string): Promise<void>;
}

// ============================================
// OBJECT REPOSITORY INTERFACE
// ============================================

export interface IObjectRepositoryRepo {
    findById(id: string): Promise<ObjectRepository | null>;
    findByWorkflowId(workflowId: string): Promise<ObjectRepository | null>;
    create(data: ObjectRepositoryCreate): Promise<ObjectRepository>;
    update(id: string, data: ObjectRepositoryUpdate): Promise<ObjectRepository>;
    delete(id: string): Promise<void>;

    // Upsert: create if not exists, return existing if exists
    getOrCreateByWorkflowId(workflowId: string): Promise<ObjectRepository>;
}

// ============================================
// PAGE OBJECT INTERFACE
// ============================================

export interface IPageObjectRepo {
    findById(id: string): Promise<PageObject | null>;
    findByRepositoryId(repositoryId: string): Promise<PageObject[]>;
    create(data: PageObjectCreate): Promise<PageObject>;
    update(id: string, data: PageObjectUpdate): Promise<PageObject>;
    delete(id: string): Promise<void>;

    // Reorder pages within a repository
    reorder(repositoryId: string, pageIds: string[]): Promise<void>;

    // Element operations (elements are stored as JSON within PageObject)
    addElement(pageId: string, element: PageElementCreate): Promise<PageObject>;
    updateElement(pageId: string, elementId: string, data: PageElementUpdate): Promise<PageObject>;
    removeElement(pageId: string, elementId: string): Promise<PageObject>;
}

// ============================================
// DATABASE ADAPTER TYPE
// ============================================

export type DatabaseType = 'prisma';

export interface DatabaseConfig {
    type: DatabaseType;
    url: string;
}

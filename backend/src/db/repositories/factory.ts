// Repository Factory
// Creates repository instances using Prisma implementation

import { IObjectRepositoryRepo, IPageObjectRepo } from './interfaces';
import { PrismaObjectRepositoryRepo } from './prisma/objectRepository.prisma';
import { PrismaPageObjectRepo } from './prisma/pageObject.prisma';

// Lazy-loaded repository instances (singleton pattern)
let objectRepositoryRepoInstance: IObjectRepositoryRepo | null = null;
let pageObjectRepoInstance: IPageObjectRepo | null = null;

/**
 * Create or return the ObjectRepository repository implementation
 */
export function getObjectRepositoryRepo(): IObjectRepositoryRepo {
    if (!objectRepositoryRepoInstance) {
        objectRepositoryRepoInstance = new PrismaObjectRepositoryRepo();
    }
    return objectRepositoryRepoInstance;
}

/**
 * Create or return the PageObject repository implementation
 */
export function getPageObjectRepo(): IPageObjectRepo {
    if (!pageObjectRepoInstance) {
        pageObjectRepoInstance = new PrismaPageObjectRepo();
    }
    return pageObjectRepoInstance;
}

/**
 * Reset repository instances (useful for testing)
 */
export function resetRepositories(): void {
    objectRepositoryRepoInstance = null;
    pageObjectRepoInstance = null;
}

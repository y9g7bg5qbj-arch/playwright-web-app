/**
 * Selector Cache Before Hook
 *
 * Checks PageObject cache for existing selectors before generating new ones.
 * This improves performance by reusing previously discovered selectors.
 */

import { BeforeHook, type ExecutionContext, type HookResult } from '../interfaces';
import { PageObjectRegistry } from '../../pageObjectRegistry';

// Cache of registry instances per project
const registryCache = new Map<string, PageObjectRegistry>();

/**
 * Get or create a PageObjectRegistry for a project
 */
function getRegistry(projectPath: string): PageObjectRegistry {
    let registry = registryCache.get(projectPath);
    if (!registry) {
        registry = new PageObjectRegistry(projectPath);
        registryCache.set(projectPath, registry);
    }
    return registry;
}

export class SelectorCacheBeforeHook extends BeforeHook {
    name = 'SelectorCacheBefore';
    priority = 10; // Run early to potentially skip selector generation
    description = 'Checks PageObject cache for existing selectors';

    private registryLoaded = new Set<string>();

    /**
     * Only run if caching is enabled and we have a target to look up
     */
    shouldRun(context: ExecutionContext): boolean {
        return (
            context.config.useSelectorCache &&
            !!context.step.target &&
            !context.resolvedSelector // Don't run if already resolved
        );
    }

    /**
     * Look up selector in cache
     */
    async execute(context: ExecutionContext): Promise<HookResult> {
        const { step, config, page } = context;
        const projectPath = config.projectPath;

        try {
            // Get or create registry
            const registry = getRegistry(projectPath);

            // Load from disk if not already loaded
            if (!this.registryLoaded.has(projectPath)) {
                await registry.loadFromDisk();
                this.registryLoaded.add(projectPath);
            }

            // Try to find by element description
            const pageUrl = page.url();
            const fieldRef = await this.findByDescription(registry, step.target!, pageUrl);

            if (fieldRef) {
                return {
                    continue: true,
                    contextUpdates: {
                        resolvedSelector: {
                            selector: fieldRef.selector,
                            type: this.inferSelectorType(fieldRef.selector),
                            priority: 1, // Cached selectors are high priority
                            confidence: 0.95, // High confidence since it was used before
                        },
                        existingFieldRef: fieldRef,
                        metadata: {
                            ...context.metadata,
                            cacheHit: true,
                            cachedFrom: `${fieldRef.pageName}.${fieldRef.fieldName}`,
                        },
                    },
                    message: `Cache hit: Using ${fieldRef.pageName}.${fieldRef.fieldName}`,
                };
            }

            return {
                continue: true,
                contextUpdates: {
                    metadata: {
                        ...context.metadata,
                        cacheHit: false,
                    },
                },
                message: 'No cached selector found',
            };
        } catch (error: any) {
            return {
                continue: true, // Don't block execution on cache errors
                message: `Cache lookup failed: ${error.message}`,
                hookData: { cacheError: error.message },
            };
        }
    }

    /**
     * Find a cached selector by element description
     */
    private async findByDescription(
        registry: PageObjectRegistry,
        description: string,
        _pageUrl: string
    ): Promise<{ pageName: string; fieldName: string; selector: string } | null> {
        // Strategy 1: Direct field name match
        const normalized = this.normalizeDescription(description);

        // Search all pages for matching fields
        for (const pageName of registry.getPageNames()) {
            const page = registry.getPage(pageName);
            if (!page) continue;

            for (const [fieldName, field] of page.fields) {
                // Exact match on field name
                if (this.normalizeDescription(fieldName) === normalized) {
                    return { pageName, fieldName, selector: field.selector };
                }

                // Fuzzy match on field name
                if (this.fuzzyMatch(fieldName, description)) {
                    return { pageName, fieldName, selector: field.selector };
                }
            }
        }

        // Strategy 2: Try finding by similar selector
        const elementInfo = this.descriptionToElementInfo(description);
        if (elementInfo) {
            const similar = registry.findSimilarSelector(elementInfo);
            if (similar) {
                return similar;
            }
        }

        return null;
    }

    /**
     * Normalize a description for comparison
     */
    private normalizeDescription(desc: string): string {
        return desc
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '')
            .trim();
    }

    /**
     * Check if two strings are a fuzzy match
     */
    private fuzzyMatch(a: string, b: string): boolean {
        const aNorm = this.normalizeDescription(a);
        const bNorm = this.normalizeDescription(b);

        // Contains match
        if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) {
            return true;
        }

        // Levenshtein distance for short strings
        if (aNorm.length < 20 && bNorm.length < 20) {
            const distance = this.levenshtein(aNorm, bNorm);
            const maxLen = Math.max(aNorm.length, bNorm.length);
            return distance / maxLen < 0.3; // 70% similar
        }

        return false;
    }

    /**
     * Simple Levenshtein distance
     */
    private levenshtein(a: string, b: string): number {
        const matrix: number[][] = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Convert description to ElementInfo for similarity search
     */
    private descriptionToElementInfo(description: string): any {
        const lower = description.toLowerCase();

        // Try to infer element type
        let tagName = 'div';
        if (lower.includes('button')) tagName = 'button';
        else if (lower.includes('input') || lower.includes('field')) tagName = 'input';
        else if (lower.includes('link')) tagName = 'a';
        else if (lower.includes('select') || lower.includes('dropdown')) tagName = 'select';
        else if (lower.includes('checkbox')) tagName = 'input';

        return {
            tagName,
            text: description,
            ariaLabel: description,
        };
    }

    /**
     * Infer selector type from selector string
     */
    private inferSelectorType(selector: string): 'testId' | 'role' | 'label' | 'text' | 'css' {
        if (selector.includes('data-testid') || selector.includes('data-test-id')) {
            return 'testId';
        }
        if (selector.includes('getByRole')) {
            return 'role';
        }
        if (selector.includes('getByLabel')) {
            return 'label';
        }
        if (selector.includes('getByText')) {
            return 'text';
        }
        return 'css';
    }
}

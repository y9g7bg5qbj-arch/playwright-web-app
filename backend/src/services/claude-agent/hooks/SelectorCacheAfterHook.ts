/**
 * Selector Cache After Hook
 *
 * Stores newly generated selectors in the PageObject cache for reuse.
 * Only stores selectors that were successfully used.
 */

import {
    AfterHook,
    type ExecutionContext,
    type ExecuteResult,
    type HookResult,
} from '../interfaces';
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

export class SelectorCacheAfterHook extends AfterHook {
    name = 'SelectorCacheAfter';
    priority = 10; // Run early in after hooks
    description = 'Stores successfully used selectors in PageObject cache';

    /**
     * Only run if caching is enabled and we have a new selector to store
     */
    shouldRun(context: ExecutionContext): boolean {
        return (
            context.config.storeSelectorCache &&
            !!context.resolvedSelector &&
            !context.metadata.cacheHit // Don't store if we just retrieved from cache
        );
    }

    /**
     * Store selector in cache
     */
    async execute(
        context: ExecutionContext,
        executeResult: ExecuteResult
    ): Promise<HookResult> {
        // Only store if execution was successful
        if (!executeResult.success) {
            return {
                continue: true,
                message: 'Skipping cache store (execution failed)',
            };
        }

        const { step, page, config, resolvedSelector } = context;
        if (!resolvedSelector) {
            return {
                continue: true,
                message: 'No selector to cache',
            };
        }

        try {
            const registry = getRegistry(config.projectPath);
            const pageUrl = page.url();

            // Generate a field name from the step target
            const fieldName = this.generateFieldName(step.target || 'element');

            // Determine the page name from URL
            const pageName = this.urlToPageName(pageUrl);

            // Store the selector
            await this.storeSelector(registry, {
                pageName,
                fieldName,
                selector: resolvedSelector.selector,
                selectorType: resolvedSelector.type,
                pageUrl,
            });

            return {
                continue: true,
                message: `Cached selector: ${pageName}.${fieldName}`,
                hookData: {
                    storedAs: `${pageName}.${fieldName}`,
                    selector: resolvedSelector.selector,
                },
            };
        } catch (error: any) {
            return {
                continue: true, // Don't block on cache errors
                message: `Cache store failed: ${error.message}`,
            };
        }
    }

    /**
     * Store selector in the registry
     */
    private async storeSelector(
        registry: PageObjectRegistry,
        data: {
            pageName: string;
            fieldName: string;
            selector: string;
            selectorType: string;
            pageUrl: string;
        }
    ): Promise<void> {
        const { pageName, fieldName, selector, pageUrl } = data;

        // Check for duplicate first
        const existing = registry.findBySelector(selector);
        if (existing) {
            // Selector already cached
            return;
        }

        // Get or create the page (this handles creation if needed)
        registry.getOrCreatePage(pageUrl);

        // Add the field to the page (API: pageName, fieldName, selector as strings)
        registry.addField(pageName, fieldName, selector);
    }

    /**
     * Generate a field name from a description
     */
    private generateFieldName(description: string): string {
        // Convert to camelCase
        const camel = description
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .map((word, i) =>
                i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
            )
            .join('');

        // Add suffix if it looks like it needs one
        const lower = description.toLowerCase();
        if (lower.includes('button') && !camel.endsWith('Button')) {
            return camel + 'Button';
        }
        if (lower.includes('input') || lower.includes('field')) {
            if (!camel.endsWith('Input') && !camel.endsWith('Field')) {
                return camel + 'Input';
            }
        }
        if (lower.includes('link') && !camel.endsWith('Link')) {
            return camel + 'Link';
        }

        return camel || 'element';
    }

    /**
     * Convert URL to a page name
     */
    private urlToPageName(url: string): string {
        try {
            const urlObj = new URL(url);
            const path = urlObj.pathname;

            // Get the last meaningful segment
            const segments = path.split('/').filter((s) => s && !s.match(/^\d+$/));
            const segment = segments[segments.length - 1] || 'home';

            // Convert to PascalCase
            const pascal = segment
                .replace(/[-_]/g, ' ')
                .split(' ')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join('');

            return pascal + 'Page';
        } catch {
            return 'DefaultPage';
        }
    }
}

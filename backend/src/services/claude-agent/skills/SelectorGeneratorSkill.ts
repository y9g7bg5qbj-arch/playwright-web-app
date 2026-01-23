/**
 * Selector Generator Skill
 *
 * Generates Playwright-priority selectors for target elements.
 * Wraps the existing selectorExtractor.ts infrastructure.
 *
 * Priority order:
 * 1. data-testid (most stable)
 * 2. getByRole() with name
 * 3. getByLabel()
 * 4. getByPlaceholder()
 * 5. getByText()
 * 6. CSS selector (last resort)
 */

import {
    BaseSkill,
    type ExecutionContext,
    type SkillDetection,
    type PrepareResult,
    type ExecuteResult,
    type VerifyResult,
    type ResolvedSelector,
} from '../interfaces';
import {
    SELECTOR_EXTRACTOR_SCRIPT,
    type ExtractedSelectors,
} from '../../selector/selectorExtractor';

/** Selector type priorities (lower = better) */
const SELECTOR_PRIORITY: Record<string, number> = {
    testId: 1,
    role: 2,
    label: 3,
    placeholder: 4,
    text: 5,
    css: 6,
    xpath: 7,
};

export class SelectorGeneratorSkill extends BaseSkill {
    name = 'SelectorGenerator';
    priority = 10; // Run early to resolve selectors
    description = 'Generates Playwright-priority selectors for target elements';

    /**
     * Detect: Always applies when we need to find an element
     */
    async detect(context: ExecutionContext): Promise<SkillDetection> {
        // Skip if we already have a resolved selector (e.g., from cache)
        if (context.resolvedSelector) {
            return {
                applies: false,
                confidence: 1.0,
                reason: 'Selector already resolved (possibly from cache)',
            };
        }

        // Skip for actions that don't need element targeting
        if (context.step.action === 'navigate' || context.step.action === 'wait') {
            return {
                applies: false,
                confidence: 1.0,
                reason: `Action '${context.step.action}' does not require element targeting`,
            };
        }

        // We need a target to generate a selector
        if (!context.step.target) {
            return {
                applies: false,
                confidence: 0.5,
                reason: 'No target specified in step',
            };
        }

        return {
            applies: true,
            confidence: 0.9,
            reason: `Need to find selector for target: "${context.step.target}"`,
        };
    }

    /**
     * Prepare: Inject selector extractor script into page
     */
    async prepare(context: ExecutionContext): Promise<PrepareResult> {
        try {
            // Inject the selector extractor script
            await context.page.evaluate(SELECTOR_EXTRACTOR_SCRIPT);

            return {
                success: true,
                context: {
                    metadata: {
                        ...context.metadata,
                        selectorExtractorInjected: true,
                    },
                },
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to inject selector extractor: ${error.message}`,
            };
        }
    }

    /**
     * Execute: Find the target element and extract best selector
     */
    async execute(context: ExecutionContext): Promise<ExecuteResult> {
        const { page, step } = context;
        const startTime = Date.now();

        try {
            // Strategy 1: Try to find element by natural language description
            const element = await this.findElementByDescription(page, step.target!);

            if (!element) {
                return {
                    success: false,
                    error: `Could not find element matching: "${step.target}"`,
                    durationMs: Date.now() - startTime,
                };
            }

            // Extract all possible selectors from the element
            const selectors = await this.extractSelectors(page, element);

            if (!selectors) {
                return {
                    success: false,
                    error: 'Failed to extract selectors from element',
                    durationMs: Date.now() - startTime,
                };
            }

            // Pick the best selector based on priority
            const bestSelector = this.pickBestSelector(selectors);

            // Generate Playwright code
            const playwrightCode = this.generatePlaywrightCode(
                step.action,
                bestSelector,
                step.value
            );

            // Generate Vero code
            const veroCode = this.generateVeroCode(step.action, bestSelector, step.value);

            return {
                success: true,
                playwrightCode,
                veroCode,
                usedSelector: bestSelector,
                durationMs: Date.now() - startTime,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Verify: Check that the selector still resolves to a single element
     */
    async verify(context: ExecutionContext): Promise<VerifyResult> {
        if (!context.resolvedSelector) {
            return {
                verified: false,
                confidence: 0,
                error: 'No selector to verify',
            };
        }

        try {
            const count = await context.page
                .locator(context.resolvedSelector.selector)
                .count();

            if (count === 0) {
                return {
                    verified: false,
                    confidence: 0,
                    error: 'Selector does not match any elements',
                    retrySuggestions: ['Try a more specific selector', 'Wait for element to appear'],
                };
            }

            if (count > 1) {
                return {
                    verified: false,
                    confidence: 0.3,
                    error: `Selector matches ${count} elements (should be unique)`,
                    retrySuggestions: ['Add more specific attributes', 'Use nth-child'],
                };
            }

            return {
                verified: true,
                confidence: 1.0,
                verifiedCondition: 'Selector matches exactly one element',
            };
        } catch (error: any) {
            return {
                verified: false,
                confidence: 0,
                error: `Selector verification failed: ${error.message}`,
            };
        }
    }

    /**
     * Find element by natural language description
     */
    private async findElementByDescription(
        page: any,
        description: string
    ): Promise<any | null> {
        const lower = description.toLowerCase();

        // Try common patterns first
        const strategies = [
            // By role and name
            () => this.tryRoleSelector(page, lower),
            // By label
            () => page.getByLabel(description, { exact: false }).first(),
            // By placeholder
            () => page.getByPlaceholder(description, { exact: false }).first(),
            // By text
            () => page.getByText(description, { exact: false }).first(),
            // By test ID variants
            () => page.getByTestId(description).first(),
            () => page.getByTestId(this.toKebabCase(description)).first(),
            () => page.getByTestId(this.toCamelCase(description)).first(),
        ];

        for (const strategy of strategies) {
            try {
                const element = await strategy();
                if (element && (await element.count()) > 0) {
                    return element;
                }
            } catch {
                // Strategy failed, try next
            }
        }

        return null;
    }

    /**
     * Try to find element by ARIA role
     */
    private async tryRoleSelector(page: any, description: string): Promise<any | null> {
        const rolePatterns: Record<string, string> = {
            button: 'button',
            link: 'link',
            input: 'textbox',
            field: 'textbox',
            checkbox: 'checkbox',
            radio: 'radio',
            dropdown: 'combobox',
            select: 'combobox',
            heading: 'heading',
            menu: 'menu',
            menuitem: 'menuitem',
            tab: 'tab',
            dialog: 'dialog',
            alert: 'alert',
        };

        // Extract potential role from description
        for (const [keyword, role] of Object.entries(rolePatterns)) {
            if (description.includes(keyword)) {
                // Extract name by removing the role keyword
                const name = description.replace(new RegExp(keyword, 'gi'), '').trim();
                if (name) {
                    return page.getByRole(role, { name, exact: false }).first();
                }
                return page.getByRole(role).first();
            }
        }

        return null;
    }

    /**
     * Extract selectors from element using injected script
     */
    private async extractSelectors(
        page: any,
        element: any
    ): Promise<ExtractedSelectors | null> {
        try {
            // Get the element's bounding box
            const box = await element.boundingBox();
            if (!box) return null;

            // Use the injected extractor
            const selectors = await page.evaluate(
                ([x, y]: [number, number]) => {
                    return (window as any).__extractSelectorsFromPoint?.(x, y);
                },
                [box.x + box.width / 2, box.y + box.height / 2]
            );

            return selectors;
        } catch {
            return null;
        }
    }

    /**
     * Pick the best selector based on priority order
     */
    private pickBestSelector(selectors: ExtractedSelectors): ResolvedSelector {
        // Priority order: testId > role > label > placeholder > text > css
        const candidates: Array<{ type: string; selector: string; priority: number }> = [];

        if (selectors.testId && selectors.isUnique.testId) {
            candidates.push({
                type: 'testId',
                selector: `[data-testid="${selectors.testId}"]`,
                priority: 1,
            });
        }

        if (selectors.roleWithName && selectors.isUnique.role) {
            candidates.push({
                type: 'role',
                selector: selectors.roleWithName,
                priority: 2,
            });
        }

        if (selectors.label) {
            candidates.push({
                type: 'label',
                selector: `getByLabel("${selectors.label}")`,
                priority: 3,
            });
        }

        if (selectors.placeholder && selectors.isUnique.placeholder) {
            candidates.push({
                type: 'placeholder',
                selector: `[placeholder="${selectors.placeholder}"]`,
                priority: 4,
            });
        }

        if (selectors.text) {
            candidates.push({
                type: 'text',
                selector: `getByText("${selectors.text}")`,
                priority: 5,
            });
        }

        if (selectors.css) {
            candidates.push({
                type: 'css',
                selector: selectors.css,
                priority: 6,
            });
        }

        // Sort by priority and pick best
        candidates.sort((a, b) => a.priority - b.priority);

        const best = candidates[0] || {
            type: 'css',
            selector: selectors.css || selectors.tagName,
            priority: 6,
        };

        return {
            selector: best.selector,
            type: best.type as ResolvedSelector['type'],
            priority: best.priority,
            confidence: 1 - best.priority * 0.1, // Higher priority = higher confidence
        };
    }

    /**
     * Generate Playwright code for the action
     */
    private generatePlaywrightCode(
        action: string,
        selector: ResolvedSelector,
        value?: string
    ): string {
        const locator = this.selectorToLocator(selector);

        switch (action) {
            case 'click':
                return `await ${locator}.click();`;
            case 'fill':
                return `await ${locator}.fill('${value || ''}');`;
            case 'select':
                return `await ${locator}.selectOption('${value || ''}');`;
            case 'check':
                return `await ${locator}.check();`;
            case 'uncheck':
                return `await ${locator}.uncheck();`;
            case 'hover':
                return `await ${locator}.hover();`;
            default:
                return `await ${locator}.click(); // Unknown action: ${action}`;
        }
    }

    /**
     * Generate Vero code for the action
     */
    private generateVeroCode(
        action: string,
        selector: ResolvedSelector,
        value?: string
    ): string {
        const field = this.selectorToVeroField(selector);

        switch (action) {
            case 'click':
                return `click ${field}`;
            case 'fill':
                return `fill ${field} with "${value || ''}"`;
            case 'select':
                return `select "${value || ''}" from ${field}`;
            case 'check':
                return `check ${field}`;
            case 'uncheck':
                return `uncheck ${field}`;
            case 'hover':
                return `hover ${field}`;
            default:
                return `click ${field} # Unknown action: ${action}`;
        }
    }

    /**
     * Convert selector to Playwright locator string
     */
    private selectorToLocator(selector: ResolvedSelector): string {
        // Handle special getBy* selectors
        if (selector.selector.startsWith('getBy')) {
            return `page.${selector.selector}`;
        }
        return `page.locator('${selector.selector}')`;
    }

    /**
     * Convert selector to Vero field reference
     */
    private selectorToVeroField(selector: ResolvedSelector): string {
        // For now, use the selector directly
        // In the future, this could reference page objects
        switch (selector.type) {
            case 'testId':
                return `@testid(${selector.selector.replace(/\[data-testid="(.+)"\]/, '$1')})`;
            case 'role':
                return `@role(${selector.selector})`;
            case 'label':
                return `@label(${selector.selector.replace(/getByLabel\("(.+)"\)/, '$1')})`;
            case 'text':
                return `@text(${selector.selector.replace(/getByText\("(.+)"\)/, '$1')})`;
            default:
                return `@css(${selector.selector})`;
        }
    }

    /**
     * Convert string to kebab-case
     */
    private toKebabCase(str: string): string {
        return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
            .toLowerCase();
    }

    /**
     * Convert string to camelCase
     */
    private toCamelCase(str: string): string {
        return str
            .replace(/[\s-_]+(.)/g, (_, c) => c.toUpperCase())
            .replace(/^(.)/, (c) => c.toLowerCase());
    }
}

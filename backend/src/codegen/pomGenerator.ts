/**
 * Page Object Model Generator
 * Generates POM classes from flow analysis
 */

import type { GeneratorContext, LocatorInfo, PageAction } from '@playwright-web-app/shared';
import { buildLocatorCode, generateLocatorName } from './locatorBuilder';

/**
 * Generate Page Object Model classes
 */
export class POMGenerator {
    /**
     * Generate all page object classes
     */
    generate(context: GeneratorContext): Record<string, string> {
        const pageObjects: Record<string, string> = {};

        // Group locators by page
        const locatorsByPage = this.groupLocatorsByPage(context.usedLocators);

        for (const [pageName, locators] of locatorsByPage) {
            const actions = context.pageActions.get(pageName) || [];
            pageObjects[this.toClassName(pageName)] = this.generatePageClass(pageName, locators, actions);
        }

        // If no locators were collected, generate a default page
        if (pageObjects && Object.keys(pageObjects).length === 0) {
            pageObjects['BasePage'] = this.generateBasePage();
        }

        return pageObjects;
    }

    /**
     * Group locators by their page name
     */
    private groupLocatorsByPage(usedLocators: Map<string, LocatorInfo>): Map<string, LocatorInfo[]> {
        const grouped = new Map<string, LocatorInfo[]>();

        for (const locator of usedLocators.values()) {
            const pageName = locator.pageName || 'default';
            const locators = grouped.get(pageName) || [];
            locators.push(locator);
            grouped.set(pageName, locators);
        }

        return grouped;
    }

    /**
     * Generate a single page class
     */
    private generatePageClass(
        pageName: string,
        locators: LocatorInfo[],
        actions: PageAction[]
    ): string {
        const className = this.toClassName(pageName);

        // Deduplicate locators by name
        const uniqueLocators = this.deduplicateLocators(locators);

        const lines: string[] = [];

        // Imports
        lines.push(`import { type Page, type Locator, expect } from '@playwright/test';`);
        lines.push('');

        // Class declaration
        lines.push(`export class ${className} {`);

        // Page property
        lines.push(`  readonly page: Page;`);

        // Locator properties
        for (const locator of uniqueLocators) {
            lines.push(`  readonly ${locator.name}: Locator;`);
        }

        lines.push('');

        // Constructor
        lines.push(`  constructor(page: Page) {`);
        lines.push(`    this.page = page;`);

        for (const locator of uniqueLocators) {
            const locatorCode = this.buildLocatorForProperty(locator);
            lines.push(`    this.${locator.name} = ${locatorCode};`);
        }

        lines.push(`  }`);

        // Generate standard navigation method
        lines.push('');
        lines.push(`  async goto(path: string = '/') {`);
        lines.push(`    await this.page.goto(path);`);
        lines.push(`  }`);

        // Generate action methods
        for (const action of actions) {
            lines.push('');
            lines.push(this.generateActionMethod(action));
        }

        lines.push(`}`);
        lines.push('');

        return lines.join('\n');
    }

    /**
     * Generate a base page class when no locators are collected
     */
    private generateBasePage(): string {
        return `import { type Page, type Locator, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(url: string) {
    await this.page.goto(url);
  }

  async waitForLoadState(state: 'load' | 'domcontentloaded' | 'networkidle' = 'load') {
    await this.page.waitForLoadState(state);
  }

  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  async getUrl(): string {
    return this.page.url();
  }
}
`;
    }

    /**
     * Deduplicate locators by name
     */
    private deduplicateLocators(locators: LocatorInfo[]): LocatorInfo[] {
        const seen = new Set<string>();
        const unique: LocatorInfo[] = [];

        for (const locator of locators) {
            if (!seen.has(locator.name)) {
                seen.add(locator.name);
                unique.push(locator);
            }
        }

        return unique;
    }

    /**
     * Build locator code for a property assignment
     */
    private buildLocatorForProperty(locator: LocatorInfo): string {
        return buildLocatorCode(locator.config, 'page');
    }

    /**
     * Generate an action method
     */
    private generateActionMethod(action: PageAction): string {
        const lines: string[] = [];

        // Method signature
        const params = action.params.map(p => `${p.name}: ${p.type}`).join(', ');
        lines.push(`  async ${action.name}(${params}) {`);

        // Method body
        for (const line of action.body) {
            lines.push(`    ${line}`);
        }

        lines.push(`  }`);

        return lines.join('\n');
    }

    /**
     * Convert page name to class name
     */
    private toClassName(pageName: string): string {
        if (pageName === 'default') {
            return 'MainPage';
        }

        return pageName
            .split(/[\s-_]+/)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join('') + 'Page';
    }
}

/**
 * Fixtures Generator
 * Generates Playwright test fixtures for dependency injection
 */

import type { GeneratorContext, LocatorInfo } from '@playwright-web-app/shared';

/**
 * Generate Playwright fixtures
 */
export class FixturesGenerator {
    /**
     * Generate fixtures without POM (custom fixtures only)
     */
    generate(_context: GeneratorContext): string {
        return `import { test as base, Page } from '@playwright/test';

// Define custom fixture types
type MyFixtures = {
  authenticatedPage: Page;
};

// Extend base test with custom fixtures
export const test = base.extend<MyFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Setup: Navigate and perform authentication
    // Customize this based on your authentication flow
    
    // Example: Cookie-based auth
    // await page.context().addCookies([...]);
    
    // Example: localStorage-based auth
    // await page.goto('/');
    // await page.evaluate(() => {
    //   localStorage.setItem('token', 'your-auth-token');
    // });
    
    // Use the authenticated page in tests
    await use(page);
    
    // Teardown: Clear auth state if needed
    // await page.context().clearCookies();
  },
});

export { expect } from '@playwright/test';
`;
    }

    /**
     * Generate fixtures that inject Page Objects (Playwright recommended pattern)
     */
    generateWithPOM(context: GeneratorContext): string {
        // Group locators by page to determine which page objects to create
        const locatorsByPage = this.groupLocatorsByPage(context.usedLocators);
        const pageNames = Array.from(locatorsByPage.keys());

        // If no pages detected, create a default fixture file
        if (pageNames.length === 0) {
            return this.generateDefaultFixtures();
        }

        const lines: string[] = [];

        // Imports
        lines.push(`import { test as base } from '@playwright/test';`);

        // Import page objects
        for (const pageName of pageNames) {
            const className = this.toClassName(pageName);
            lines.push(`import { ${className} } from './pages/${className}';`);
        }

        lines.push('');

        // Define fixture types
        lines.push(`// Define fixture types`);
        lines.push(`type MyFixtures = {`);

        for (const pageName of pageNames) {
            const className = this.toClassName(pageName);
            const varName = this.toVariableName(pageName);
            lines.push(`  ${varName}: ${className};`);
        }

        lines.push(`};`);
        lines.push('');

        // Extend base test
        lines.push(`// Extend base test with page object fixtures`);
        lines.push(`export const test = base.extend<MyFixtures>({`);

        for (let i = 0; i < pageNames.length; i++) {
            const pageName = pageNames[i];
            const className = this.toClassName(pageName);
            const varName = this.toVariableName(pageName);

            lines.push(`  ${varName}: async ({ page }, use) => {`);
            lines.push(`    // Create page object instance`);
            lines.push(`    const ${varName} = new ${className}(page);`);
            lines.push(`    `);
            lines.push(`    // Optional: Navigate to page or perform setup`);
            lines.push(`    // await ${varName}.goto();`);
            lines.push(`    `);
            lines.push(`    // Use the page object in tests`);
            lines.push(`    await use(${varName});`);
            lines.push(`    `);
            lines.push(`    // Optional: Cleanup after test`);
            lines.push(`  },`);

            if (i < pageNames.length - 1) {
                lines.push('');
            }
        }

        lines.push(`});`);
        lines.push('');
        lines.push(`export { expect } from '@playwright/test';`);
        lines.push('');

        return lines.join('\n');
    }

    /**
     * Generate default fixtures when no page objects are detected
     */
    private generateDefaultFixtures(): string {
        return `import { test as base } from '@playwright/test';
import { BasePage } from './pages/BasePage';

// Define fixture types
type MyFixtures = {
  basePage: BasePage;
};

// Extend base test with page object fixtures
export const test = base.extend<MyFixtures>({
  basePage: async ({ page }, use) => {
    const basePage = new BasePage(page);
    await use(basePage);
  },
});

export { expect } from '@playwright/test';
`;
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

    /**
     * Convert page name to variable name
     */
    private toVariableName(pageName: string): string {
        const className = this.toClassName(pageName);
        return className.charAt(0).toLowerCase() + className.slice(1);
    }
}

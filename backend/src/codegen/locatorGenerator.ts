// Locator Code Generator
// Generates TypeScript/Playwright code from locator configurations
// Supports Page Object Model class generation

import {
    LocatorStrategy,
    LocatorConfig,
    PageObject,
    PageElement,
    ObjectRepository,
    CodeGenerationOptions,
    GeneratedPageObjectClass,
    GeneratedFixtures,
} from '@playwright-web-app/shared';

const DEFAULT_OPTIONS: CodeGenerationOptions = {
    language: 'typescript',
    style: 'playwright-test',
    includeComments: true,
    variablePrefix: '',
};

/**
 * Generate TypeScript code for a LocatorStrategy
 */
export function generateLocatorCode(
    strategy: LocatorStrategy,
    options: Partial<CodeGenerationOptions> = {}
): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    switch (strategy.type) {
        case 'role':
            return generateRoleLocator(strategy);
        case 'text':
            return generateTextLocator(strategy);
        case 'testId':
            return `page.getByTestId('${strategy.testId}')`;
        case 'label':
            return `page.getByLabel('${strategy.label}'${strategy.exact ? ', { exact: true }' : ''})`;
        case 'placeholder':
            return `page.getByPlaceholder('${strategy.placeholder}'${strategy.exact ? ', { exact: true }' : ''})`;
        case 'altText':
            return `page.getByAltText('${strategy.altText}'${strategy.exact ? ', { exact: true }' : ''})`;
        case 'title':
            return `page.getByTitle('${strategy.title}'${strategy.exact ? ', { exact: true }' : ''})`;
        case 'css':
            return `page.locator('${escapeString(strategy.selector)}')`;
        case 'xpath':
            return `page.locator('xpath=${escapeString(strategy.xpath)}')`;
        case 'id':
            return `page.locator('#${strategy.id}')`;
        case 'chain':
            return generateChainLocator(strategy, opts);
        case 'filter':
            return generateFilterLocator(strategy, opts);
        case 'nth':
            return `${generateLocatorCode(strategy.base, opts)}.nth(${strategy.index})`;
        case 'first':
            return `${generateLocatorCode(strategy.base, opts)}.first()`;
        case 'last':
            return `${generateLocatorCode(strategy.base, opts)}.last()`;
        case 'ref':
            return `this.${toCamelCase(strategy.element)}`;
        default:
            throw new Error(`Unknown locator strategy: ${(strategy as any).type}`);
    }
}

/**
 * Generate TypeScript code for a LocatorConfig (with fallback support)
 */
export function generateLocatorConfigCode(
    config: LocatorConfig,
    options: Partial<CodeGenerationOptions> = {}
): string {
    // For now, just generate the primary locator
    // Fallback handling happens at runtime
    return generateLocatorCode(config.strategy, options);
}

/**
 * Generate a Page Object class from a PageObject configuration
 */
export function generatePageObjectClass(
    pageObject: PageObject,
    options: Partial<CodeGenerationOptions> = {}
): GeneratedPageObjectClass {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const className = toClassName(pageObject.name);
    const fileName = toFileName(pageObject.name);

    const lines: string[] = [];

    // Imports
    lines.push(`import { Page, Locator } from '@playwright/test';`);
    lines.push('');

    // Class declaration
    if (opts.includeComments && pageObject.description) {
        lines.push(`/**`);
        lines.push(` * ${pageObject.description}`);
        if (pageObject.urlPattern) {
            lines.push(` * URL Pattern: ${pageObject.urlPattern}`);
        }
        lines.push(` */`);
    }
    lines.push(`export class ${className} {`);

    // Constructor
    lines.push(`  constructor(private readonly page: Page) {}`);
    lines.push('');

    // URL navigation (if baseUrl is set)
    if (pageObject.baseUrl) {
        lines.push(`  /** Navigate to this page */`);
        lines.push(`  async goto() {`);
        lines.push(`    await this.page.goto('${pageObject.baseUrl}');`);
        lines.push(`  }`);
        lines.push('');
    }

    // Element getters
    for (const element of pageObject.elements) {
        lines.push(...generateElementGetter(element, opts));
    }

    // Close class
    lines.push('}');

    return {
        className,
        fileName: `${fileName}.ts`,
        code: lines.join('\n'),
        imports: ['@playwright/test'],
    };
}

/**
 * Generate getter for a single element
 */
function generateElementGetter(
    element: PageElement,
    options: CodeGenerationOptions
): string[] {
    const lines: string[] = [];
    const propertyName = toCamelCase(element.name);

    // Comment
    if (options.includeComments && element.description) {
        lines.push(`  /** ${element.description} */`);
    }

    // Getter
    const locatorCode = generateLocatorConfigCode(element.locator, options);
    // Replace 'page.' with 'this.page.'
    const adjustedCode = locatorCode.replace(/^page\./, 'this.page.');

    lines.push(`  get ${propertyName}(): Locator {`);
    lines.push(`    return ${adjustedCode};`);
    lines.push(`  }`);
    lines.push('');

    return lines;
}

/**
 * Generate Playwright fixtures file from Object Repository
 */
export function generateFixtures(
    repository: ObjectRepository,
    options: Partial<CodeGenerationOptions> = {}
): GeneratedFixtures {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const lines: string[] = [];

    // Collect all page object classes
    const pageClasses = repository.pages.map(page => ({
        className: toClassName(page.name),
        fileName: toFileName(page.name),
        propertyName: toCamelCase(page.name.replace(/\s+Page$/i, '')),
    }));

    // Imports
    lines.push(`import { test as base } from '@playwright/test';`);
    for (const pc of pageClasses) {
        lines.push(`import { ${pc.className} } from './${pc.fileName}';`);
    }
    lines.push('');

    // Type definition
    lines.push(`type PageFixtures = {`);
    for (const pc of pageClasses) {
        lines.push(`  ${pc.propertyName}: ${pc.className};`);
    }
    lines.push(`};`);
    lines.push('');

    // Extended test
    lines.push(`export const test = base.extend<PageFixtures>({`);
    for (const pc of pageClasses) {
        lines.push(`  ${pc.propertyName}: async ({ page }, use) => {`);
        lines.push(`    await use(new ${pc.className}(page));`);
        lines.push(`  },`);
    }
    lines.push(`});`);
    lines.push('');
    lines.push(`export { expect } from '@playwright/test';`);

    return {
        fileName: 'fixtures.ts',
        code: lines.join('\n'),
        pageObjects: pageClasses.map(pc => pc.className),
    };
}

/**
 * Generate all files for an Object Repository
 */
export function generateAllFromRepository(
    repository: ObjectRepository,
    options: Partial<CodeGenerationOptions> = {}
): {
    pageObjects: GeneratedPageObjectClass[];
    fixtures: GeneratedFixtures;
} {
    const pageObjects = repository.pages.map(page =>
        generatePageObjectClass(page, options)
    );

    const fixtures = generateFixtures(repository, options);

    return { pageObjects, fixtures };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateRoleLocator(strategy: any): string {
    const options: string[] = [];

    if (strategy.name !== undefined) {
        options.push(`name: '${escapeString(strategy.name)}'`);
    }
    if (strategy.exact !== undefined) {
        options.push(`exact: ${strategy.exact}`);
    }
    if (strategy.checked !== undefined) {
        options.push(`checked: ${strategy.checked}`);
    }
    if (strategy.disabled !== undefined) {
        options.push(`disabled: ${strategy.disabled}`);
    }
    if (strategy.expanded !== undefined) {
        options.push(`expanded: ${strategy.expanded}`);
    }
    if (strategy.level !== undefined) {
        options.push(`level: ${strategy.level}`);
    }
    if (strategy.pressed !== undefined) {
        options.push(`pressed: ${strategy.pressed}`);
    }
    if (strategy.selected !== undefined) {
        options.push(`selected: ${strategy.selected}`);
    }

    const optionsStr = options.length > 0 ? `, { ${options.join(', ')} }` : '';
    return `page.getByRole('${strategy.role}'${optionsStr})`;
}

function generateTextLocator(strategy: any): string {
    const options = strategy.exact ? ', { exact: true }' : '';
    return `page.getByText('${escapeString(strategy.text)}'${options})`;
}

function generateChainLocator(strategy: any, options: CodeGenerationOptions): string {
    const locators = strategy.locators.map((s: LocatorStrategy) =>
        generateLocatorCode(s, options)
    );

    // Chain them with .locator()
    let result = locators[0];
    for (let i = 1; i < locators.length; i++) {
        // Extract the selector from the next locator
        const next = locators[i].replace(/^page\./, '');
        result = `${result}.${next}`;
    }

    return result;
}

function generateFilterLocator(strategy: any, options: CodeGenerationOptions): string {
    const base = generateLocatorCode(strategy.base, options);
    const filterParts: string[] = [];

    if (strategy.hasText) {
        filterParts.push(`hasText: '${escapeString(strategy.hasText)}'`);
    }
    if (strategy.hasNotText) {
        filterParts.push(`hasNotText: '${escapeString(strategy.hasNotText)}'`);
    }
    if (strategy.has) {
        const hasLocator = generateLocatorCode(strategy.has, options);
        filterParts.push(`has: ${hasLocator}`);
    }
    if (strategy.hasNot) {
        const hasNotLocator = generateLocatorCode(strategy.hasNot, options);
        filterParts.push(`hasNot: ${hasNotLocator}`);
    }

    return `${base}.filter({ ${filterParts.join(', ')} })`;
}

function escapeString(str: string): string {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n');
}

function toCamelCase(str: string): string {
    return str
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
        .replace(/^./, chr => chr.toLowerCase())
        .replace(/[^a-zA-Z0-9]/g, '');
}

function toClassName(str: string): string {
    return str
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
        .replace(/^./, chr => chr.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, '');
}

function toFileName(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

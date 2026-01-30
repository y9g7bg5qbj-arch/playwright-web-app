/**
 * Vero to Playwright Transpiler Service
 * Converts Vero DSL to executable Playwright TypeScript
 */

interface PageDefinition {
    name: string;
    fields: Map<string, string>;
    actions: Map<string, { params: string[]; statements: string[] }>;
    forPage?: string;  // For PageActions - the associated Page name
}

interface ScenarioDefinition {
    name: string;
    tags: string[];
    statements: string[];
}

interface FeatureDefinition {
    name: string;
    usedPages: string[];
    beforeEach: string[];
    afterEach: string[];
    scenarios: ScenarioDefinition[];
}

interface TranspileOptions {
    debugMode?: boolean;
}

/**
 * Validation error for semantic issues
 */
export interface VeroValidationError {
    code: string;
    message: string;
    line?: number;
    severity: 'error' | 'warning';
    suggestion?: string;
}

/**
 * Validates that all pages referenced in USE statements exist
 */
function validateUsedPages(features: FeatureDefinition[], pages: PageDefinition[]): VeroValidationError[] {
    const errors: VeroValidationError[] = [];
    const pageNames = new Set(pages.map(p => p.name));

    for (const feature of features) {
        for (const usedPage of feature.usedPages) {
            if (!pageNames.has(usedPage)) {
                // Find similar page names for suggestion
                const similar = findSimilarPage(usedPage, pageNames);
                const suggestion = similar ? `Did you mean '${similar}'?` : undefined;

                errors.push({
                    code: 'VERO2001',
                    message: `Page '${usedPage}' is not defined. USE a PAGE or PAGEACTIONS that exists in this project.`,
                    severity: 'error',
                    suggestion
                });
            }
        }
    }

    return errors;
}

/**
 * Find similar page name using Levenshtein distance
 */
function findSimilarPage(name: string, pageNames: Set<string>): string | undefined {
    let bestMatch: string | undefined;
    let bestDistance = Infinity;
    const maxDistance = Math.max(2, Math.floor(name.length / 3));

    for (const pageName of pageNames) {
        const distance = levenshteinDistance(name.toLowerCase(), pageName.toLowerCase());
        if (distance < bestDistance && distance <= maxDistance) {
            bestDistance = distance;
            bestMatch = pageName;
        }
    }

    return bestMatch;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
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
 * Transpiles Vero DSL code into Playwright TypeScript test code
 */
export function transpileVero(veroCode: string, options: TranspileOptions = {}): string {
    const { debugMode = false } = options;
    const pages: PageDefinition[] = [];
    const features: FeatureDefinition[] = [];

    // Parse the Vero code
    parseVeroCode(veroCode, pages, features);

    // Validate semantic correctness - check USE statements reference existing pages
    const validationErrors = validateUsedPages(features, pages);
    if (validationErrors.length > 0) {
        const errorMessages = validationErrors.map(e => {
            let msg = `[${e.code}] ${e.message}`;
            if (e.suggestion) msg += ` ${e.suggestion}`;
            return msg;
        }).join('\n');
        throw new Error(`Vero Validation Error:\n${errorMessages}`);
    }

    // Generate Playwright TypeScript
    let output = `// Auto-generated from Vero DSL
import { test, expect, Page } from '@playwright/test';

`;

    // Add debug helper if debugMode is enabled
    if (debugMode) {
        output += generateDebugHelper();
    }

    // Generate page objects
    for (const page of pages) {
        output += generatePageObject(page, pages);
    }

    // Generate test suites
    for (const feature of features) {
        output += generateTestSuite(feature, pages, debugMode);
    }

    return output;
}

/**
 * Generates the debug helper code that gets injected into the test file
 */
function generateDebugHelper(): string {
    return `// Debug helper for step-by-step execution
const __debug__ = {
    breakpoints: new Set<number>(),
    currentLine: 0,
    paused: false,

    async beforeStep(line: number, action: string, target?: string): Promise<void> {
        this.currentLine = line;
        if (process.send) {
            process.send({ type: 'step:before', line, action, target });
        }

        if (this.breakpoints.has(line) || this.paused) {
            if (process.send) {
                process.send({ type: 'execution:paused', line });
            }
            await this.waitForResume();
        }
    },

    async afterStep(line: number, action: string, success: boolean = true, duration?: number): Promise<void> {
        if (process.send) {
            process.send({ type: 'step:after', line, action, success, duration });
        }
    },

    async waitForResume(): Promise<void> {
        return new Promise<void>((resolve) => {
            const handler = (msg: any) => {
                if (msg.type === 'resume') {
                    this.paused = false;
                    process.off('message', handler);
                    resolve();
                } else if (msg.type === 'step') {
                    this.paused = true;
                    process.off('message', handler);
                    resolve();
                } else if (msg.type === 'set-breakpoints') {
                    this.breakpoints = new Set(msg.breakpoints);
                } else if (msg.type === 'stop') {
                    process.exit(0);
                }
            };
            process.on('message', handler);
        });
    },

    setBreakpoints(lines: number[]): void {
        this.breakpoints = new Set(lines);
    }
};

// Listen for debug commands from parent process
if (process.send) {
    process.on('message', (msg: any) => {
        if (msg.type === 'set-breakpoints') {
            __debug__.setBreakpoints(msg.breakpoints);
        }
    });
}

`;
}

function parseVeroCode(code: string, pages: PageDefinition[], features: FeatureDefinition[]) {
    const lines = code.split('\n');
    let currentPage: PageDefinition | null = null;
    let currentFeature: FeatureDefinition | null = null;
    let currentScenario: ScenarioDefinition | null = null;
    let currentAction: { name: string; params: string[]; statements: string[] } | null = null;
    let inBeforeEach = false;
    let inAfterEach = false;
    let braceDepth = 0;
    let actionBraceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip comments and empty lines
        if (line.startsWith('#') || line === '') continue;

        // Track brace depth
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;

        // Page declaration
        const pageMatch = line.match(/^page\s+(\w+)\s*{/i);
        if (pageMatch) {
            currentPage = {
                name: pageMatch[1],
                fields: new Map(),
                actions: new Map()
            };
            braceDepth = 1;
            continue;
        }

        // PAGEACTIONS declaration: PAGEACTIONS Name FOR PageName {
        const pageActionsMatch = line.match(/^pageactions\s+(\w+)(?:\s+for\s+(\w+))?\s*{/i);
        if (pageActionsMatch) {
            // PageActions are treated the same as Pages internally
            // The FOR clause links to a Page for field resolution
            currentPage = {
                name: pageActionsMatch[1],
                fields: new Map(),
                actions: new Map(),
                forPage: pageActionsMatch[2]  // Store the associated page name
            };
            braceDepth = 1;
            continue;
        }

        // Field declaration: field name = "selector" or field name = role "rolename"
        const fieldMatch = line.match(/^field\s+(\w+)\s*=\s*(.+)/i);
        if (fieldMatch && currentPage) {
            let selector = fieldMatch[2].trim();
            // Handle role "rolename" syntax -> getByRole('rolename')
            const roleMatch = selector.match(/^role\s+"([^"]+)"/i);
            if (roleMatch) {
                selector = `role:${roleMatch[1]}`;
            } else {
                // Strip outer quotes
                selector = selector.replace(/^"(.*)"$/, '$1');
            }
            currentPage.fields.set(fieldMatch[1], selector);
            continue;
        }

        // Action declaration (inside page or pageactions)
        // Supports multiple syntaxes:
        // - actionName WITH params {
        // - actionName RETURNS FLAG {
        // - actionName RETURNS TEXT {
        // - actionName {
        const actionReturnsMatch = line.match(/^(\w+)\s+returns\s+(flag|text)\s*{/i);
        if (actionReturnsMatch && currentPage && !currentAction) {
            currentAction = { name: actionReturnsMatch[1], params: [], statements: [] };
            actionBraceDepth = braceDepth + openBraces;
            braceDepth += openBraces - closeBraces;
            continue;
        }

        const actionMatch = line.match(/^(\w+)(?:\s+with\s+([^{]+))?\s*{/i);
        if (actionMatch && currentPage && !currentAction && !line.match(/^(page|pageactions|feature|scenario|before|after|if|repeat)/i)) {
            const params = actionMatch[2] ? actionMatch[2].split(',').map(p => p.trim()) : [];
            currentAction = { name: actionMatch[1], params, statements: [] };
            actionBraceDepth = braceDepth + openBraces;
            braceDepth += openBraces - closeBraces;
            continue;
        }

        // Feature declaration - with braces: feature Name {
        const featureMatchBrace = line.match(/^feature\s+(\w+)\s*{/i);
        if (featureMatchBrace) {
            if (currentPage) {
                pages.push(currentPage);
                currentPage = null;
            }
            currentFeature = {
                name: featureMatchBrace[1],
                usedPages: [],
                beforeEach: [],
                afterEach: [],
                scenarios: []
            };
            braceDepth = 1;
            continue;
        }

        // Feature declaration - without braces: feature Name (multi-word allowed)
        const featureMatchNoBrace = line.match(/^feature\s+(.+)$/i);
        if (featureMatchNoBrace && !line.includes('{')) {
            if (currentPage) {
                pages.push(currentPage);
                currentPage = null;
            }
            // Convert multi-word name to camelCase for the feature name
            const rawName = featureMatchNoBrace[1].trim();
            const featureName = rawName.replace(/\s+/g, '');
            currentFeature = {
                name: featureName,
                usedPages: [],
                beforeEach: [],
                afterEach: [],
                scenarios: []
            };
            continue;
        }

        // "end feature" block terminator
        if (line.match(/^end\s+feature$/i)) {
            if (currentFeature) {
                features.push(currentFeature);
                currentFeature = null;
            }
            continue;
        }

        // "end scenario" block terminator
        if (line.match(/^end\s+scenario$/i)) {
            if (currentScenario && currentFeature) {
                currentFeature.scenarios.push(currentScenario);
                currentScenario = null;
            }
            continue;
        }

        // Use statement
        const useMatch = line.match(/^use\s+(\w+)/i);
        if (useMatch && currentFeature) {
            currentFeature.usedPages.push(useMatch[1]);
            continue;
        }

        // Skip metadata lines like Browser:, Viewport:, etc.
        if (line.match(/^(Browser|Viewport|Timeout|RetryCount):/i)) {
            continue;
        }

        // Before each
        const beforeMatch = line.match(/^before\s+each\s*{/i);
        if (beforeMatch && currentFeature) {
            inBeforeEach = true;
            braceDepth += openBraces - closeBraces;
            continue;
        }

        // After each
        const afterMatch = line.match(/^after\s+each\s*{/i);
        if (afterMatch && currentFeature) {
            inAfterEach = true;
            braceDepth += openBraces - closeBraces;
            continue;
        }

        // Scenario declaration - with braces: scenario "Name" {
        const scenarioMatchBrace = line.match(/^scenario\s+"([^"]+)"([^{]*){/i);
        if (scenarioMatchBrace && currentFeature) {
            const tags = (scenarioMatchBrace[2].match(/@(\w+)/g) || []).map(t => t.slice(1));
            currentScenario = { name: scenarioMatchBrace[1], tags, statements: [] };
            braceDepth += openBraces - closeBraces;
            continue;
        }

        // Scenario declaration - unquoted name with optional tags: scenario Name @tag1 @tag2 {
        const scenarioMatchUnquoted = line.match(/^scenario\s+(\w+)([^{]*){/i);
        if (scenarioMatchUnquoted && currentFeature) {
            const tags = (scenarioMatchUnquoted[2].match(/@(\w+)/g) || []).map(t => t.slice(1));
            currentScenario = { name: scenarioMatchUnquoted[1], tags, statements: [] };
            braceDepth += openBraces - closeBraces;
            continue;
        }

        // Scenario declaration - without braces: scenario "Name" as Alias or just scenario "Name"
        const scenarioMatchNoBrace = line.match(/^scenario\s+"([^"]+)"(?:\s+as\s+(\w+))?$/i);
        if (scenarioMatchNoBrace && currentFeature && !line.includes('{')) {
            const tags: string[] = [];
            currentScenario = { name: scenarioMatchNoBrace[1], tags, statements: [] };
            continue;
        }

        // Closing brace
        if (line === '}') {
            braceDepth--;

            if (currentAction && braceDepth < actionBraceDepth) {
                currentPage?.actions.set(currentAction.name, {
                    params: currentAction.params,
                    statements: currentAction.statements
                });
                currentAction = null;
            } else if (currentScenario && braceDepth === 1) {
                currentFeature?.scenarios.push(currentScenario);
                currentScenario = null;
            } else if (inBeforeEach && braceDepth === 1) {
                inBeforeEach = false;
            } else if (inAfterEach && braceDepth === 1) {
                inAfterEach = false;
            } else if (braceDepth === 0) {
                if (currentPage) {
                    pages.push(currentPage);
                    currentPage = null;
                }
                if (currentFeature) {
                    features.push(currentFeature);
                    currentFeature = null;
                }
            }
            continue;
        }

        // Parse statements
        if (currentAction) {
            currentAction.statements.push(line);
        } else if (inBeforeEach && currentFeature) {
            currentFeature.beforeEach.push(line);
        } else if (inAfterEach && currentFeature) {
            currentFeature.afterEach.push(line);
        } else if (currentScenario) {
            currentScenario.statements.push(line);
        }

        braceDepth += openBraces - closeBraces;
    }

    // Handle any remaining definitions
    if (currentPage) pages.push(currentPage);
    if (currentFeature) features.push(currentFeature);
}

function generatePageObject(page: PageDefinition, allPages: PageDefinition[]): string {
    let output = `// Page Object: ${page.name}\nconst ${page.name.toLowerCase()} = {\n`;

    // Generate field locators
    for (const [name, selector] of page.fields) {
        // Handle role:rolename syntax -> getByRole('rolename')
        if (selector.startsWith('role:')) {
            const roleName = selector.slice(5);
            output += `    ${name}: (page: Page) => page.getByRole('${roleName}'),\n`;
        } else {
            // Escape single quotes in selector to avoid JS syntax errors
            const escapedSelector = selector.replace(/'/g, "\\'");
            output += `    ${name}: (page: Page) => page.locator('${escapedSelector}'),\n`;
        }
    }

    // Generate actions
    for (const [name, action] of page.actions) {
        const params = action.params.length > 0
            ? `, ${action.params.map(p => `${p}: string`).join(', ')}`
            : '';
        output += `\n    ${name}: async (page: Page${params}) => {\n`;

        // If this is a PageActions with a forPage reference, find the associated page
        // and create a merged page definition for proper field resolution
        let contextPage = page;
        if (page.forPage) {
            const associatedPage = allPages.find(p =>
                p.name.toLowerCase() === page.forPage!.toLowerCase());
            if (associatedPage) {
                // Create a merged page with fields from the associated page
                contextPage = {
                    ...page,
                    fields: new Map([...associatedPage.fields, ...page.fields])
                };
            }
        }

        for (const stmt of action.statements) {
            output += `        ${transpileStatement(stmt, contextPage)};\n`;
        }
        output += `    },\n`;
    }

    output += `};\n\n`;
    return output;
}

function generateTestSuite(feature: FeatureDefinition, _pages: PageDefinition[], debugMode: boolean = false): string {
    let output = `test.describe('${feature.name}', () => {\n`;

    // Generate beforeEach
    if (feature.beforeEach.length > 0) {
        output += `    test.beforeEach(async ({ page }) => {\n`;
        for (const stmt of feature.beforeEach) {
            output += `        ${transpileStatement(stmt)};\n`;
        }
        output += `    });\n\n`;
    }

    // Generate afterEach
    if (feature.afterEach.length > 0) {
        output += `    test.afterEach(async ({ page }) => {\n`;
        for (const stmt of feature.afterEach) {
            output += `        ${transpileStatement(stmt)};\n`;
        }
        output += `    });\n\n`;
    }

    // Generate tests
    let lineCounter = 1;
    for (const scenario of feature.scenarios) {
        const tagComment = scenario.tags.length > 0 ? ` // @${scenario.tags.join(' @')}` : '';
        output += `    test('${scenario.name}', async ({ page }, testInfo) => {${tagComment}\n`;
        for (const stmt of scenario.statements) {
            const transpiled = transpileStatement(stmt);
            // Don't add semicolon to control flow statements
            const needsSemicolon = !transpiled.endsWith('{') && !transpiled.endsWith('}') && transpiled !== '} else {';

            if (debugMode) {
                const action = getActionFromStatement(stmt);
                const target = getTargetFromStatement(stmt);
                output += `        await __debug__.beforeStep(${lineCounter}, '${action}', ${target ? `'${escapeString(target)}'` : 'undefined'});\n`;
                output += `        const _startTime${lineCounter} = Date.now();\n`;
                output += `        try {\n`;
                output += `            ${transpiled}${needsSemicolon ? ';' : ''}\n`;
                output += `            await __debug__.afterStep(${lineCounter}, '${action}', true, Date.now() - _startTime${lineCounter});\n`;
                output += `        } catch (e) {\n`;
                output += `            await __debug__.afterStep(${lineCounter}, '${action}', false, Date.now() - _startTime${lineCounter});\n`;
                output += `            throw e;\n`;
                output += `        }\n`;
            } else {
                output += `        ${transpiled}${needsSemicolon ? ';' : ''}\n`;
            }
            lineCounter++;
        }
        output += `    });\n\n`;
    }

    output += `});\n`;
    return output;
}

/** Prefix-to-action mapping for statement classification */
const STATEMENT_ACTION_PREFIXES: [string, string][] = [
    ['open', 'navigate'],
    ['navigate', 'navigate'],
    ['page contains', 'verify'],
    ['take screenshot', 'screenshot'],
    ['click', 'click'],
    ['fill', 'fill'],
    ['wait', 'wait'],
    ['verify', 'verify'],
    ['select', 'select'],
    ['check', 'check'],
    ['uncheck', 'uncheck'],
    ['hover', 'hover'],
    ['press', 'press'],
    ['scroll', 'scroll'],
    ['clear', 'clear'],
    ['upload', 'upload'],
    ['screenshot', 'screenshot'],
];

/**
 * Extract the action type from a Vero statement
 */
function getActionFromStatement(stmt: string): string {
    const trimmed = stmt.trim().toLowerCase();
    for (const [prefix, action] of STATEMENT_ACTION_PREFIXES) {
        if (trimmed.startsWith(prefix)) return action;
    }
    return 'action';
}

/**
 * Extract the target (selector/url) from a Vero statement
 */
function getTargetFromStatement(stmt: string): string | undefined {
    const trimmed = stmt.trim();

    // open "url"
    const openMatch = trimmed.match(/^open\s+"([^"]+)"/i);
    if (openMatch) return openMatch[1];

    // navigate to "url"
    const navigateMatch = trimmed.match(/^navigate\s+to\s+"([^"]+)"/i);
    if (navigateMatch) return navigateMatch[1];

    // page contains "text"
    const pageContainsMatch = trimmed.match(/^page\s+contains\s+"([^"]+)"/i);
    if (pageContainsMatch) return pageContainsMatch[1];

    // take screenshot "name"
    const takeScreenshotMatch = trimmed.match(/^take\s+screenshot\s+"([^"]+)"/i);
    if (takeScreenshotMatch) return takeScreenshotMatch[1];

    // click/fill/verify etc with selector
    const selectorMatch = trimmed.match(/^(?:click|fill|verify|select|check|uncheck|hover|wait\s+for|scroll\s+to|clear)\s+("(?:[^"\\]|\\.)*"|\S+)/i);
    if (selectorMatch) {
        // Remove quotes if present
        return selectorMatch[1].replace(/^"(.*)"$/, '$1');
    }

    return undefined;
}

/**
 * Escape string for JavaScript
 */
function escapeString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function transpileStatement(stmt: string, contextPage?: PageDefinition): string {
    const trimmed = stmt.trim();

    // open "url" or navigate to "url"
    const openMatch = trimmed.match(/^open\s+"([^"]+)"/i);
    if (openMatch) {
        return `await test.step('Navigate to ${openMatch[1]}', async () => { await page.goto('${openMatch[1]}'); })`;
    }

    // navigate to "url"
    const navigateMatch = trimmed.match(/^navigate\s+to\s+"([^"]+)"/i);
    if (navigateMatch) {
        return `await test.step('Navigate to ${navigateMatch[1]}', async () => { await page.goto('${navigateMatch[1]}'); })`;
    }

    // page contains "text" - assertion that page contains text
    const pageContainsMatch = trimmed.match(/^page\s+contains\s+"([^"]+)"/i);
    if (pageContainsMatch) {
        return `await expect(page.getByText('${pageContainsMatch[1]}')).toBeVisible()`;
    }

    // take screenshot "name"
    const takeScreenshotMatch = trimmed.match(/^take\s+screenshot\s+"([^"]+)"/i);
    if (takeScreenshotMatch) {
        const name = takeScreenshotMatch[1];
        return `await test.step('Screenshot: ${name}', async () => { const screenshot = await page.screenshot(); await testInfo.attach('${name}', { body: screenshot, contentType: 'image/png' }); })`;
    }

    // click selector
    const clickMatch = trimmed.match(/^click\s+(.+)/i);
    if (clickMatch) {
        const selector = resolveSelector(clickMatch[1], contextPage);
        const target = clickMatch[1].replace(/"/g, '');
        return `await test.step('Click ${target}', async () => { await ${selector}.click(); })`;
    }

    // fill selector with "value" or with variable
    const fillMatch = trimmed.match(/^fill\s+(\S+)\s+with\s+(.+)/i);
    if (fillMatch) {
        const selector = resolveSelector(fillMatch[1], contextPage);
        const target = fillMatch[1].replace(/"/g, '');
        const value = fillMatch[2].trim();
        if (value.startsWith('"')) {
            return `await test.step('Fill ${target}', async () => { await ${selector}.fill(${value.replace(/"/g, "'")}); })`;
        } else {
            return `await test.step('Fill ${target}', async () => { await ${selector}.fill(${value}); })`;
        }
    }

    // wait N seconds/milliseconds
    const waitTimeMatch = trimmed.match(/^wait\s+(\d+)\s+(seconds?|milliseconds?)/i);
    if (waitTimeMatch) {
        const ms = waitTimeMatch[2].toLowerCase().startsWith('second')
            ? parseInt(waitTimeMatch[1]) * 1000
            : parseInt(waitTimeMatch[1]);
        return `await test.step('Wait ${waitTimeMatch[1]} ${waitTimeMatch[2]}', async () => { await page.waitForTimeout(${ms}); })`;
    }

    // wait for selector
    const waitForMatch = trimmed.match(/^wait\s+for\s+(.+)/i);
    if (waitForMatch) {
        const selector = resolveSelector(waitForMatch[1], contextPage);
        const target = waitForMatch[1].replace(/"/g, '');
        return `await test.step('Wait for ${target}', async () => { await ${selector}.waitFor(); })`;
    }

    // verify selector is visible/hidden
    // Match either "quoted string" or non-whitespace identifier
    // Pattern: VERIFY target IS [NOT] condition
    const verifyMatch = trimmed.match(/^verify\s+("(?:[^"\\]|\\.)*"|\S+)\s+is\s+(not\s+)?(\w+)/i);
    if (verifyMatch) {
        const target = verifyMatch[1];
        const isNot = !!verifyMatch[2];
        const condition = verifyMatch[3].toLowerCase();

        // Check if this is a variable verification (VERIFY varName IS TRUE/FALSE)
        if (condition === 'true' || condition === 'false') {
            const expectedValue = condition === 'true';
            const actual = isNot ? !expectedValue : expectedValue;
            return `expect(${target}).toBe(${actual})`;
        }

        const selector = resolveSelector(target, contextPage);
        let assertion = '';
        switch (condition) {
            case 'visible':
                assertion = isNot ? 'toBeHidden()' : 'toBeVisible()';
                break;
            case 'hidden':
                assertion = isNot ? 'toBeVisible()' : 'toBeHidden()';
                break;
            case 'enabled':
                assertion = isNot ? 'toBeDisabled()' : 'toBeEnabled()';
                break;
            case 'disabled':
                assertion = isNot ? 'toBeEnabled()' : 'toBeDisabled()';
                break;
            case 'empty':
                assertion = isNot ? 'not.toBeEmpty()' : 'toBeEmpty()';
                break;
            default:
                assertion = 'toBeVisible()';
        }
        return `await expect(${selector}).${assertion}`;
    }

    // VERIFY varName CONTAINS "text"
    const verifyContainsMatch = trimmed.match(/^verify\s+(\w+)\s+contains\s+"([^"]+)"/i);
    if (verifyContainsMatch) {
        const varName = verifyContainsMatch[1];
        const expectedText = verifyContainsMatch[2];
        return `expect(${varName}.toLowerCase()).toContain('${expectedText.toLowerCase()}')`;
    }

    // RETURN VISIBLE OF field - returns boolean for visibility check
    const returnVisibleMatch = trimmed.match(/^return\s+visible\s+of\s+(\w+)/i);
    if (returnVisibleMatch) {
        const selector = resolveSelector(returnVisibleMatch[1], contextPage);
        return `return await ${selector}.isVisible()`;
    }

    // RETURN TEXT OF field - returns text content
    const returnTextMatch = trimmed.match(/^return\s+text\s+of\s+(\w+)/i);
    if (returnTextMatch) {
        const selector = resolveSelector(returnTextMatch[1], contextPage);
        return `return await ${selector}.textContent() || ''`;
    }


    // ========================
    // PERFORM / DO PageActions
    // ========================

    // FLAG varName = PERFORM PageActions.action
    const flagAssignMatch = trimmed.match(/^flag\s+(\w+)\s*=\s*perform\s+(\w+)\.(\w+)(?:\s+with\s+(.+))?/i);
    if (flagAssignMatch) {
        const varName = flagAssignMatch[1];
        const pageName = flagAssignMatch[2].toLowerCase();
        const actionName = flagAssignMatch[3];
        const args = flagAssignMatch[4] ? `, ${flagAssignMatch[4]}` : '';
        return `const ${varName} = await ${pageName}.${actionName}(page${args})`;
    }

    // TEXT varName = PERFORM PageActions.action
    const textAssignMatch = trimmed.match(/^text\s+(\w+)\s*=\s*perform\s+(\w+)\.(\w+)(?:\s+with\s+(.+))?/i);
    if (textAssignMatch) {
        const varName = textAssignMatch[1];
        const pageName = textAssignMatch[2].toLowerCase();
        const actionName = textAssignMatch[3];
        const args = textAssignMatch[4] ? `, ${textAssignMatch[4]}` : '';
        return `const ${varName} = await ${pageName}.${actionName}(page${args})`;
    }

    // PERFORM PageActions.action WITH args (or DO for backwards compatibility)
    const performMatch = trimmed.match(/^(?:perform|do)\s+(\w+)\.(\w+)(?:\s+with\s+(.+))?/i);
    if (performMatch) {
        const pageName = performMatch[1].toLowerCase();
        const actionName = performMatch[2];
        const args = performMatch[3] ? `, ${performMatch[3]}` : '';
        return `await ${pageName}.${actionName}(page${args})`;
    }

    // log statements: log "msg", log.info "msg", log.warn "msg", log.error "msg", log.debug "msg"
    const logStatementMatch = trimmed.match(/^log(?:\.(info|warn|error|debug))?\s+"([^"]+)"/i);
    if (logStatementMatch) {
        const hasExplicitLevel = !!logStatementMatch[1];
        return transpileLogStatement(logStatementMatch[1] || 'info', logStatementMatch[2], hasExplicitLevel);
    }

    // hover selector
    const hoverMatch = trimmed.match(/^hover\s+(.+)/i);
    if (hoverMatch) {
        const selector = resolveSelector(hoverMatch[1], contextPage);
        return `await ${selector}.hover()`;
    }

    // NOTE: press "key" is now handled in KEYBOARD ACTIONS section below

    // scroll to selector
    const scrollMatch = trimmed.match(/^scroll\s+to\s+(.+)/i);
    if (scrollMatch) {
        const selector = resolveSelector(scrollMatch[1], contextPage);
        return `await ${selector}.scrollIntoViewIfNeeded()`;
    }

    // refresh
    if (trimmed.toLowerCase() === 'refresh') {
        return `await page.reload()`;
    }

    // ========================
    // TAB / WINDOW MANAGEMENT
    // ========================

    // switch to tab N (1-indexed)
    const switchTabMatch = trimmed.match(/^switch\s+to\s+tab\s+(\d+)/i);
    if (switchTabMatch) {
        const tabIndex = parseInt(switchTabMatch[1]) - 1; // Convert to 0-indexed
        return `await page.context().pages()[${tabIndex}].bringToFront()`;
    }

    // switch to new tab (wait for popup)
    if (trimmed.match(/^switch\s+to\s+new\s+tab/i)) {
        return `page = await page.context().waitForEvent('page')`;
    }

    // new tab with url
    const newTabMatch = trimmed.match(/^new\s+tab\s+(?:with\s+)?\"([^\"]+)\"/i);
    if (newTabMatch) {
        return `page = await page.context().newPage(); await page.goto('${newTabMatch[1]}')`;
    }

    // new tab (blank)
    if (trimmed.match(/^new\s+tab$/i)) {
        return `page = await page.context().newPage()`;
    }

    // close tab
    if (trimmed.match(/^close\s+tab$/i)) {
        return `await page.close()`;
    }

    // close other tabs
    if (trimmed.match(/^close\s+other\s+tabs$/i)) {
        return `for (const p of page.context().pages()) { if (p !== page) await p.close(); }`;
    }

    // ========================
    // IFRAME SUPPORT
    // ========================

    // switch to frame "selector" or switch to frame by name/id
    const switchFrameMatch = trimmed.match(/^switch\s+to\s+frame\s+\"([^\"]+)\"/i);
    if (switchFrameMatch) {
        const frameSelector = switchFrameMatch[1];
        return `const frame = page.frameLocator('${frameSelector}')`;
    }

    // switch to frame by name
    const switchFrameNameMatch = trimmed.match(/^switch\s+to\s+frame\s+named?\s+(\w+)/i);
    if (switchFrameNameMatch) {
        return `const frame = page.frame({ name: '${switchFrameNameMatch[1]}' })`;
    }

    // switch to main frame / switch to main
    if (trimmed.match(/^switch\s+to\s+main(\s+frame)?$/i)) {
        return `// Switched back to main frame (use 'page' instead of 'frame')`;
    }

    // ========================
    // KEYBOARD ACTIONS
    // ========================

    // press Enter/Tab/Escape/etc (without quotes for common keys)
    const pressKeyMatch = trimmed.match(/^press\s+(Enter|Tab|Escape|Backspace|Delete|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Home|End|PageUp|PageDown|F\d+)$/i);
    if (pressKeyMatch) {
        return `await page.keyboard.press('${pressKeyMatch[1]}')`;
    }

    // press "key" (with quotes for any key)
    const pressMatch = trimmed.match(/^press\s+\"([^\"]+)\"/i);
    if (pressMatch) {
        return `await page.keyboard.press('${pressMatch[1]}')`;
    }

    // type "text" (rapid typing without clearing)
    const typeMatch = trimmed.match(/^type\s+\"([^\"]+)\"/i);
    if (typeMatch) {
        return `await page.keyboard.type('${typeMatch[1]}')`;
    }

    // key combination: key "Ctrl+A" or key "Shift+Enter"
    const keyComboMatch = trimmed.match(/^key\s+\"([^\"]+)\"/i);
    if (keyComboMatch) {
        return `await page.keyboard.press('${keyComboMatch[1]}')`;
    }

    // hold key down
    const keyDownMatch = trimmed.match(/^hold\s+\"([^\"]+)\"/i);
    if (keyDownMatch) {
        return `await page.keyboard.down('${keyDownMatch[1]}')`;
    }

    // release key
    const keyUpMatch = trimmed.match(/^release\s+\"([^\"]+)\"/i);
    if (keyUpMatch) {
        return `await page.keyboard.up('${keyUpMatch[1]}')`;
    }

    // ========================
    // FORM & INPUT ACTIONS
    // ========================

    // select option from dropdown: select "option" from selector
    const selectMatch = trimmed.match(/^select\s+\"([^\"]+)\"\s+from\s+(.+)/i);
    if (selectMatch) {
        const option = selectMatch[1];
        const selector = resolveSelector(selectMatch[2], contextPage);
        return `await ${selector}.selectOption('${option}')`;
    }

    // select by value: select value "val" from selector
    const selectValueMatch = trimmed.match(/^select\s+value\s+\"([^\"]+)\"\s+from\s+(.+)/i);
    if (selectValueMatch) {
        const value = selectValueMatch[1];
        const selector = resolveSelector(selectValueMatch[2], contextPage);
        return `await ${selector}.selectOption({ value: '${value}' })`;
    }

    // check checkbox
    const checkMatch = trimmed.match(/^check\s+(.+)/i);
    if (checkMatch) {
        const selector = resolveSelector(checkMatch[1], contextPage);
        return `await ${selector}.check()`;
    }

    // uncheck checkbox
    const uncheckMatch = trimmed.match(/^uncheck\s+(.+)/i);
    if (uncheckMatch) {
        const selector = resolveSelector(uncheckMatch[1], contextPage);
        return `await ${selector}.uncheck()`;
    }

    // focus element
    const focusMatch = trimmed.match(/^focus\s+(.+)/i);
    if (focusMatch) {
        const selector = resolveSelector(focusMatch[1], contextPage);
        return `await ${selector}.focus()`;
    }

    // blur element (unfocus)
    const blurMatch = trimmed.match(/^blur\s+(.+)/i);
    if (blurMatch) {
        const selector = resolveSelector(blurMatch[1], contextPage);
        return `await ${selector}.blur()`;
    }

    // clear input
    const clearMatch = trimmed.match(/^clear\s+(.+)/i);
    if (clearMatch) {
        const selector = resolveSelector(clearMatch[1], contextPage);
        return `await ${selector}.clear()`;
    }

    // ========================
    // MOUSE ACTIONS
    // ========================

    // double click
    const dblClickMatch = trimmed.match(/^double\s+click\s+(.+)/i);
    if (dblClickMatch) {
        const selector = resolveSelector(dblClickMatch[1], contextPage);
        return `await ${selector}.dblclick()`;
    }

    // right click / context menu
    const rightClickMatch = trimmed.match(/^right\s+click\s+(.+)/i);
    if (rightClickMatch) {
        const selector = resolveSelector(rightClickMatch[1], contextPage);
        return `await ${selector}.click({ button: 'right' })`;
    }

    // drag from to: drag selector to selector
    const dragMatch = trimmed.match(/^drag\s+(.+?)\s+to\s+(.+)/i);
    if (dragMatch) {
        const source = resolveSelector(dragMatch[1], contextPage);
        const target = resolveSelector(dragMatch[2], contextPage);
        return `await ${source}.dragTo(${target})`;
    }

    // ========================
    // NAVIGATION & BROWSER
    // ========================

    // go back
    if (trimmed.match(/^go\s+back$/i) || trimmed.toLowerCase() === 'back') {
        return `await page.goBack()`;
    }

    // go forward
    if (trimmed.match(/^go\s+forward$/i) || trimmed.toLowerCase() === 'forward') {
        return `await page.goForward()`;
    }

    // screenshot "name" with description "desc" - screenshot with description (check first - more specific)
    const screenshotDescMatch = trimmed.match(/^screenshot\s+\"([^\"]+)\"\s+with\s+description\s+\"([^\"]+)\"/i);
    if (screenshotDescMatch) {
        const name = screenshotDescMatch[1];
        const description = screenshotDescMatch[2];
        return `await test.step('Screenshot: ${name}', async () => { const screenshot = await page.screenshot(); await testInfo.attach('${name}', { body: screenshot, contentType: 'image/png' }); console.log('[SCREENSHOT] ${name}: ${description}'); })`;
    }

    // screenshot element "selector" as "name" - screenshot of specific element
    const screenshotElementMatch = trimmed.match(/^screenshot\s+element\s+(.+?)\s+as\s+\"([^\"]+)\"/i);
    if (screenshotElementMatch) {
        const selector = resolveSelector(screenshotElementMatch[1], contextPage);
        const name = screenshotElementMatch[2];
        return `await test.step('Screenshot Element: ${name}', async () => { const screenshot = await ${selector}.screenshot(); await testInfo.attach('${name}', { body: screenshot, contentType: 'image/png' }); })`;
    }

    // screenshot fullpage "name" - full page screenshot
    const screenshotFullMatch = trimmed.match(/^screenshot\s+fullpage\s+\"([^\"]+)\"/i);
    if (screenshotFullMatch) {
        const name = screenshotFullMatch[1];
        return `await test.step('Screenshot: ${name}', async () => { const screenshot = await page.screenshot({ fullPage: true }); await testInfo.attach('${name}', { body: screenshot, contentType: 'image/png' }); })`;
    }

    // screenshot "name" - basic screenshot (check last - less specific)
    const screenshotMatch = trimmed.match(/^screenshot(?:\s+\"([^\"]+)\")?/i);
    if (screenshotMatch) {
        const filename = screenshotMatch[1] || 'screenshot.png';
        const name = filename.replace('.png', '').replace('.jpg', '');
        return `await test.step('Screenshot: ${name}', async () => { const screenshot = await page.screenshot(); await testInfo.attach('${name}', { body: screenshot, contentType: 'image/png' }); })`;
    }

    // pause (for debugging)
    if (trimmed.toLowerCase() === 'pause') {
        return `await page.pause()`;
    }

    // ========================
    // ASSERTIONS
    // ========================

    // assert text contains: assert selector contains "text"
    const assertContainsMatch = trimmed.match(/^assert\s+(.+?)\s+contains\s+\"([^\"]+)\"/i);
    if (assertContainsMatch) {
        const selector = resolveSelector(assertContainsMatch[1], contextPage);
        const text = assertContainsMatch[2];
        return `await expect(${selector}).toContainText('${text}')`;
    }

    // assert value: assert selector has value "text"
    const assertValueMatch = trimmed.match(/^assert\s+(.+?)\s+has\s+value\s+\"([^\"]+)\"/i);
    if (assertValueMatch) {
        const selector = resolveSelector(assertValueMatch[1], contextPage);
        const value = assertValueMatch[2];
        return `await expect(${selector}).toHaveValue('${value}')`;
    }

    // assert count: assert selector count is N
    const assertCountMatch = trimmed.match(/^assert\s+(.+?)\s+count\s+is\s+(\d+)/i);
    if (assertCountMatch) {
        const selector = resolveSelector(assertCountMatch[1], contextPage);
        const count = assertCountMatch[2];
        return `await expect(${selector}).toHaveCount(${count})`;
    }

    // assert url contains
    const assertUrlMatch = trimmed.match(/^assert\s+url\s+contains\s+\"([^\"]+)\"/i);
    if (assertUrlMatch) {
        return `await expect(page).toHaveURL(/${assertUrlMatch[1]}/)`;
    }

    // assert title contains
    const assertTitleMatch = trimmed.match(/^assert\s+title\s+contains\s+\"([^\"]+)\"/i);
    if (assertTitleMatch) {
        return `await expect(page).toHaveTitle(/${assertTitleMatch[1]}/)`;
    }

    // ========================
    // WAIT CONDITIONS
    // ========================

    // wait for url to contain
    const waitUrlMatch = trimmed.match(/^wait\s+for\s+url\s+\"([^\"]+)\"/i);
    if (waitUrlMatch) {
        return `await page.waitForURL('*${waitUrlMatch[1]}*')`;
    }

    // wait for network idle
    if (trimmed.match(/^wait\s+for\s+network(\s+idle)?$/i)) {
        return `await page.waitForLoadState('networkidle')`;
    }

    // wait for load
    if (trimmed.match(/^wait\s+for\s+load$/i)) {
        return `await page.waitForLoadState('load')`;
    }
    const varDeclMatch = trimmed.match(/^(text|number|flag|list)\s+(\w+)\s*=\s*(.+)/i);
    if (varDeclMatch) {
        const varType = varDeclMatch[1].toLowerCase();
        const varName = varDeclMatch[2];
        let value = varDeclMatch[3].trim();

        // Handle different types
        if (varType === 'text') {
            value = value.replace(/"/g, "'");
        } else if (varType === 'number') {
            value = value.replace(/"/g, '');
        } else if (varType === 'flag') {
            value = value.toLowerCase() === 'true' || value === '1' ? 'true' : 'false';
        } else if (varType === 'list') {
            // Handle list: list items = "a", "b", "c" -> ['a', 'b', 'c']
            const items = value.match(/"[^"]*"/g) || [];
            value = `[${items.map(item => item.replace(/"/g, "'")).join(', ')}]`;
        }
        return `const ${varName} = ${value}`;
    }

    // If/else statement: if condition { ... } else { ... }
    // This handles single-line if blocks or the opening of multi-line blocks
    const ifMatch = trimmed.match(/^if\s+(.+?)\s*{(.*)$/i);
    if (ifMatch) {
        const condition = transpileCondition(ifMatch[1], contextPage);
        const body = ifMatch[2]?.trim();
        if (body && body !== '') {
            // Single line if with body
            return `if (${condition}) { ${body}`;
        }
        return `if (${condition}) {`;
    }

    // Else block
    if (trimmed.toLowerCase() === '} else {' || trimmed.match(/^}\s*else\s*{/i)) {
        return '} else {';
    }

    // Repeat loop: repeat N times { ... }
    const repeatMatch = trimmed.match(/^repeat\s+(\d+)\s+times\s*{/i);
    if (repeatMatch) {
        const count = repeatMatch[1];
        return `for (let i = 0; i < ${count}; i++) {`;
    }

    // Closing brace
    if (trimmed === '}') {
        return '}';
    }

    // Default: comment out unknown statements
    return `// TODO: ${trimmed}`;
}

/** Console method and prefix mapping for log levels */
const LOG_LEVEL_CONFIG: Record<string, { consoleMethod: string; prefix: string }> = {
    info:  { consoleMethod: 'log',   prefix: '[INFO] ' },
    warn:  { consoleMethod: 'warn',  prefix: '[WARN] ' },
    error: { consoleMethod: 'error', prefix: '[ERROR] ' },
    debug: { consoleMethod: 'debug', prefix: '[DEBUG] ' },
};

/**
 * Generate a Playwright test.step for a Vero log statement.
 * When hasExplicitLevel is false (bare "log"), no prefix is added.
 */
function transpileLogStatement(level: string, message: string, hasExplicitLevel: boolean = true): string {
    const config = LOG_LEVEL_CONFIG[level.toLowerCase()] || LOG_LEVEL_CONFIG.info;
    const prefix = hasExplicitLevel ? config.prefix : '';
    return `await test.step('Log: ${message}', async () => { console.${config.consoleMethod}('${prefix}${message}'); await testInfo.attach('log', { body: JSON.stringify({ level: '${level}', message: '${message}', timestamp: new Date().toISOString() }), contentType: 'application/json' }); })`;
}

/**
 * Transpile a Vero condition expression to JavaScript/Playwright
 */
function transpileCondition(condition: string, contextPage?: PageDefinition): string {
    const cond = condition.trim();

    // Element state conditions: selector is visible/hidden/enabled/disabled/checked/empty
    // Match patterns like: PageName.field is visible, "selector" is visible, field is visible
    const stateMatch = cond.match(/^([\w.]+|"[^"]+")\s+(is\s+not\s+|is\s+)?(visible|hidden|enabled|disabled|checked|empty)$/i);
    if (stateMatch) {
        const selectorRef = stateMatch[1];
        const isNot = stateMatch[2]?.toLowerCase().includes('not');
        const state = stateMatch[3].toLowerCase();

        // Handle PageName.fieldName pattern
        let selector: string;
        if (selectorRef.includes('.')) {
            const [pageName, fieldName] = selectorRef.split('.');
            selector = `${pageName.toLowerCase()}.${fieldName}(page)`;
        } else if (selectorRef.startsWith('"')) {
            selector = `page.locator(${selectorRef.replace(/"/g, "'")})`;
        } else {
            // Bare identifier - use directly with page locator context
            selector = resolveSelector(selectorRef, contextPage);
        }

        switch (state) {
            case 'visible':
                return isNot ? `!(await ${selector}.isVisible())` : `await ${selector}.isVisible()`;
            case 'hidden':
                return isNot ? `await ${selector}.isVisible()` : `!(await ${selector}.isVisible())`;
            case 'enabled':
                return isNot ? `await ${selector}.isDisabled()` : `await ${selector}.isEnabled()`;
            case 'disabled':
                return isNot ? `await ${selector}.isEnabled()` : `await ${selector}.isDisabled()`;
            case 'checked':
                return isNot ? `!(await ${selector}.isChecked())` : `await ${selector}.isChecked()`;
            case 'empty':
                return isNot ? `(await ${selector}.inputValue()) !== ''` : `(await ${selector}.inputValue()) === ''`;
        }
    }

    // Contains condition: selector contains "text"
    const containsMatch = cond.match(/^(\S+)\s+contains\s+"([^"]+)"$/i);
    if (containsMatch) {
        const selector = resolveSelector(containsMatch[1], contextPage);
        const text = containsMatch[2];
        return `(await ${selector}.textContent())?.includes('${text}')`;
    }

    // Comparison operators: value == value, count > 5, etc.
    const comparisonMatch = cond.match(/^(\S+)\s*(==|!=|>=|<=|>|<)\s*(\S+)$/);
    if (comparisonMatch) {
        let left = comparisonMatch[1];
        const op = comparisonMatch[2];
        let right = comparisonMatch[3];

        // Convert Vero == to JS ===, != to !==
        const jsOp = op === '==' ? '===' : op === '!=' ? '!==' : op;

        // Handle string literals
        if (left.startsWith('"')) left = left.replace(/"/g, "'");
        if (right.startsWith('"')) right = right.replace(/"/g, "'");

        return `${left} ${jsOp} ${right}`;
    }

    // Default: return as-is (truthy check)
    return cond;
}

function resolveSelector(ref: string, contextPage?: PageDefinition): string {
    // String literal selector - use getByText for plain text, locator for CSS selectors
    if (ref.startsWith('"')) {
        const content = ref.slice(1, -1); // Remove quotes
        // If it looks like a CSS selector (starts with . # [ or contains >), use locator
        if (/^[.#\[]|>/.test(content)) {
            return `page.locator('${content}')`;
        }
        // Otherwise use getByText for text matching
        return `page.getByText('${content}')`;
    }

    // PageName.fieldName reference
    if (ref.includes('.')) {
        const [pageName, fieldName] = ref.split('.');
        return `${pageName.toLowerCase()}.${fieldName}(page)`;
    }

    // Bare field name (in page context)
    if (contextPage && contextPage.fields.has(ref)) {
        const selector = contextPage.fields.get(ref)!;
        // Handle role: prefix
        if (selector.startsWith('role:')) {
            return `page.getByRole('${selector.slice(5)}')`;
        }
        // Escape single quotes in selector
        const escapedSelector = selector.replace(/'/g, "\\'");
        return `page.locator('${escapedSelector}')`;
    }

    // Assume it's a page field reference
    return `page.locator('${ref}')`;
}

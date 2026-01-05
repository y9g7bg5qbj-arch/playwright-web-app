/**
 * Vero to Playwright Transpiler (using ANTLR parser)
 * Transpiles Vero DSL to executable Playwright TypeScript
 */

import { CharStream, CommonTokenStream, ParserRuleContext, TerminalNode } from 'antlr4ng';
import { VeroLexer } from './parser/generated/grammar/VeroLexer.js';
import { VeroParser } from './parser/generated/grammar/VeroParser.js';
import * as fs from 'fs';

interface PageDefinition {
    name: string;
    fields: Map<string, string>;
    actions: Map<string, { params: string[]; body: string }>;
}

interface FeatureDefinition {
    name: string;
    usedPages: string[];
    beforeEach: string;
    afterEach: string;
    scenarios: { name: string; tags: string[]; body: string }[];
}

function transpileVeroToPlaywright(veroCode: string): string {
    const input = CharStream.fromString(veroCode);
    const lexer = new VeroLexer(input);
    const tokens = new CommonTokenStream(lexer);
    const parser = new VeroParser(tokens);
    const tree = parser.program();

    if (parser.numberOfSyntaxErrors > 0) {
        throw new Error(`Parse failed with ${parser.numberOfSyntaxErrors} syntax errors`);
    }

    const pages: PageDefinition[] = [];
    const features: FeatureDefinition[] = [];

    // Extract pages and features from parse tree
    // The tree structure is: program -> declaration* -> (pageDeclaration | featureDeclaration)
    findNodes(tree, parser, 'pageDeclaration', (ctx) => {
        pages.push(extractPage(ctx, parser));
    });

    findNodes(tree, parser, 'featureDeclaration', (ctx) => {
        features.push(extractFeature(ctx, parser));
    });

    console.log(`Found ${pages.length} pages and ${features.length} features`);

    // Generate Playwright TypeScript
    let output = `// Generated from Vero DSL
import { test, expect, Page, Locator } from '@playwright/test';

`;

    // Generate page classes
    for (const page of pages) {
        output += generatePageClass(page);
    }

    // Generate test file
    for (const feature of features) {
        output += generateFeatureTests(feature, pages);
    }

    return output;
}

// Helper to recursively find nodes by rule name
function findNodes(
    ctx: ParserRuleContext,
    parser: VeroParser,
    targetRule: string,
    callback: (ctx: ParserRuleContext) => void
) {
    const ruleName = parser.ruleNames[ctx.ruleIndex];
    if (ruleName === targetRule) {
        callback(ctx);
        return; // Don't recurse into this node
    }

    for (let i = 0; i < ctx.getChildCount(); i++) {
        const child = ctx.getChild(i);
        if (child instanceof ParserRuleContext) {
            findNodes(child, parser, targetRule, callback);
        }
    }
}

function extractPage(ctx: ParserRuleContext, parser: VeroParser): PageDefinition {
    const name = ctx.getChild(1)?.getText() || 'UnknownPage';
    const fields = new Map<string, string>();
    const actions = new Map<string, { params: string[]; body: string }>();

    // Find pageBody
    for (let i = 0; i < ctx.getChildCount(); i++) {
        const child = ctx.getChild(i);
        if (child instanceof ParserRuleContext) {
            const ruleName = parser.ruleNames[child.ruleIndex];
            if (ruleName === 'pageBody') {
                extractPageBody(child, parser, fields, actions);
            }
        }
    }

    return { name, fields, actions };
}

function extractPageBody(
    ctx: ParserRuleContext,
    parser: VeroParser,
    fields: Map<string, string>,
    actions: Map<string, { params: string[]; body: string }>
) {
    for (let i = 0; i < ctx.getChildCount(); i++) {
        const child = ctx.getChild(i);
        if (child instanceof ParserRuleContext) {
            const ruleName = parser.ruleNames[child.ruleIndex];
            if (ruleName === 'pageMember') {
                const member = child.getChild(0);
                if (member instanceof ParserRuleContext) {
                    const memberRule = parser.ruleNames[member.ruleIndex];
                    if (memberRule === 'fieldDeclaration') {
                        const fieldName = member.getChild(1)?.getText() || '';
                        const selector = member.getChild(3)?.getText()?.replace(/"/g, '') || '';
                        fields.set(fieldName, selector);
                    } else if (memberRule === 'actionDeclaration') {
                        const actionName = member.getChild(0)?.getText() || '';
                        const params: string[] = [];
                        // Extract parameters if present
                        for (let j = 0; j < member.getChildCount(); j++) {
                            const actionChild = member.getChild(j);
                            if (actionChild instanceof ParserRuleContext) {
                                const paramRule = parser.ruleNames[actionChild.ruleIndex];
                                if (paramRule === 'parameterList') {
                                    for (let k = 0; k < actionChild.getChildCount(); k++) {
                                        const param = actionChild.getChild(k);
                                        if (param && !(param instanceof TerminalNode && param.getText() === ',')) {
                                            params.push(param.getText());
                                        }
                                    }
                                }
                            }
                        }
                        const body = transpileStatements(member, parser, '');
                        actions.set(actionName, { params, body });
                    }
                }
            }
        }
    }
}

function extractFeature(ctx: ParserRuleContext, parser: VeroParser): FeatureDefinition {
    const name = ctx.getChild(1)?.getText() || 'UnknownFeature';
    const usedPages: string[] = [];
    let beforeEach = '';
    let afterEach = '';
    const scenarios: { name: string; tags: string[]; body: string }[] = [];

    for (let i = 0; i < ctx.getChildCount(); i++) {
        const child = ctx.getChild(i);
        if (child instanceof ParserRuleContext) {
            const ruleName = parser.ruleNames[child.ruleIndex];
            if (ruleName === 'featureBody') {
                for (let j = 0; j < child.getChildCount(); j++) {
                    const member = child.getChild(j);
                    if (member instanceof ParserRuleContext) {
                        const memberRule = parser.ruleNames[member.ruleIndex];
                        if (memberRule === 'featureMember') {
                            const inner = member.getChild(0);
                            if (inner instanceof ParserRuleContext) {
                                const innerRule = parser.ruleNames[inner.ruleIndex];
                                if (innerRule === 'useStatement') {
                                    usedPages.push(inner.getChild(1)?.getText() || '');
                                } else if (innerRule === 'hookDeclaration') {
                                    const hookType = inner.getChild(0)?.getText()?.toLowerCase();
                                    const hookScope = inner.getChild(1)?.getText()?.toLowerCase();
                                    const hookBody = transpileStatements(inner, parser, '        ');
                                    if (hookType === 'before' && hookScope === 'each') {
                                        beforeEach = hookBody;
                                    } else if (hookType === 'after' && hookScope === 'each') {
                                        afterEach = hookBody;
                                    }
                                } else if (innerRule === 'scenarioDeclaration') {
                                    const scenarioName = inner.getChild(1)?.getText()?.replace(/"/g, '') || '';
                                    const tags: string[] = [];
                                    // Extract tags
                                    for (let k = 0; k < inner.getChildCount(); k++) {
                                        const tagChild = inner.getChild(k);
                                        if (tagChild instanceof ParserRuleContext) {
                                            const tagRule = parser.ruleNames[tagChild.ruleIndex];
                                            if (tagRule === 'tag') {
                                                tags.push(tagChild.getChild(1)?.getText() || '');
                                            }
                                        }
                                    }
                                    const body = transpileStatements(inner, parser, '        ');
                                    scenarios.push({ name: scenarioName, tags, body });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return { name, usedPages, beforeEach, afterEach, scenarios };
}

function transpileStatements(ctx: ParserRuleContext, parser: VeroParser, indent: string): string {
    let output = '';

    for (let i = 0; i < ctx.getChildCount(); i++) {
        const child = ctx.getChild(i);
        if (child instanceof ParserRuleContext) {
            const ruleName = parser.ruleNames[child.ruleIndex];
            if (ruleName === 'statement') {
                output += transpileStatement(child, parser, indent);
            }
        }
    }

    return output;
}

function transpileStatement(ctx: ParserRuleContext, parser: VeroParser, indent: string): string {
    const actionCtx = ctx.getChild(0);
    if (!(actionCtx instanceof ParserRuleContext)) return '';

    const actionType = parser.ruleNames[actionCtx.ruleIndex];

    switch (actionType) {
        case 'actionStatement':
            return transpileAction(actionCtx.getChild(0) as ParserRuleContext, parser, indent);
        case 'assertionStatement':
            return transpileAssertion(actionCtx, parser, indent);
        default:
            return '';
    }
}

function transpileAction(ctx: ParserRuleContext, parser: VeroParser, indent: string): string {
    const actionType = parser.ruleNames[ctx.ruleIndex];

    switch (actionType) {
        case 'clickAction': {
            const selector = getSelector(ctx.getChild(1) as ParserRuleContext, parser);
            return `${indent}await page.locator('${selector}').click();\n`;
        }
        case 'fillAction': {
            const selector = getSelector(ctx.getChild(1) as ParserRuleContext, parser);
            const value = ctx.getChild(3)?.getText()?.replace(/"/g, '') || '';
            return `${indent}await page.locator('${selector}').fill('${value}');\n`;
        }
        case 'openAction': {
            const url = ctx.getChild(1)?.getText()?.replace(/"/g, '') || '';
            return `${indent}await page.goto('${url}');\n`;
        }
        case 'waitAction': {
            const amount = ctx.getChild(1)?.getText() || '1';
            const unit = ctx.getChild(2)?.getText()?.toLowerCase() || 'seconds';
            const ms = unit === 'milliseconds' ? parseInt(amount) : parseInt(amount) * 1000;
            return `${indent}await page.waitForTimeout(${ms});\n`;
        }
        case 'doAction': {
            const methodRef = ctx.getChild(1)?.getText() || '';
            const parts = methodRef.split('.');
            const pageName = parts[0];
            const actionName = parts[1];
            // Get arguments if any
            let args = '';
            for (let i = 2; i < ctx.getChildCount(); i++) {
                const child = ctx.getChild(i);
                if (child instanceof ParserRuleContext) {
                    const ruleName = parser.ruleNames[child.ruleIndex];
                    if (ruleName === 'argumentList') {
                        const argTexts: string[] = [];
                        for (let j = 0; j < child.getChildCount(); j++) {
                            const argChild = child.getChild(j);
                            if (argChild && argChild.getText() !== ',') {
                                argTexts.push(argChild.getText());
                            }
                        }
                        args = argTexts.join(', ');
                    }
                }
            }
            return `${indent}await ${pageName.toLowerCase()}.${actionName}(page, ${args});\n`;
        }
        case 'logAction': {
            const message = ctx.getChild(1)?.getText() || '';
            return `${indent}console.log(${message});\n`;
        }
        default:
            return `${indent}// TODO: ${actionType}\n`;
    }
}

function transpileAssertion(ctx: ParserRuleContext, parser: VeroParser, indent: string): string {
    const selectorCtx = ctx.getChild(1);
    const selector = selectorCtx ? getSelector(selectorCtx as ParserRuleContext, parser) : '';
    const condition = ctx.getChild(3)?.getText()?.toLowerCase() || 'visible';

    if (condition === 'visible') {
        return `${indent}await expect(page.locator('${selector}')).toBeVisible();\n`;
    } else if (condition === 'hidden') {
        return `${indent}await expect(page.locator('${selector}')).toBeHidden();\n`;
    }
    return `${indent}// TODO: assertion ${condition}\n`;
}

function getSelector(ctx: ParserRuleContext, parser: VeroParser): string {
    // Could be pageFieldReference, STRING_LITERAL, or IDENTIFIER
    const text = ctx.getText();
    if (text.startsWith('"')) {
        return text.replace(/"/g, '');
    }
    if (text.includes('.')) {
        // Page.field reference - return as-is for now
        return text;
    }
    // Bare identifier - would need context to resolve
    return text;
}

function generatePageClass(page: PageDefinition): string {
    let output = `// Page Object: ${page.name}
const ${page.name.toLowerCase()} = {
`;

    // Add fields as locator getters
    for (const [name, selector] of page.fields) {
        output += `    ${name}: (page: Page) => page.locator('${selector}'),\n`;
    }

    // Add actions as methods
    for (const [name, action] of page.actions) {
        const params = action.params.length > 0 ? `, ${action.params.join(': string, ')}: string` : '';
        output += `    ${name}: async (page: Page${params}) => {\n`;
        output += action.body || '        // Action body\n';
        output += `    },\n`;
    }

    output += `};\n\n`;
    return output;
}

function generateFeatureTests(feature: FeatureDefinition, pages: PageDefinition[]): string {
    let output = `test.describe('${feature.name}', () => {\n`;

    if (feature.beforeEach) {
        output += `    test.beforeEach(async ({ page }) => {\n`;
        output += feature.beforeEach;
        output += `    });\n\n`;
    }

    for (const scenario of feature.scenarios) {
        const tagComment = scenario.tags.length > 0 ? ` // Tags: @${scenario.tags.join(', @')}` : '';
        output += `    test('${scenario.name}', async ({ page }) => {${tagComment}\n`;
        output += scenario.body;
        output += `    });\n\n`;
    }

    output += `});\n`;
    return output;
}

// Main execution
const args = process.argv.slice(2);
const inputFile = args[0] || './test-project/features/AmazonSearch.vero';
const outputFile = args[1] || './test-project/output/amazon-search.spec.ts';

if (!fs.existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`);
    process.exit(1);
}

console.log(`\n🔄 Transpiling: ${inputFile}`);
const veroCode = fs.readFileSync(inputFile, 'utf-8');

try {
    const playwrightCode = transpileVeroToPlaywright(veroCode);

    // Ensure output directory exists
    const outputDir = outputFile.substring(0, outputFile.lastIndexOf('/'));
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, playwrightCode);
    console.log(`✅ Generated: ${outputFile}\n`);
    console.log('📄 Generated Playwright code:');
    console.log('='.repeat(60));
    console.log(playwrightCode);
} catch (error) {
    console.error(`❌ Transpilation failed: ${error}`);
    process.exit(1);
}

/**
 * Main Code Generator
 * Orchestrates code generation from visual flows to Playwright TypeScript
 */

import type {
    Flow,
    FlowNode,
    FlowEdge,
    GenerateOptions,
    GeneratedCode,
    GeneratorContext,
    LocatorInfo,
    PageAction,
    ExportMode
} from '@playwright-web-app/shared';
import {
    generateNodeCode,
    isBlockStartNode,
    isBranchingNode,
    isLoopNode,
    CatchGenerator,
    FinallyGenerator
} from './nodeGenerators';
import { indent } from './variableInterpolation';
import { POMGenerator } from './pomGenerator';
import { FixturesGenerator } from './fixturesGenerator';
import { ConfigGenerator } from './configGenerator';

/**
 * Main code generator class
 */
export class CodeGenerator {
    private pomGenerator: POMGenerator;
    private fixturesGenerator: FixturesGenerator;
    private configGenerator: ConfigGenerator;

    constructor() {
        this.pomGenerator = new POMGenerator();
        this.fixturesGenerator = new FixturesGenerator();
        this.configGenerator = new ConfigGenerator();
    }

    /**
     * Generate code from a flow
     */
    generate(flow: Flow, options: GenerateOptions): GeneratedCode {
        const context = this.createContext(options);

        // Build node and edge maps for quick lookup
        const nodeMap = new Map<string, FlowNode>();
        const edgeMap = new Map<string, FlowEdge[]>();

        for (const node of flow.nodes) {
            nodeMap.set(node.id, node);
        }

        for (const edge of flow.edges) {
            const edges = edgeMap.get(edge.source) || [];
            edges.push(edge);
            edgeMap.set(edge.source, edges);
        }

        // Find start node
        const startNode = flow.nodes.find(n => n.type === 'start');
        if (!startNode) {
            throw new Error('Flow must have a start node');
        }

        // Generate test body by traversing the flow
        const testLines: string[] = [];
        this.traverseAndGenerate(startNode.id, nodeMap, edgeMap, testLines, context);

        // Assemble based on export mode
        const result: GeneratedCode = {
            testFile: this.assembleTestFile(flow, testLines, context)
        };

        // Add fixtures/POM based on mode
        switch (options.mode) {
            case 'pom':
                result.pageObjects = this.pomGenerator.generate(context);
                break;
            case 'fixtures':
                result.fixturesFile = this.fixturesGenerator.generate(context);
                break;
            case 'pom-fixtures':
                result.pageObjects = this.pomGenerator.generate(context);
                result.fixturesFile = this.fixturesGenerator.generateWithPOM(context);
                break;
        }

        // Add config if requested
        if (options.generateConfig) {
            result.configFile = this.configGenerator.generate(options);
        }

        return result;
    }

    /**
     * Create initial generator context
     */
    private createContext(options: GenerateOptions): GeneratorContext {
        return {
            indent: 0,
            variables: new Map(),
            usedLocators: new Map(),
            currentPage: 'default',
            options,
            pageActions: new Map(),
            visitedNodes: new Set(),
        };
    }

    /**
     * Traverse the flow graph and generate code
     */
    private traverseAndGenerate(
        nodeId: string,
        nodeMap: Map<string, FlowNode>,
        edgeMap: Map<string, FlowEdge[]>,
        lines: string[],
        context: GeneratorContext
    ): void {
        // Prevent infinite loops
        if (context.visitedNodes.has(nodeId)) {
            return;
        }
        context.visitedNodes.add(nodeId);

        const node = nodeMap.get(nodeId);
        if (!node) return;

        // Generate code for this node
        const nodeCode = generateNodeCode(node, context);
        const ind = indent(context.indent);

        for (const line of nodeCode) {
            lines.push(`${ind}${line}`);
        }

        // Handle branching nodes (if/else, try/catch)
        if (isBranchingNode(node.type)) {
            const edges = edgeMap.get(nodeId) || [];

            if (node.type === 'if') {
                // Handle true branch
                const trueBranch = edges.find(e => e.sourceHandle === 'true');
                if (trueBranch) {
                    context.indent++;
                    this.traverseAndGenerate(trueBranch.target, nodeMap, edgeMap, lines, context);
                    context.indent--;
                }

                // Handle false/else branch
                const falseBranch = edges.find(e => e.sourceHandle === 'false');
                if (falseBranch) {
                    lines.push(`${ind}} else {`);
                    context.indent++;
                    this.traverseAndGenerate(falseBranch.target, nodeMap, edgeMap, lines, context);
                    context.indent--;
                }

                lines.push(`${ind}}`);

                // Continue after if/else (find merge point or default edge)
                const defaultEdge = edges.find(e => !e.sourceHandle || e.sourceHandle === 'default');
                if (defaultEdge) {
                    this.traverseAndGenerate(defaultEdge.target, nodeMap, edgeMap, lines, context);
                }
                return;
            }

            if (node.type === 'try-catch') {
                const tryBranch = edges.find(e => e.sourceHandle === 'try' || !e.sourceHandle);
                if (tryBranch) {
                    context.indent++;
                    this.traverseAndGenerate(tryBranch.target, nodeMap, edgeMap, lines, context);
                    context.indent--;
                }

                // Handle catch branch
                const catchBranch = edges.find(e => e.sourceHandle === 'catch');
                if (catchBranch) {
                    const catchGen = new CatchGenerator();
                    const catchCode = catchGen.generate(node, context);
                    for (const line of catchCode) {
                        lines.push(`${ind}${line}`);
                    }
                    context.indent++;
                    this.traverseAndGenerate(catchBranch.target, nodeMap, edgeMap, lines, context);
                    context.indent--;
                }

                // Handle finally branch
                const finallyBranch = edges.find(e => e.sourceHandle === 'finally');
                if (finallyBranch) {
                    const finallyGen = new FinallyGenerator();
                    const finallyCode = finallyGen.generate(node, context);
                    for (const line of finallyCode) {
                        lines.push(`${ind}${line}`);
                    }
                    context.indent++;
                    this.traverseAndGenerate(finallyBranch.target, nodeMap, edgeMap, lines, context);
                    context.indent--;
                }

                lines.push(`${ind}}`);
                return;
            }
        }

        // Handle loop nodes
        if (isLoopNode(node.type)) {
            const edges = edgeMap.get(nodeId) || [];

            // Loop body
            const bodyEdge = edges.find(e => e.sourceHandle === 'loop-body' || e.sourceHandle === 'body');
            if (bodyEdge) {
                context.indent++;
                // Clear visited for loop body to allow re-entry
                const loopContext = { ...context, visitedNodes: new Set(context.visitedNodes) };
                this.traverseAndGenerate(bodyEdge.target, nodeMap, edgeMap, lines, loopContext);
                context.indent--;
            } else {
                // If no explicit body edge, use default
                const defaultEdge = edges.find(e => !e.sourceHandle || e.sourceHandle === 'default');
                if (defaultEdge) {
                    context.indent++;
                    this.traverseAndGenerate(defaultEdge.target, nodeMap, edgeMap, lines, context);
                    context.indent--;
                }
            }

            lines.push(`${ind}}`);

            // Continue after loop
            const exitEdge = edges.find(e => e.sourceHandle === 'loop-exit' || e.sourceHandle === 'exit');
            if (exitEdge) {
                this.traverseAndGenerate(exitEdge.target, nodeMap, edgeMap, lines, context);
            }
            return;
        }

        // Handle block start nodes (group, etc.)
        if (isBlockStartNode(node.type) && !isBranchingNode(node.type) && !isLoopNode(node.type)) {
            const edges = edgeMap.get(nodeId) || [];
            const defaultEdge = edges.find(e => !e.sourceHandle || e.sourceHandle === 'default');
            if (defaultEdge) {
                context.indent++;
                this.traverseAndGenerate(defaultEdge.target, nodeMap, edgeMap, lines, context);
                context.indent--;
                lines.push(`${ind}}`);
            }
            return;
        }

        // Continue to next node (normal flow)
        const edges = edgeMap.get(nodeId) || [];
        const nextEdge = edges.find(e => !e.sourceHandle || e.sourceHandle === 'default');
        if (nextEdge && node.type !== 'end') {
            this.traverseAndGenerate(nextEdge.target, nodeMap, edgeMap, lines, context);
        }
    }

    /**
     * Assemble the complete test file
     */
    private assembleTestFile(
        flow: Flow,
        testLines: string[],
        context: GeneratorContext
    ): string {
        const options = context.options;
        const testName = options.testName || flow.name || 'Generated Test';
        const mode = options.mode;

        const lines: string[] = [];

        // Imports based on mode
        if (mode === 'fixtures' || mode === 'pom-fixtures') {
            lines.push(`import { test, expect } from './fixtures';`);
        } else {
            lines.push(`import { test, expect } from '@playwright/test';`);
        }

        // POM imports
        if (mode === 'pom' || mode === 'pom-fixtures') {
            const pageNames = Array.from(context.usedLocators.values())
                .map(l => l.pageName)
                .filter((v, i, a) => a.indexOf(v) === i);

            for (const pageName of pageNames) {
                const className = this.toClassName(pageName);
                lines.push(`import { ${className} } from './pages/${className}';`);
            }
        }

        lines.push('');

        // Test describe block
        lines.push(`test.describe('${testName}', () => {`);

        // BeforeEach if baseUrl is provided
        if (options.baseUrl) {
            lines.push(`  test.beforeEach(async ({ page }) => {`);
            lines.push(`    await page.goto('${options.baseUrl}');`);
            lines.push(`  });`);
            lines.push('');
        }

        // Main test
        if (mode === 'pom-fixtures') {
            // Use fixtures for page objects
            const fixtureParams = this.getFixtureParams(context);
            lines.push(`  test('${testName}', async ({ page, ${fixtureParams} }) => {`);
        } else {
            lines.push(`  test('${testName}', async ({ page }) => {`);
        }

        // Test body
        for (const line of testLines) {
            lines.push(`    ${line}`);
        }

        lines.push(`  });`);
        lines.push(`});`);
        lines.push('');

        return lines.join('\n');
    }

    /**
     * Get fixture parameters for test function
     */
    private getFixtureParams(context: GeneratorContext): string {
        const pageNames = Array.from(context.usedLocators.values())
            .map(l => l.pageName)
            .filter((v, i, a) => a.indexOf(v) === i);

        return pageNames.map(p => this.toVariableName(p)).join(', ');
    }

    /**
     * Convert page name to class name
     */
    private toClassName(pageName: string): string {
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

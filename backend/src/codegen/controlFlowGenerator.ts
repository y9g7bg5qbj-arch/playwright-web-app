/**
 * Control Flow Code Generator
 * Generates TypeScript/Playwright code from flow graphs (server-side)
 */

import {
    FlowNode,
    FlowEdge,
    FlowData,
    isControlFlowNode,
} from '@playwright-web-app/shared';

/**
 * Helper to generate locator code from selector and strategy
 */
function generateLocatorCode(selector: string, strategy: string = 'css'): string {
    if (!selector) {
        return 'page.locator("body")';
    }

    // Check for role-based selector format like "button[name=\"Submit\"]"
    const roleMatch = selector.match(/^(\w+)\[name="([^"]+)"\]$/);
    if (roleMatch) {
        return `page.getByRole('${roleMatch[1]}', { name: '${roleMatch[2]}' })`;
    }

    // Check for special selector formats
    if (selector.startsWith('text=')) {
        return `page.getByText('${selector.slice(5)}')`;
    }
    if (selector.startsWith('label=')) {
        return `page.getByLabel('${selector.slice(6)}')`;
    }
    if (selector.startsWith('placeholder=')) {
        return `page.getByPlaceholder('${selector.slice(12)}')`;
    }
    if (selector.startsWith('data-testid=')) {
        return `page.getByTestId('${selector.slice(12)}')`;
    }

    // Strategy-based selectors
    switch (strategy) {
        case 'xpath':
            return `page.locator('xpath=${selector}')`;
        case 'text':
            return `page.getByText('${selector}')`;
        case 'text-exact':
            return `page.getByText('${selector}', { exact: true })`;
        case 'role':
            return `page.getByRole('${selector}')`;
        case 'test-id':
            return `page.getByTestId('${selector}')`;
        case 'label':
            return `page.getByLabel('${selector}')`;
        case 'placeholder':
            return `page.getByPlaceholder('${selector}')`;
        case 'css':
        default:
            return `page.locator('${selector}')`;
    }
}

/**
 * Generate condition code from node data
 */
function generateConditionCode(data: Record<string, any>): string {
    const conditionType = data.conditionType || 'expression';

    if (conditionType === 'expression') {
        return data.expression || 'true';
    }

    if (conditionType === 'element') {
        const selector = data.selector || '';
        const strategy = data.locatorStrategy || 'css';
        const condition = data.elementCondition || 'visible';
        const locator = generateLocatorCode(selector, strategy);

        switch (condition) {
            case 'visible':
                return `await ${locator}.isVisible()`;
            case 'hidden':
                return `await ${locator}.isHidden()`;
            case 'enabled':
                return `await ${locator}.isEnabled()`;
            case 'disabled':
                return `await ${locator}.isDisabled()`;
            case 'checked':
                return `await ${locator}.isChecked()`;
            case 'exists':
                return `(await ${locator}.count()) > 0`;
            default:
                return 'true';
        }
    }

    if (conditionType === 'variable') {
        const varName = data.variableName || 'variable';
        const operator = data.operator || 'equals';
        const compareValue = data.compareValue || '';

        switch (operator) {
            case 'equals':
                return `${varName} === '${compareValue}'`;
            case 'notEquals':
                return `${varName} !== '${compareValue}'`;
            case 'contains':
                return `String(${varName}).includes('${compareValue}')`;
            case 'startsWith':
                return `String(${varName}).startsWith('${compareValue}')`;
            case 'endsWith':
                return `String(${varName}).endsWith('${compareValue}')`;
            case 'greaterThan':
                return `Number(${varName}) > ${compareValue}`;
            case 'lessThan':
                return `Number(${varName}) < ${compareValue}`;
            case 'greaterOrEqual':
                return `Number(${varName}) >= ${compareValue}`;
            case 'lessOrEqual':
                return `Number(${varName}) <= ${compareValue}`;
            case 'isEmpty':
                return `!${varName} || ${varName}.length === 0`;
            case 'isNotEmpty':
                return `${varName} && ${varName}.length > 0`;
            case 'isTrue':
                return `${varName} === true`;
            case 'isFalse':
                return `${varName} === false`;
            default:
                return `${varName} === '${compareValue}'`;
        }
    }

    return 'true';
}

/**
 * Control Flow Code Generator
 */
export class ControlFlowGenerator {
    private lines: string[] = [];
    private visited: Set<string> = new Set();
    private variables: Set<string> = new Set();

    /**
     * Generate TypeScript code from flow data
     */
    generate(flow: FlowData): string {
        return this.generateFromNodesAndEdges(flow.nodes, flow.edges);
    }

    /**
     * Generate TypeScript code from nodes and edges
     */
    generateFromNodesAndEdges(nodes: FlowNode[], edges: FlowEdge[]): string {
        this.lines = [];
        this.visited = new Set();
        this.variables = new Set();

        // Collect all variables used
        this.collectVariables(nodes);

        // Start with imports
        this.lines.push("import { test, expect } from '@playwright/test';");
        this.lines.push("");
        this.lines.push("test('generated flow', async ({ page, context }) => {");

        // Hoist variable declarations
        if (this.variables.size > 0) {
            this.addLine(`// Variables`, 1);
            this.addLine(`let ${Array.from(this.variables).join(', ')};`, 1);
            this.addLine('', 1);
        }

        // Find start node
        const startNode = nodes.find(n => n.type === 'start' || n.data.actionType === 'start');
        if (!startNode) {
            this.addLine('// No start node found', 1);
        } else {
            this.traverseNode(startNode, nodes, edges, 1);
        }

        this.lines.push("});");

        return this.lines.join('\n');
    }

    /**
     * Collect all variables that need to be declared
     */
    private collectVariables(nodes: FlowNode[]): void {
        for (const node of nodes) {
            const data = node.data;
            const actionType = data.actionType || '';

            if (actionType === 'set-variable' && data.name) {
                this.variables.add(data.name);
            }
            if (actionType === 'get-text' && data.variable) {
                this.variables.add(data.variable);
            }
            if (actionType === 'get-attribute' && data.variable) {
                this.variables.add(data.variable);
            }
            if (actionType === 'get-value' && data.variable) {
                this.variables.add(data.variable);
            }
            if (actionType === 'for-loop' && data.indexVariable) {
                this.variables.add(data.indexVariable);
            }
            if (actionType === 'for-each') {
                if (data.itemVariable) this.variables.add(data.itemVariable);
                if (data.indexVariable) this.variables.add(data.indexVariable);
            }
            if (actionType === 'try-catch' && data.errorVariable) {
                this.variables.add(data.errorVariable);
            }
        }
    }

    /**
     * Traverse nodes and generate code
     */
    private traverseNode(
        node: FlowNode,
        nodes: FlowNode[],
        edges: FlowEdge[],
        indent: number
    ): void {
        if (this.visited.has(node.id)) {
            return;
        }
        this.visited.add(node.id);

        const actionType = node.data.actionType || node.type || '';
        const code = this.generateNodeCode(node, nodes, edges, indent);

        // Control flow nodes handle their own code generation
        const controlFlowTypes = ['if', 'for-loop', 'for-each', 'while-loop', 'try-catch', 'data'];
        if (controlFlowTypes.includes(actionType)) {
            return;
        }

        if (code) {
            this.addLine(code, indent);
        }

        // Continue to next node
        const nextEdge = edges.find(e =>
            e.source === node.id && (!e.sourceHandle || e.sourceHandle === 'default')
        );
        if (nextEdge) {
            const nextNode = nodes.find(n => n.id === nextEdge.target);
            if (nextNode) {
                this.traverseNode(nextNode, nodes, edges, indent);
            }
        }
    }

    /**
     * Generate code for a single node
     */
    private generateNodeCode(
        node: FlowNode,
        nodes: FlowNode[],
        edges: FlowEdge[],
        indent: number
    ): string | null {
        const actionType = node.data.actionType || node.type || '';
        const data = node.data;

        const getLocator = () => generateLocatorCode(data.selector || '', data.locatorStrategy || 'css');

        switch (actionType) {
            // Skip structural nodes
            case 'start':
            case 'end':
                return null;

            // Navigation
            case 'navigate':
                return `await page.goto('${data.url || ''}');`;
            case 'go-back':
                return 'await page.goBack();';
            case 'go-forward':
                return 'await page.goForward();';
            case 'reload':
                return 'await page.reload();';

            // Mouse Actions
            case 'click':
                return `await ${getLocator()}.click();`;
            case 'double-click':
                return `await ${getLocator()}.dblclick();`;
            case 'right-click':
                return `await ${getLocator()}.click({ button: 'right' });`;
            case 'hover':
                return `await ${getLocator()}.hover();`;

            // Input Actions
            case 'fill':
                return `await ${getLocator()}.fill('${data.value || ''}');`;
            case 'type':
                return `await ${getLocator()}.pressSequentially('${data.text || ''}');`;
            case 'clear':
                return `await ${getLocator()}.clear();`;
            case 'press-key':
                return `await page.keyboard.press('${data.key || 'Enter'}');`;
            case 'check':
                return `await ${getLocator()}.check();`;
            case 'uncheck':
                return `await ${getLocator()}.uncheck();`;
            case 'select-option':
                return `await ${getLocator()}.selectOption('${data.optionValue || ''}');`;

            // Waits
            case 'wait-time':
                return `await page.waitForTimeout(${data.duration || 1000});`;
            case 'wait-for-element':
                return `await ${getLocator()}.waitFor({ state: '${data.state || 'visible'}' });`;
            case 'wait-for-url':
                return `await page.waitForURL('${data.url || '**'}');`;
            case 'wait-for-load-state':
                return `await page.waitForLoadState('${data.state || 'load'}');`;

            // Assertions
            case 'assert-visible':
                return `await expect(${getLocator()}).toBeVisible();`;
            case 'assert-hidden':
                return `await expect(${getLocator()}).toBeHidden();`;
            case 'assert-text':
                return data.matchType === 'exact'
                    ? `await expect(${getLocator()}).toHaveText('${data.expectedText || ''}');`
                    : `await expect(${getLocator()}).toContainText('${data.expectedText || ''}');`;
            case 'assert-value':
                return `await expect(${getLocator()}).toHaveValue('${data.expectedValue || ''}');`;
            case 'assert-url':
                return `await expect(page).toHaveURL('${data.expectedUrl || ''}');`;

            // Variables
            case 'set-variable':
                return `${data.name || 'variable'} = '${data.value || ''}';`;
            case 'get-text':
                return `${data.variable || 'text'} = await ${getLocator()}.textContent();`;
            case 'get-attribute':
                return `${data.variable || 'attr'} = await ${getLocator()}.getAttribute('${data.attribute || ''}');`;
            case 'get-value':
                return `${data.variable || 'value'} = await ${getLocator()}.inputValue();`;

            // Control Flow
            case 'break':
                return 'break;';
            case 'continue':
                return 'continue;';

            // If/Else
            case 'if':
                this.generateIfElse(node, nodes, edges, indent);
                return null;

            // Loops
            case 'for-loop':
                this.generateForLoop(node, nodes, edges, indent);
                return null;
            case 'for-each':
                this.generateForEach(node, nodes, edges, indent);
                return null;
            case 'while-loop':
                this.generateWhileLoop(node, nodes, edges, indent);
                return null;

            // Try-Catch
            case 'try-catch':
                this.generateTryCatch(node, nodes, edges, indent);
                return null;

            // Screenshot
            case 'screenshot':
                return `await page.screenshot({ path: '${data.name || 'screenshot'}.png' });`;

            // Log
            case 'log':
                return `console.log('${data.message || ''}');`;

            default:
                return `// TODO: Implement ${actionType}`;
        }
    }

    /**
     * Generate IF/ELSE code
     */
    private generateIfElse(node: FlowNode, nodes: FlowNode[], edges: FlowEdge[], indent: number): void {
        const condition = generateConditionCode(node.data);
        this.addLine(`if (${condition}) {`, indent);

        // True branch
        const trueEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'true');
        if (trueEdge) {
            const trueNode = nodes.find(n => n.id === trueEdge.target);
            if (trueNode) {
                this.traverseNode(trueNode, nodes, edges, indent + 1);
            }
        }

        // False branch
        const falseEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'false');
        if (falseEdge) {
            this.addLine('} else {', indent);
            const falseNode = nodes.find(n => n.id === falseEdge.target);
            if (falseNode) {
                this.traverseNode(falseNode, nodes, edges, indent + 1);
            }
        }

        this.addLine('}', indent);

        // Continue after if/else
        const nextEdge = edges.find(e => e.source === node.id && !e.sourceHandle);
        if (nextEdge) {
            const nextNode = nodes.find(n => n.id === nextEdge.target);
            if (nextNode) {
                this.traverseNode(nextNode, nodes, edges, indent);
            }
        }
    }

    /**
     * Generate FOR loop code
     */
    private generateForLoop(node: FlowNode, nodes: FlowNode[], edges: FlowEdge[], indent: number): void {
        const count = node.data.count || 5;
        const indexVar = node.data.indexVariable || 'i';

        this.addLine(`for (${indexVar} = 0; ${indexVar} < ${count}; ${indexVar}++) {`, indent);

        // Loop body
        const bodyEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'loop-body');
        if (bodyEdge) {
            const bodyNode = nodes.find(n => n.id === bodyEdge.target);
            if (bodyNode) {
                this.traverseNode(bodyNode, nodes, edges, indent + 1);
            }
        }

        this.addLine('}', indent);

        // Continue after loop
        const nextEdge = edges.find(e => e.source === node.id && (e.sourceHandle === 'next' || !e.sourceHandle));
        if (nextEdge) {
            const nextNode = nodes.find(n => n.id === nextEdge.target);
            if (nextNode) {
                this.traverseNode(nextNode, nodes, edges, indent);
            }
        }
    }

    /**
     * Generate FOR-EACH loop code
     */
    private generateForEach(node: FlowNode, nodes: FlowNode[], edges: FlowEdge[], indent: number): void {
        const itemVar = node.data.itemVariable || 'item';
        const indexVar = node.data.indexVariable || 'index';

        if (node.data.collectionType === 'elements') {
            const locator = generateLocatorCode(node.data.selector || '', node.data.locatorStrategy || 'css');
            this.addLine(`const elements = await ${locator}.all();`, indent);
            this.addLine(`for (const [${indexVar}, ${itemVar}] of elements.entries()) {`, indent);
        } else {
            this.addLine(`for (const [${indexVar}, ${itemVar}] of ${node.data.collectionVariable || '[]'}.entries()) {`, indent);
        }

        // Loop body
        const bodyEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'loop-body');
        if (bodyEdge) {
            const bodyNode = nodes.find(n => n.id === bodyEdge.target);
            if (bodyNode) {
                this.traverseNode(bodyNode, nodes, edges, indent + 1);
            }
        }

        this.addLine('}', indent);

        // Continue after loop
        const nextEdge = edges.find(e => e.source === node.id && (e.sourceHandle === 'next' || !e.sourceHandle));
        if (nextEdge) {
            const nextNode = nodes.find(n => n.id === nextEdge.target);
            if (nextNode) {
                this.traverseNode(nextNode, nodes, edges, indent);
            }
        }
    }

    /**
     * Generate WHILE loop code
     */
    private generateWhileLoop(node: FlowNode, nodes: FlowNode[], edges: FlowEdge[], indent: number): void {
        const condition = generateConditionCode(node.data);
        const maxIterations = node.data.maxIterations || 100;

        this.addLine(`let _whileCounter = 0;`, indent);
        this.addLine(`while ((${condition}) && _whileCounter < ${maxIterations}) {`, indent);
        this.addLine(`_whileCounter++;`, indent + 1);

        // Loop body
        const bodyEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'loop-body');
        if (bodyEdge) {
            const bodyNode = nodes.find(n => n.id === bodyEdge.target);
            if (bodyNode) {
                this.traverseNode(bodyNode, nodes, edges, indent + 1);
            }
        }

        this.addLine('}', indent);

        // Continue after loop
        const nextEdge = edges.find(e => e.source === node.id && (e.sourceHandle === 'next' || !e.sourceHandle));
        if (nextEdge) {
            const nextNode = nodes.find(n => n.id === nextEdge.target);
            if (nextNode) {
                this.traverseNode(nextNode, nodes, edges, indent);
            }
        }
    }

    /**
     * Generate TRY-CATCH code
     */
    private generateTryCatch(node: FlowNode, nodes: FlowNode[], edges: FlowEdge[], indent: number): void {
        const errorVar = node.data.errorVariable || 'error';

        this.addLine('try {', indent);

        // Try block
        const tryEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'try');
        if (tryEdge) {
            const tryNode = nodes.find(n => n.id === tryEdge.target);
            if (tryNode) {
                this.traverseNode(tryNode, nodes, edges, indent + 1);
            }
        }

        this.addLine(`} catch (${errorVar}) {`, indent);

        // Catch block
        const catchEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'catch');
        if (catchEdge) {
            const catchNode = nodes.find(n => n.id === catchEdge.target);
            if (catchNode) {
                this.traverseNode(catchNode, nodes, edges, indent + 1);
            }
        }

        this.addLine('}', indent);

        // Continue after try-catch
        const nextEdge = edges.find(e => e.source === node.id && !e.sourceHandle);
        if (nextEdge) {
            const nextNode = nodes.find(n => n.id === nextEdge.target);
            if (nextNode) {
                this.traverseNode(nextNode, nodes, edges, indent);
            }
        }
    }

    /**
     * Add a line with indentation
     */
    private addLine(code: string, indent: number): void {
        this.lines.push('  '.repeat(indent) + code);
    }
}

/**
 * Generate code from flow data
 */
export function generateCodeFromFlow(flow: FlowData): string {
    const generator = new ControlFlowGenerator();
    return generator.generate(flow);
}

/**
 * Generate code from nodes and edges
 */
export function generateCode(nodes: FlowNode[], edges: FlowEdge[]): string {
    const generator = new ControlFlowGenerator();
    return generator.generateFromNodesAndEdges(nodes, edges);
}

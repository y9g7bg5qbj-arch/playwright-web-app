import { Edge, Node } from '@xyflow/react';
import { ActionNodeData } from '../nodes/ActionNode';

type FlowNode = Node<ActionNodeData>;

// Helper to detect and parse role-based selectors like "link[name="Learn more"]"
function parseRoleSelectorStatic(selector: string): { role: string; name?: string } | null {
    const roleMatch = selector.match(/^(\w+)\[name="([^"]+)"\]$/);
    if (roleMatch) {
        return { role: roleMatch[1], name: roleMatch[2] };
    }
    // Also handle simple role without name
    if (selector.match(/^(link|button|heading|checkbox|textbox|listitem|menuitem|option|tab|radio|combobox|dialog|alert|img|list|navigation|main|form|table|row|cell|grid|gridcell|tree|treeitem)$/)) {
        return { role: selector };
    }
    return null;
}

// Helper to generate proper Playwright locator code from selector
function generateLocatorCode(selector: string, strategy: string = 'css'): string {
    // Check for role-based selector format from parser
    const roleInfo = parseRoleSelectorStatic(selector);
    if (roleInfo) {
        if (roleInfo.name) {
            return `page.getByRole('${roleInfo.role}', { name: '${roleInfo.name}' })`;
        }
        return `page.getByRole('${roleInfo.role}')`;
    }

    // Check for other special selector formats from parser
    if (selector.startsWith('text=')) {
        const text = selector.slice(5);
        return `page.getByText('${text}')`;
    }
    if (selector.startsWith('label=')) {
        const label = selector.slice(6);
        return `page.getByLabel('${label}')`;
    }
    if (selector.startsWith('placeholder=')) {
        const placeholder = selector.slice(12);
        return `page.getByPlaceholder('${placeholder}')`;
    }
    if (selector.startsWith('data-testid=')) {
        const testId = selector.slice(12);
        return `page.getByTestId('${testId}')`;
    }

    // Handle strategy-based selectors
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
        case 'css':
        default:
            return `page.locator('${selector}')`;
    }
}

// Helper to collect all variable names from nodes to hoist declarations
function collectVariables(nodes: FlowNode[]): Set<string> {
    const vars = new Set<string>();
    nodes.forEach(node => {
        const data = node.data as any;
        if (data.actionType === 'set-variable' && data.name) vars.add(data.name);
        if (data.actionType === 'get-text' && data.variable) vars.add(data.variable);
        if (data.actionType === 'get-attribute' && data.variable) vars.add(data.variable);
        if (data.actionType === 'get-value' && data.variable) vars.add(data.variable);
        if (data.actionType === 'get-url' && data.variable) vars.add(data.variable);
        if (data.actionType === 'get-title' && data.variable) vars.add(data.variable);
        if (data.actionType === 'get-element-count' && data.variable) vars.add(data.variable);
        if (data.actionType === 'evaluate-expression' && data.variable) vars.add(data.variable);
        if (data.actionType === 'run-javascript' && data.returnVariable) vars.add(data.returnVariable);
        if (data.actionType === 'for-loop' && data.indexVariable) vars.add(data.indexVariable);
        if (data.actionType === 'for-each') {
            if (data.itemVariable) vars.add(data.itemVariable);
            if (data.indexVariable) vars.add(data.indexVariable);
        }
        if (data.actionType === 'try-catch' && data.errorVariable) vars.add(data.errorVariable);
        // Data source implicit variable
        if (data.actionType === 'data') vars.add('row');
        // Extract block runtime variable
        if (data.actionType === 'extract' && data.storeAs) vars.add(data.storeAs);
    });
    return vars;
}

export function generateCodeFromGraph(nodes: FlowNode[], edges: Edge[]): string {
    const lines: string[] = [
        "import { test, expect } from '@playwright/test';",
        "import * as fs from 'fs';", // Needed for Data Node
        "import { parse as parseCsvSync } from 'csv-parse/sync'; // Needed for CSV",
        "",
        "test('generated flow', async ({ page, context }) => {",
    ];

    // Find Start Node
    const startNode = nodes.find((n) => n.type === 'start');
    if (!startNode) {
        console.warn('Code Generator: No Start Node found in nodes', nodes.map(n => ({ id: n.id, type: n.type })));
        return "// No Start Node found";
    }

    console.log('Code Generator: Starting traversal from node', startNode.id);

    // Hoist Variable Declarations
    const allVars = collectVariables(nodes);
    if (allVars.size > 0) {
        lines.push(`  // Hoisted variables`);
        lines.push(`  let ${Array.from(allVars).join(', ')};`);
        lines.push(``);
    }

    // Helper to add indented code
    const addLine = (code: string, indent: number = 1) => {
        lines.push('  '.repeat(indent) + code);
    };

    // Find standalone Set Variable nodes (not connected to the flow)
    // These are nodes that have no incoming edges - process them first as initializations
    const connectedNodeIds = new Set<string>();
    edges.forEach(edge => {
        connectedNodeIds.add(edge.target);
    });
    // Also add start node as it's the entry point
    connectedNodeIds.add(startNode.id);

    const standaloneSetVars = nodes.filter(n => {
        const data = n.data as any;
        return data.actionType === 'set-variable' && !connectedNodeIds.has(n.id);
    });

    // Process standalone Set Variable nodes first (global/initialization variables)
    if (standaloneSetVars.length > 0) {
        addLine('// Global/Initialization Variables', 1);
        for (const node of standaloneSetVars) {
            const data = node.data as any;
            const varName = data.name || 'variable';
            let value = '';
            switch (data.valueType) {
                case 'string':
                    value = `'${data.value || ''}'`;
                    break;
                case 'number':
                    value = data.value || '0';
                    break;
                case 'boolean':
                    value = data.boolValue ? 'true' : 'false';
                    break;
                case 'json':
                    value = data.jsonValue || '{}';
                    break;
                case 'expression':
                    value = data.expression || '""';
                    break;
                default:
                    value = `'${data.value || ''}'`;
            }
            addLine(`${varName} = ${value};`, 1);
        }
        addLine('', 1);
    }

    // Track visited nodes - but allow convergence from different branches
    const visited = new Set<string>();
    // Mark standalone set-variable nodes as already processed
    standaloneSetVars.forEach(n => visited.add(n.id));

    // Traverse and generate code
    traverseNodes(startNode, nodes, edges, addLine, new Set(), visited);

    lines.push("});");
    return lines.join('\n');
}

function traverseNodes(
    currentNode: FlowNode,
    allNodes: FlowNode[],
    edges: Edge[],
    addLine: (code: string, indent?: number) => void,
    variables: Set<string>, // Kept for signature compatibility but unused for scope now
    visited = new Set<string>(),
    indent = 1
): void {
    if (visited.has(currentNode.id)) {
        addLine("// Loop detected (or node visited), stopping generation", indent);
        return;
    }
    visited.add(currentNode.id);

    // Get code without re-declaring variables
    const code = getNodeCode(currentNode, allNodes, edges, addLine, variables, visited, indent);
    console.log(`Code Generator: Visiting node ${currentNode.id} (type: ${currentNode.type}, action: ${currentNode.data.actionType})`, { hasCode: !!code });

    // ... rest of traverseNodes ...
    // [CONTINUES IN ORIGINAL CODE] need to match the rest of existing file or replace carefully
    // For control flow nodes that handle their own traversal
    if (isControlFlowNode(currentNode)) {
        return;
    }

    if (code) addLine(code, indent);

    // Always find and traverse to the next node
    const outEdge = edges.find((e) => e.source === currentNode.id);
    if (outEdge) {
        const nextNode = allNodes.find((n) => n.id === outEdge.target);
        if (nextNode) {
            traverseNodes(nextNode, allNodes, edges, addLine, variables, visited, indent);
        }
    }
}

function isControlFlowNode(node: FlowNode): boolean {
    const controlTypes = ['if', 'decision', 'for-loop', 'for-each', 'while-loop', 'try-catch', 'group', 'data'];
    return controlTypes.includes(node.data.actionType || '');
}



function getNodeCode(
    node: FlowNode,
    allNodes: FlowNode[],
    edges: Edge[],
    addLine: (code: string, indent?: number) => void,
    variables: Set<string>,
    visited: Set<string>,
    indent: number
): string | null {
    const { actionType, ...rest } = node.data;
    // Cast to Record<string, any> to allow flexible property access
    const data = rest as Record<string, any>;

    // Get the full locator expression for actions using the global helper
    const getLocator = (): string => {
        let strategy = data.locatorStrategy || 'css';
        const selector = data.selector || '';

        // Auto-detect role strategy if it looks like a role selector but strategy is CSS
        // This handles cases where data might be missing strategy or manually entered
        if (strategy === 'css' && parseRoleSelectorStatic(selector)) {
            strategy = 'role';
        }

        return generateLocatorCode(selector, strategy);
    };

    // Alias for generating locator code with custom selector/strategy
    const getLocatorCode = (selector: string, strategy: string): string => {
        return generateLocatorCode(selector, strategy);
    };

    const interpolateVars = (str: string) => {
        return str.replace(/\$\{(\w+)\}/g, '${$1}');
    };

    switch (actionType) {
        case 'start':
        case 'end':
            return null;

        // ============================================
        // BROWSER
        // ============================================
        case 'launch-browser':
            return `// Browser launched automatically by Playwright`;

        case 'new-page':
            return `const newPage = await context.newPage();`;

        case 'close-page':
            return `await page.close();`;

        case 'switch-tab':
            return `// Switch to tab index ${data.tabIndex || 0}`;

        // ============================================
        // NAVIGATION
        // ============================================
        case 'navigate': {
            const url = data.url || 'https://example.com';
            const options: string[] = [];
            if (data.waitUntil && data.waitUntil !== 'load') {
                options.push(`waitUntil: '${data.waitUntil}'`);
            }
            if (data.timeout && data.timeout !== 30000) {
                options.push(`timeout: ${data.timeout}`);
            }
            if (data.referer) {
                options.push(`referer: '${data.referer}'`);
            }
            if (options.length > 0) {
                return `await page.goto('${url}', { ${options.join(', ')} });`;
            }
            return `await page.goto('${url}');`;
        }
        case 'go-back': {
            if (data.waitUntil && data.waitUntil !== 'load') {
                return `await page.goBack({ waitUntil: '${data.waitUntil}' });`;
            }
            return `await page.goBack();`;
        }
        case 'go-forward': {
            if (data.waitUntil && data.waitUntil !== 'load') {
                return `await page.goForward({ waitUntil: '${data.waitUntil}' });`;
            }
            return `await page.goForward();`;
        }
        case 'reload': {
            if (data.waitUntil && data.waitUntil !== 'load') {
                return `await page.reload({ waitUntil: '${data.waitUntil}' });`;
            }
            return `await page.reload();`;
        }

        // ============================================
        // MOUSE ACTIONS
        // ============================================
        case 'click':
            return `await ${getLocator()}.click();`;
        case 'double-click':
            return `await ${getLocator()}.dblclick();`;
        case 'right-click':
            return `await ${getLocator()}.click({ button: 'right' });`;
        case 'hover':
            return `await ${getLocator()}.hover();`;
        case 'drag-and-drop':
            return `await ${getLocator()}.dragTo(${getLocatorCode(data.targetSelector || '', 'css')});`;

        // ============================================
        // INPUT ACTIONS
        // ============================================
        case 'fill':
            return `await ${getLocator()}.fill('${interpolateVars(data.value || '')}');`;
        case 'type':
            return `await ${getLocator()}.pressSequentially('${interpolateVars(data.text || '')}', { delay: ${data.delay || 0} });`;
        case 'clear':
            return `await ${getLocator()}.clear();`;
        case 'press-key':
            return `await page.keyboard.press('${data.key || 'Enter'}');`;
        case 'check':
            return `await ${getLocator()}.check();`;
        case 'uncheck':
            return `await ${getLocator()}.uncheck();`;
        case 'select-option':
            return `await ${getLocator()}.selectOption('${data.optionValue}');`;
        case 'upload-file':
            return `await ${getLocator()}.setInputFiles('${data.filePath}');`;

        // ============================================
        // ASSERTIONS
        // ============================================
        case 'assert-visible':
            return `await expect(${getLocator()}).toBeVisible();`;
        case 'assert-hidden':
            return `await expect(${getLocator()}).toBeHidden();`;
        case 'assert-text':
            return data.matchType === 'exact'
                ? `await expect(${getLocator()}).toHaveText('${data.expectedText}');`
                : `await expect(${getLocator()}).toContainText('${data.expectedText}');`;
        case 'assert-value':
            return `await expect(${getLocator()}).toHaveValue('${data.expectedValue}');`;
        case 'assert-attribute':
            return `await expect(${getLocator()}).toHaveAttribute('${data.attribute}', '${data.expectedValue}');`;
        case 'assert-count':
            return `await expect(${getLocator()}).toHaveCount(${data.expectedCount});`;
        case 'assert-url':
            return `await expect(page).toHaveURL('${data.expectedUrl}');`;
        case 'assert-title':
            return `await expect(page).toHaveTitle('${data.expectedTitle}');`;
        case 'assert-enabled':
            return `await expect(${getLocator()}).toBeEnabled();`;
        case 'assert-disabled':
            return `await expect(${getLocator()}).toBeDisabled();`;
        case 'assert-checked':
            return `await expect(${getLocator()}).toBeChecked();`;

        // ============================================
        // WAITS
        // ============================================
        case 'wait-time':
            return `await page.waitForTimeout(${data.duration || 1000});`;
        case 'wait-for-element':
            return `await ${getLocator()}.waitFor({ state: '${data.state || 'visible'}' });`;
        case 'wait-for-url':
            return `await page.waitForURL('${data.url}');`;
        case 'wait-for-load-state':
            return `await page.waitForLoadState('${data.state || 'load'}');`;
        case 'wait-for-response':
            return `await page.waitForResponse('${data.urlPattern}');`;
        case 'wait-for-function':
            return `await page.waitForFunction(${data.expression});`;

        // ============================================
        // CONTROL FLOW
        // ============================================
        case 'if': {
            const condition = generateCondition(data);
            addLine(`if (${condition}) {`, indent);

            // Find children (nodes connected via "true" edge)
            const trueEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'true');
            if (trueEdge) {
                const childNode = allNodes.find(n => n.id === trueEdge.target);
                if (childNode) {
                    traverseNodes(childNode, allNodes, edges, addLine, variables, new Set(visited), indent + 1);
                }
            }

            // Find else branch
            const falseEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'false');
            if (falseEdge) {
                addLine(`} else {`, indent);
                const elseNode = allNodes.find(n => n.id === falseEdge.target);
                if (elseNode) {
                    traverseNodes(elseNode, allNodes, edges, addLine, variables, new Set(visited), indent + 1);
                }
            }

            addLine(`}`, indent);

            // Find next node after if/else
            const nextEdge = edges.find(e => e.source === node.id && !e.sourceHandle);
            if (nextEdge) {
                const nextNode = allNodes.find(n => n.id === nextEdge.target);
                if (nextNode) {
                    traverseNodes(nextNode, allNodes, edges, addLine, variables, visited, indent);
                }
            }
            return null;
        }

        case 'for-loop': {
            const count = data.count || 5;
            const indexVar = data.indexVariable || 'i';
            variables.add(indexVar);

            addLine(`for (${indexVar} = 0; ${indexVar} < ${count}; ${indexVar}++) {`, indent);

            // Traverse Loop Body (handle id="loop-body")
            const childEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'loop-body');
            if (childEdge) {
                const childNode = allNodes.find(n => n.id === childEdge.target);
                if (childNode) {
                    traverseNodes(childNode, allNodes, edges, addLine, variables, new Set(visited), indent + 1);
                }
            }

            addLine(`}`, indent);

            // Traverse "Next" Node (after the loop)
            // Look for edge with id="next" (explicit) or no handle (default)
            const nextEdge = edges.find(e => e.source === node.id && (e.sourceHandle === 'next' || !e.sourceHandle));
            if (nextEdge) {
                const nextNode = allNodes.find(n => n.id === nextEdge.target);
                if (nextNode) {
                    traverseNodes(nextNode, allNodes, edges, addLine, variables, visited, indent);
                }
            }
            return null;
        }

        case 'for-each': {
            const itemVar = data.itemVariable || 'item';
            const indexVar = data.indexVariable || 'index';
            variables.add(itemVar);
            variables.add(indexVar);

            if (data.collectionType === 'elements') {
                addLine(`const elements = await ${getLocator()}.all();`, indent);
                addLine(`for ([${indexVar}, ${itemVar}] of elements.entries()) {`, indent);
            } else {
                addLine(`for ([${indexVar}, ${itemVar}] of ${data.collectionVariable}.entries()) {`, indent);
            }

            // Traverse Loop Body (handle id="loop-body")
            const childEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'loop-body');
            if (childEdge) {
                const childNode = allNodes.find(n => n.id === childEdge.target);
                if (childNode) {
                    traverseNodes(childNode, allNodes, edges, addLine, variables, new Set(visited), indent + 1);
                }
            }

            addLine(`}`, indent);

            // Traverse "Next" Node (after the loop)
            const nextEdge = edges.find(e => e.source === node.id && (e.sourceHandle === 'next' || !e.sourceHandle));
            if (nextEdge) {
                const nextNode = allNodes.find(n => n.id === nextEdge.target);
                if (nextNode) {
                    traverseNodes(nextNode, allNodes, edges, addLine, variables, visited, indent);
                }
            }
            return null;
        }

        case 'while-loop': {
            const condition = generateCondition(data);
            const maxIterations = data.maxIterations || 100;

            addLine(`let _whileCounter = 0;`, indent);
            addLine(`while (${condition} && _whileCounter < ${maxIterations}) {`, indent);
            addLine(`_whileCounter++;`, indent + 1);

            // Traverse Loop Body (handle id="loop-body")
            const childEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'loop-body');
            if (childEdge) {
                const childNode = allNodes.find(n => n.id === childEdge.target);
                if (childNode) {
                    traverseNodes(childNode, allNodes, edges, addLine, variables, new Set(visited), indent + 1);
                }
            }

            addLine(`}`, indent);

            // Traverse "Next" Node (after the loop)
            const nextEdge = edges.find(e => e.source === node.id && (e.sourceHandle === 'next' || !e.sourceHandle));
            if (nextEdge) {
                const nextNode = allNodes.find(n => n.id === nextEdge.target);
                if (nextNode) {
                    traverseNodes(nextNode, allNodes, edges, addLine, variables, visited, indent);
                }
            }
            return null;
        }

        case 'break':
            return `break;`;

        case 'continue':
            return `continue;`;

        case 'pass':
            return data.message
                ? `console.log('✅ PASS: ${data.message}'); return;`
                : `console.log('✅ PASS'); return;`;

        case 'fail':
            return `throw new Error('❌ FAIL: ${data.message || 'Test failed'}');`;

        case 'try-catch': {
            const errorVar = data.errorVariable || 'error';
            variables.add(errorVar);

            addLine(`try {`, indent);

            // Try block
            const tryEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'try');
            if (tryEdge) {
                const tryNode = allNodes.find(n => n.id === tryEdge.target);
                if (tryNode) {
                    traverseNodes(tryNode, allNodes, edges, addLine, variables, new Set(visited), indent + 1);
                }
            }

            addLine(`} catch (${errorVar}) {`, indent);

            // Catch block
            const catchEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'catch');
            if (catchEdge) {
                const catchNode = allNodes.find(n => n.id === catchEdge.target);
                if (catchNode) {
                    traverseNodes(catchNode, allNodes, edges, addLine, variables, new Set(visited), indent + 1);
                }
            }

            addLine(`}`, indent);

            // Traverse "Next" Node (after try/catch block)
            const nextEdge = edges.find(e => e.source === node.id && !e.sourceHandle);
            if (nextEdge) {
                const nextNode = allNodes.find(n => n.id === nextEdge.target);
                if (nextNode) {
                    traverseNodes(nextNode, allNodes, edges, addLine, variables, visited, indent);
                }
            }
            return null;
        }

        case 'group': {
            addLine(`// Group: ${data.name || 'Unnamed'}`, indent);
            const childEdge = edges.find(e => e.source === node.id);
            if (childEdge) {
                const childNode = allNodes.find(n => n.id === childEdge.target);
                if (childNode) {
                    traverseNodes(childNode, allNodes, edges, addLine, variables, visited, indent);
                }
            }
            return null;
        }

        // ============================================
        // DATA & VARIABLES
        // ============================================
        case 'set-variable': {
            const varName = data.name || 'variable';
            variables.add(varName);

            let value = '';
            switch (data.valueType) {
                case 'string':
                    value = `'${data.value || ''}'`;
                    break;
                case 'number':
                    value = data.value || '0';
                    break;
                case 'boolean':
                    value = data.boolValue ? 'true' : 'false';
                    break;
                case 'json':
                    value = data.jsonValue || '{}';
                    break;
                case 'expression':
                    value = data.expression || '""';
                    break;
                default:
                    value = `'${data.value || ''}'`;
            }

            return `${varName} = ${value};`;
        }

        case 'get-text': {
            const varName = data.variable || 'text';
            variables.add(varName);
            const trim = data.trim ? '.trim()' : '';
            return `${varName} = (await ${getLocator()}.textContent())${trim};`;
        }

        case 'get-attribute': {
            const varName = data.variable || 'attributeValue';
            variables.add(varName);
            return `${varName} = await ${getLocator()}.getAttribute('${data.attribute}');`;
        }

        case 'get-value': {
            const varName = data.variable || 'value';
            variables.add(varName);
            return `${varName} = await ${getLocator()}.inputValue();`;
        }

        case 'get-url': {
            const varName = data.variable || 'currentUrl';
            variables.add(varName);
            return `${varName} = page.url();`;
        }

        case 'get-title': {
            const varName = data.variable || 'pageTitle';
            variables.add(varName);
            return `${varName} = await page.title();`;
        }

        case 'get-element-count': {
            const varName = data.variable || 'count';
            variables.add(varName);
            return `${varName} = await ${getLocator()}.count();`;
        }

        case 'log':
            return `console.${data.level || 'info'}('${interpolateVars(data.message || '')}');`;

        case 'screenshot': {
            const name = data.name || 'screenshot';
            if (data.type === 'element') {
                return `await ${getLocator()}.screenshot({ path: '${name}.png' });`;
            }
            return `await page.screenshot({ path: '${name}.png', fullPage: ${data.fullPage || false} });`;
        }

        // ============================================
        // EXTRACTION (Runtime Variables)
        // ============================================
        case 'extract': {
            const varName = data.storeAs || 'extractedValue';
            variables.add(varName);

            const attr = data.attribute === 'custom' ? data.customAttribute : data.attribute;
            let extractCall: string;

            switch (attr) {
                case 'textContent':
                    extractCall = `await ${getLocator()}.textContent()`;
                    break;
                case 'innerText':
                    extractCall = `await ${getLocator()}.innerText()`;
                    break;
                case 'value':
                    extractCall = `await ${getLocator()}.inputValue()`;
                    break;
                default:
                    extractCall = `await ${getLocator()}.getAttribute('${attr}')`;
            }

            // Handle transforms
            const transform = data.transform || 'none';
            let code = `${varName} = ${extractCall};`;

            switch (transform) {
                case 'trim':
                    code += `\n  if (${varName}) ${varName} = ${varName}.trim();`;
                    break;
                case 'number':
                    code += `\n  ${varName} = Number(${varName}) || 0;`;
                    break;
                case 'boolean':
                    code += `\n  ${varName} = Boolean(${varName} && ${varName}.toLowerCase() !== 'false' && ${varName} !== '0');`;
                    break;
                case 'json':
                    code += `\n  try { ${varName} = JSON.parse(${varName}); } catch (e) { /* keep as string */ }`;
                    break;
                case 'uppercase':
                    code += `\n  if (${varName}) ${varName} = ${varName}.toUpperCase();`;
                    break;
                case 'lowercase':
                    code += `\n  if (${varName}) ${varName} = ${varName}.toLowerCase();`;
                    break;
                case 'regex':
                    if (data.regex) {
                        const group = data.regexGroup ?? 0;
                        code += `\n  { const match = ${varName}?.match(/${data.regex}/); ${varName} = match ? match[${group}] : null; }`;
                    }
                    break;
            }

            // Handle default value
            if (data.defaultValue !== undefined && data.defaultValue !== '') {
                code = `try {\n  ${code}\n} catch (e) {\n  ${varName} = ${JSON.stringify(data.defaultValue)};\n}`;
            }

            return code;
        }

        // ============================================
        // ADVANCED
        // ============================================
        case 'run-javascript': {
            const code = data.code || '() => {}';
            if (data.returnVariable) {
                variables.add(data.returnVariable);
                return `${data.returnVariable} = await page.evaluate(${code});`;
            }
            return `await page.evaluate(${code});`;
        }

        case 'handle-dialog':
            return `page.once('dialog', dialog => dialog.${data.action || 'accept'}());`;

        case 'evaluate-expression': {
            const varName = data.variable || 'result';
            variables.add(varName);
            return `${varName} = ${interpolateVars(data.expression || '0')};`;
        }

        case 'comment':
            return `// ${data.text || ''}`;

        case 'sub-flow': {
            const flowId = data.flowId || 'unknownFlow';
            const inputs = data.inputs || [];
            const params = inputs
                .map((input: { name: string; val: any }) => `${input.name}: '${input.val || ''}'`)
                .join(', ');
            return `await ${flowId}Flow(page, { ${params} }); // Sub-Flow`;
        }

        case 'subflow': {
            const flowId = data.flowId || 'unknownFlow';
            const inputs = data.inputs || [];
            const params = inputs
                .map((input: { name: string; val: any }) => `${input.name}: '${input.val || ''}'`)
                .join(', ');
            return `await ${flowId}Flow(page, { ${params} }); // Sub-Flow`;
        }

        // ============================================
        // DECISION NODE (Diamond)
        // ============================================
        case 'decision': {
            const condition = data.condition || 'true';
            addLine(`if (${condition}) {`, indent);

            // Find true path (yes handle)
            const trueEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'true');
            if (trueEdge) {
                const childNode = allNodes.find(n => n.id === trueEdge.target);
                if (childNode) {
                    traverseNodes(childNode, allNodes, edges, addLine, variables, new Set(visited), indent + 1);
                }
            }

            // Find false path (no handle)
            const falseEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'false');
            if (falseEdge) {
                addLine(`} else {`, indent);
                const elseNode = allNodes.find(n => n.id === falseEdge.target);
                if (elseNode) {
                    traverseNodes(elseNode, allNodes, edges, addLine, variables, new Set(visited), indent + 1);
                }
            }

            addLine(`}`, indent);
            return null;
        }

        // ============================================
        // DATA SOURCE NODE
        // ============================================
        case 'data': {
            const sourceType = data.sourceType || 'csv';
            const sourcePath = data.sourcePath || 'data.csv';
            const itemVar = 'row';
            variables.add(itemVar);

            if (sourceType === 'csv') {
                addLine(`// Load CSV data`, indent);
                addLine(`const csvData = parseCsvSync(fs.readFileSync('${sourcePath}', 'utf-8'));`, indent);
                addLine(`for (const ${itemVar} of csvData) {`, indent);
            } else if (sourceType === 'json') {
                addLine(`// Load JSON data`, indent);
                addLine(`const jsonData = JSON.parse(fs.readFileSync('${sourcePath}', 'utf-8'));`, indent);
                addLine(`for (const ${itemVar} of jsonData) {`, indent);
            } else {
                addLine(`// Unknown data source: ${sourceType}`, indent);
                addLine(`const ${itemVar} = {};`, indent);
            }

            // Traverse children inside the loop (handle id="list")
            const childEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'list');
            if (childEdge) {
                const childNode = allNodes.find(n => n.id === childEdge.target);
                if (childNode) {
                    traverseNodes(childNode, allNodes, edges, addLine, variables, new Set(visited), indent + 1);
                }
            }

            if (sourceType === 'csv' || sourceType === 'json') {
                addLine(`}`, indent);
            }

            // Traverse "Next" Node (after the data loop)
            const nextEdge = edges.find(e => e.source === node.id && (e.sourceHandle === 'next' || !e.sourceHandle));
            if (nextEdge) {
                const nextNode = allNodes.find(n => n.id === nextEdge.target);
                if (nextNode) {
                    traverseNodes(nextNode, allNodes, edges, addLine, variables, visited, indent);
                }
            }
            return null;
        }

        default:
            return `// TODO: Implement ${actionType}`;
    }
}

function generateCondition(data: any): string {
    if (data.conditionType === 'expression') {
        return data.expression || 'true';
    }

    if (data.conditionType === 'element') {
        const selector = data.selector || '';
        const condition = data.elementCondition || 'visible';
        const locator = generateLocatorCode(selector, data.locatorStrategy || 'css');

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
                return `await ${locator}.count() > 0`;
            default:
                return 'true';
        }
    }

    if (data.conditionType === 'variable') {
        const varName = data.variableName || 'variable';
        const operator = data.operator || 'equals';
        const compareValue = data.compareValue || '';

        switch (operator) {
            case 'equals':
                return `${varName} === '${compareValue}'`;
            case 'notEquals':
                return `${varName} !== '${compareValue}'`;
            case 'contains':
                return `${varName}.includes('${compareValue}')`;
            case 'greaterThan':
                return `${varName} > ${compareValue}`;
            case 'lessThan':
                return `${varName} < ${compareValue}`;
            case 'greaterOrEqual':
                return `${varName} >= ${compareValue}`;
            case 'lessOrEqual':
                return `${varName} <= ${compareValue}`;
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

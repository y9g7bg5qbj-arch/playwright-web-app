/**
 * Control Flow Node Generators
 * Generate Playwright code for if/else, loops, try/catch
 */

import type { FlowNode, GeneratorContext, NodeGenerator } from '@playwright-web-app/shared';
import { buildLocatorCode } from '../locatorBuilder';
import { formatValue } from '../variableInterpolation';

/**
 * Build condition code for if/while statements
 */
export function buildConditionCode(data: Record<string, any>): string {
    const {
        conditionType,
        locatorStrategy,
        selector,
        elementCondition,
        variableName,
        operator,
        compareValue,
        expression
    } = data;

    switch (conditionType) {
        case 'element':
            const locator = buildLocatorCode({ locatorStrategy, selector });
            switch (elementCondition) {
                case 'visible':
                    return `await ${locator}.isVisible()`;
                case 'hidden':
                    return `!(await ${locator}.isVisible())`;
                case 'enabled':
                    return `await ${locator}.isEnabled()`;
                case 'disabled':
                    return `!(await ${locator}.isEnabled())`;
                case 'checked':
                    return `await ${locator}.isChecked()`;
                case 'exists':
                    return `(await ${locator}.count()) > 0`;
                default:
                    return `await ${locator}.isVisible()`;
            }

        case 'variable':
            const varRef = variableName;
            const val = formatValue(compareValue);
            switch (operator) {
                case 'equals':
                    return `${varRef} === ${val}`;
                case 'notEquals':
                    return `${varRef} !== ${val}`;
                case 'contains':
                    return `String(${varRef}).includes(${val})`;
                case 'startsWith':
                    return `String(${varRef}).startsWith(${val})`;
                case 'endsWith':
                    return `String(${varRef}).endsWith(${val})`;
                case 'greaterThan':
                    return `${varRef} > ${compareValue}`;
                case 'lessThan':
                    return `${varRef} < ${compareValue}`;
                case 'greaterOrEqual':
                    return `${varRef} >= ${compareValue}`;
                case 'lessOrEqual':
                    return `${varRef} <= ${compareValue}`;
                case 'isEmpty':
                    return `!${varRef} || ${varRef}.length === 0`;
                case 'isNotEmpty':
                    return `${varRef} && ${varRef}.length > 0`;
                case 'isTrue':
                    return `${varRef} === true`;
                case 'isFalse':
                    return `${varRef} === false`;
                default:
                    return `${varRef} === ${val}`;
            }

        case 'expression':
            return expression || 'true';

        default:
            return 'true';
    }
}

/**
 * If Condition
 * { type: "if", data: { conditionType: "element", selector: ".premium", elementCondition: "visible" } }
 * → if (await page.locator('.premium').isVisible()) {
 */
export class IfGenerator implements NodeGenerator {
    isBlockStart = true;

    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const condition = buildConditionCode(node.data);
        return [`if (${condition}) {`];
    }
}

/**
 * Else
 * { type: "else", data: {} }
 * → } else {
 */
export class ElseGenerator implements NodeGenerator {
    generate(_node: FlowNode, _ctx: GeneratorContext): string[] {
        return [`} else {`];
    }
}

/**
 * For Loop (Count)
 * { type: "for-loop", data: { count: 5, indexVariable: "i" } }
 * → for (let i = 0; i < 5; i++) {
 */
export class ForLoopGenerator implements NodeGenerator {
    isBlockStart = true;

    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { count, indexVariable } = node.data;
        const varName = indexVariable || 'i';
        ctx.variables.set(varName, 'number');
        return [`for (let ${varName} = 0; ${varName} < ${count || 1}; ${varName}++) {`];
    }
}

/**
 * For Each Loop
 * { type: "for-each", data: { collectionType: "variable", collectionVariable: "users", itemVariable: "user" } }
 * → for (const user of users) {
 * 
 * OR for elements:
 * { type: "for-each", data: { collectionType: "elements", selector: ".item", itemVariable: "element" } }
 * → const elements = await page.locator('.item').all();
 * → for (const element of elements) {
 */
export class ForEachGenerator implements NodeGenerator {
    isBlockStart = true;

    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { collectionType, collectionVariable, itemVariable, indexVariable } = node.data;
        const item = itemVariable || 'item';
        ctx.variables.set(item, 'any');

        if (collectionType === 'elements') {
            const locator = buildLocatorCode(node.data);
            if (indexVariable) {
                ctx.variables.set(indexVariable, 'number');
                return [
                    `const elements = await ${locator}.all();`,
                    `for (let ${indexVariable} = 0; ${indexVariable} < elements.length; ${indexVariable}++) {`,
                    `  const ${item} = elements[${indexVariable}];`
                ];
            }
            return [
                `const elements = await ${locator}.all();`,
                `for (const ${item} of elements) {`
            ];
        }

        // Variable collection
        if (indexVariable) {
            ctx.variables.set(indexVariable, 'number');
            return [`for (const [${indexVariable}, ${item}] of ${collectionVariable}.entries()) {`];
        }
        return [`for (const ${item} of ${collectionVariable}) {`];
    }
}

/**
 * While Loop
 * { type: "while-loop", data: { conditionType: "variable", variableName: "count", operator: "lessThan", compareValue: "10", maxIterations: 100 } }
 * → let _iteration = 0;
 * → while (count < 10 && _iteration < 100) {
 * →   _iteration++;
 */
export class WhileLoopGenerator implements NodeGenerator {
    isBlockStart = true;

    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { maxIterations } = node.data;
        const condition = buildConditionCode(node.data);
        const safetyVar = `_iteration_${ctx.indent}`;

        return [
            `let ${safetyVar} = 0;`,
            `while ((${condition}) && ${safetyVar} < ${maxIterations || 100}) {`,
            `  ${safetyVar}++;`
        ];
    }
}

/**
 * Try-Catch
 * { type: "try-catch", data: { errorVariable: "error" } }
 * → try {
 */
export class TryCatchGenerator implements NodeGenerator {
    isBlockStart = true;

    generate(_node: FlowNode, _ctx: GeneratorContext): string[] {
        return [`try {`];
    }
}

/**
 * Catch Block (generated during traversal when encountering catch edge)
 */
export class CatchGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const errorVar = node.data?.errorVariable || 'error';
        ctx.variables.set(errorVar, 'Error');
        return [`} catch (${errorVar}) {`];
    }
}

/**
 * Finally Block (generated during traversal when encountering finally edge)
 */
export class FinallyGenerator implements NodeGenerator {
    generate(_node: FlowNode, _ctx: GeneratorContext): string[] {
        return [`} finally {`];
    }
}

/**
 * Break
 * { type: "break", data: {} }
 * → break;
 */
export class BreakGenerator implements NodeGenerator {
    generate(_node: FlowNode, _ctx: GeneratorContext): string[] {
        return ['break;'];
    }
}

/**
 * Continue
 * { type: "continue", data: {} }
 * → continue;
 */
export class ContinueGenerator implements NodeGenerator {
    generate(_node: FlowNode, _ctx: GeneratorContext): string[] {
        return ['continue;'];
    }
}

/**
 * Pass (Mark test as passed)
 * { type: "pass", data: { message: "Test passed" } }
 * → // Test passed: Test passed
 * → return;
 */
export class PassGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { message } = node.data;
        const lines: string[] = [];
        if (message) {
            lines.push(`// Test passed: ${message}`);
        }
        lines.push('return;');
        return lines;
    }
}

/**
 * Fail (Mark test as failed)
 * { type: "fail", data: { message: "Expected condition failed" } }
 * → throw new Error('Expected condition failed');
 */
export class FailGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { message } = node.data;
        return [`throw new Error('${message || 'Test failed'}');`];
    }
}

/**
 * Group (Logical grouping)
 * { type: "group", data: { name: "Login Steps" } }
 * → // -- Login Steps --
 */
export class GroupGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { name, description } = node.data;
        const lines: string[] = [];

        if (name) {
            lines.push(`// -- ${name} --`);
        }
        if (description) {
            lines.push(`// ${description}`);
        }

        return lines;
    }
}

/**
 * Start Node (Entry point)
 * { type: "start", data: {} }
 * → // No code generated for start node
 */
export class StartGenerator implements NodeGenerator {
    generate(_node: FlowNode, _ctx: GeneratorContext): string[] {
        return []; // No code for start node
    }
}

/**
 * End Node (Exit point)
 * { type: "end", data: {} }
 * → // No code generated for end node
 */
export class EndGenerator implements NodeGenerator {
    generate(_node: FlowNode, _ctx: GeneratorContext): string[] {
        return []; // No code for end node
    }
}

/**
 * Comment
 * { type: "comment", data: { text: "This is a comment" } }
 * → // This is a comment
 */
export class CommentGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { text } = node.data;
        if (!text) return [];

        // Handle multi-line comments
        const lines = text.split('\n');
        return lines.map((line: string) => `// ${line}`);
    }
}

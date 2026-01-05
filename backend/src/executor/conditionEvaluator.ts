/**
 * Condition Evaluator for Control Flow Engine
 * Evaluates conditions for IF/ELSE and WHILE blocks at runtime
 */

import { Page, Locator } from 'playwright';
import {
    ConditionConfig,
    ConditionResult,
    FlowExecutionContext,
    ComparisonOperator,
} from '@playwright-web-app/shared';

/**
 * Generates a Playwright locator from selector and strategy
 */
function getLocator(page: Page, selector: string, strategy: string = 'css'): Locator {
    if (!selector) {
        return page.locator('body'); // Fallback
    }

    switch (strategy) {
        case 'xpath':
            return page.locator(`xpath=${selector}`);
        case 'text':
            return page.getByText(selector);
        case 'text-exact':
            return page.getByText(selector, { exact: true });
        case 'role':
            return page.getByRole(selector as any);
        case 'test-id':
            return page.getByTestId(selector);
        case 'label':
            return page.getByLabel(selector);
        case 'placeholder':
            return page.getByPlaceholder(selector);
        case 'css':
        default:
            return page.locator(selector);
    }
}

/**
 * Evaluates conditions for control flow blocks
 */
export class ConditionEvaluator {
    constructor(
        private page: Page,
        private context: FlowExecutionContext
    ) { }

    /**
     * Evaluate a condition and return the boolean result
     */
    async evaluate(conditionData: Record<string, any>): Promise<ConditionResult> {
        try {
            const conditionType = conditionData.conditionType || 'expression';
            let value: boolean;

            switch (conditionType) {
                case 'element':
                    value = await this.evaluateElementCondition(conditionData);
                    break;
                case 'variable':
                    value = this.evaluateVariableCondition(conditionData);
                    break;
                case 'expression':
                    value = await this.evaluateExpression(conditionData);
                    break;
                default:
                    value = true;
            }

            return { success: true, value };
        } catch (error: any) {
            return {
                success: false,
                value: false,
                error: error.message,
            };
        }
    }

    /**
     * Evaluate element-based conditions
     */
    private async evaluateElementCondition(data: Record<string, any>): Promise<boolean> {
        const selector = data.selector || '';
        const strategy = data.locatorStrategy || 'css';
        const condition = data.elementCondition || 'visible';

        if (!selector) {
            throw new Error('Element condition requires a selector');
        }

        const locator = getLocator(this.page, selector, strategy);

        switch (condition) {
            case 'visible':
                return await locator.isVisible();

            case 'hidden':
                return await locator.isHidden();

            case 'enabled':
                return await locator.isEnabled();

            case 'disabled':
                return await locator.isDisabled();

            case 'checked':
                return await locator.isChecked();

            case 'exists':
                return (await locator.count()) > 0;

            default:
                return true;
        }
    }

    /**
     * Evaluate variable-based conditions
     */
    private evaluateVariableCondition(data: Record<string, any>): boolean {
        const varName = data.variableName || '';
        const operator = (data.operator || 'equals') as ComparisonOperator;
        const compareValue = data.compareValue ?? '';

        const varValue = this.context.variables[varName];

        switch (operator) {
            case 'equals':
                // Loose equality to handle type coercion
                return varValue == compareValue;

            case 'notEquals':
                return varValue != compareValue;

            case 'contains':
                return String(varValue).includes(String(compareValue));

            case 'startsWith':
                return String(varValue).startsWith(String(compareValue));

            case 'endsWith':
                return String(varValue).endsWith(String(compareValue));

            case 'greaterThan':
                return Number(varValue) > Number(compareValue);

            case 'lessThan':
                return Number(varValue) < Number(compareValue);

            case 'greaterOrEqual':
                return Number(varValue) >= Number(compareValue);

            case 'lessOrEqual':
                return Number(varValue) <= Number(compareValue);

            case 'isEmpty':
                return !varValue || (typeof varValue === 'string' && varValue.length === 0) ||
                    (Array.isArray(varValue) && varValue.length === 0);

            case 'isNotEmpty':
                return !!varValue && (typeof varValue !== 'string' || varValue.length > 0) &&
                    (!Array.isArray(varValue) || varValue.length > 0);

            case 'isTrue':
                return varValue === true || varValue === 'true' || varValue === 1;

            case 'isFalse':
                return varValue === false || varValue === 'false' || varValue === 0;

            default:
                return varValue === compareValue;
        }
    }

    /**
     * Evaluate custom JavaScript expressions
     */
    private async evaluateExpression(data: Record<string, any>): Promise<boolean> {
        const expression = data.expression || 'true';

        try {
            // Create a safe evaluation context
            const evalContext = {
                variables: this.context.variables,
                page: this.page,
            };

            // For simple expressions that don't need page access
            if (!expression.includes('await') && !expression.includes('page.')) {
                const syncFn = new Function('variables', `return (${expression})`);
                return Boolean(syncFn(this.context.variables));
            }

            // For async expressions that need page access
            const asyncFn = new Function(
                'variables',
                'page',
                `return (async () => { return (${expression}); })()`
            );
            const result = await asyncFn(this.context.variables, this.page);
            return Boolean(result);
        } catch (error: any) {
            throw new Error(`Failed to evaluate expression "${expression}": ${error.message}`);
        }
    }

    /**
     * Evaluate text contains condition
     */
    async evaluateTextContains(selector: string, strategy: string, searchText: string): Promise<boolean> {
        const locator = getLocator(this.page, selector, strategy);
        const textContent = await locator.textContent();
        return textContent?.includes(searchText) ?? false;
    }
}

/**
 * Standalone function to evaluate a condition without creating a class instance
 */
export async function evaluateCondition(
    page: Page,
    context: FlowExecutionContext,
    conditionData: Record<string, any>
): Promise<boolean> {
    const evaluator = new ConditionEvaluator(page, context);
    const result = await evaluator.evaluate(conditionData);

    if (!result.success) {
        throw new Error(result.error);
    }

    return result.value;
}

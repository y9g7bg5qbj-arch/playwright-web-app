/**
 * Action Executor
 * Executes individual Playwright actions based on node configuration
 */

import { Page, Locator } from 'playwright';
import { FlowNode, FlowExecutionContext, ActionResult } from '@playwright-web-app/shared';

/**
 * Generates a Playwright locator from node data
 */
function getLocator(page: Page, data: Record<string, any>): Locator {
    const selector = data.selector || '';
    const strategy = data.locatorStrategy || 'css';

    if (!selector) {
        throw new Error('Selector is required for element actions');
    }

    // Check for role-based selector format like "button[name=\"Submit\"]"
    const roleMatch = selector.match(/^(\w+)\[name="([^"]+)"\]$/);
    if (roleMatch) {
        return page.getByRole(roleMatch[1] as any, { name: roleMatch[2] });
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
 * Interpolate variables in strings
 */
function interpolateVariables(str: string, variables: Record<string, any>): string {
    return str.replace(/\$\{(\w+)\}/g, (_, varName) => {
        return variables[varName] !== undefined ? String(variables[varName]) : `\${${varName}}`;
    });
}

/**
 * ActionExecutor class for executing Playwright actions
 */
export class ActionExecutor {
    constructor(
        private page: Page,
        private context: FlowExecutionContext
    ) { }

    /**
     * Execute an action node
     */
    async execute(node: FlowNode): Promise<ActionResult> {
        const startTime = Date.now();
        const actionType = node.data.actionType || node.type || '';
        const data = node.data;

        try {
            switch (actionType) {
                // Navigation
                case 'navigate':
                    await this.executeNavigate(data);
                    break;
                case 'go-back':
                    await this.page.goBack();
                    break;
                case 'go-forward':
                    await this.page.goForward();
                    break;
                case 'reload':
                    await this.page.reload();
                    break;

                // Mouse Actions
                case 'click':
                    await this.executeClick(data);
                    break;
                case 'double-click':
                    await this.executeDoubleClick(data);
                    break;
                case 'right-click':
                    await this.executeRightClick(data);
                    break;
                case 'hover':
                    await this.executeHover(data);
                    break;

                // Input Actions
                case 'fill':
                    await this.executeFill(data);
                    break;
                case 'type':
                    await this.executeType(data);
                    break;
                case 'clear':
                    await this.executeClear(data);
                    break;
                case 'press-key':
                    await this.executePressKey(data);
                    break;
                case 'check':
                    await this.executeCheck(data);
                    break;
                case 'uncheck':
                    await this.executeUncheck(data);
                    break;
                case 'select-option':
                    await this.executeSelectOption(data);
                    break;

                // Waits
                case 'wait-time':
                    await this.page.waitForTimeout(data.duration || 1000);
                    break;
                case 'wait-for-element':
                    await this.executeWaitForElement(data);
                    break;
                case 'wait-for-url':
                    await this.page.waitForURL(data.url || '**');
                    break;
                case 'wait-for-load-state':
                    await this.page.waitForLoadState(data.state || 'load');
                    break;

                // Assertions
                case 'assert-visible':
                    await this.executeAssertVisible(data);
                    break;
                case 'assert-hidden':
                    await this.executeAssertHidden(data);
                    break;
                case 'assert-text':
                    await this.executeAssertText(data);
                    break;
                case 'assert-value':
                    await this.executeAssertValue(data);
                    break;
                case 'assert-url':
                    await this.executeAssertUrl(data);
                    break;

                // Variables
                case 'set-variable':
                    await this.executeSetVariable(data);
                    break;
                case 'get-text':
                    await this.executeGetText(data);
                    break;
                case 'get-attribute':
                    await this.executeGetAttribute(data);
                    break;
                case 'get-value':
                    await this.executeGetValue(data);
                    break;

                // Advanced
                case 'screenshot':
                    await this.executeScreenshot(data);
                    break;
                case 'log':
                    console.log(interpolateVariables(data.message || '', this.context.variables));
                    break;

                default:
                    // Skip unknown action types
                    console.warn(`Unknown action type: ${actionType}`);
            }

            return {
                success: true,
                duration: Date.now() - startTime,
            };
        } catch (error: any) {
            return {
                success: false,
                duration: Date.now() - startTime,
                error: error.message,
            };
        }
    }

    // ============================================
    // Navigation
    // ============================================

    private async executeNavigate(data: Record<string, any>): Promise<void> {
        const url = interpolateVariables(data.url || '', this.context.variables);
        const options: any = {};

        if (data.waitUntil) options.waitUntil = data.waitUntil;
        if (data.timeout) options.timeout = data.timeout;

        await this.page.goto(url, options);
    }

    // ============================================
    // Mouse Actions
    // ============================================

    private async executeClick(data: Record<string, any>): Promise<void> {
        const locator = getLocator(this.page, data);
        const options: any = {};

        if (data.button) options.button = data.button;
        if (data.clickCount) options.clickCount = data.clickCount;
        if (data.force) options.force = data.force;
        if (data.timeout) options.timeout = data.timeout;

        await locator.click(options);
    }

    private async executeDoubleClick(data: Record<string, any>): Promise<void> {
        const locator = getLocator(this.page, data);
        await locator.dblclick({ force: data.force, timeout: data.timeout });
    }

    private async executeRightClick(data: Record<string, any>): Promise<void> {
        const locator = getLocator(this.page, data);
        await locator.click({ button: 'right', force: data.force, timeout: data.timeout });
    }

    private async executeHover(data: Record<string, any>): Promise<void> {
        const locator = getLocator(this.page, data);
        await locator.hover({ force: data.force, timeout: data.timeout });
    }

    // ============================================
    // Input Actions
    // ============================================

    private async executeFill(data: Record<string, any>): Promise<void> {
        const locator = getLocator(this.page, data);
        const value = interpolateVariables(data.value || '', this.context.variables);
        await locator.fill(value, { force: data.force, timeout: data.timeout });
    }

    private async executeType(data: Record<string, any>): Promise<void> {
        const locator = getLocator(this.page, data);
        const text = interpolateVariables(data.text || '', this.context.variables);
        await locator.pressSequentially(text, { delay: data.delay || 0 });
    }

    private async executeClear(data: Record<string, any>): Promise<void> {
        const locator = getLocator(this.page, data);
        await locator.clear({ timeout: data.timeout });
    }

    private async executePressKey(data: Record<string, any>): Promise<void> {
        const key = data.key === 'custom' ? data.customKey : data.key;
        if (data.useElement && data.selector) {
            const locator = getLocator(this.page, data);
            await locator.press(key);
        } else {
            await this.page.keyboard.press(key);
        }
    }

    private async executeCheck(data: Record<string, any>): Promise<void> {
        const locator = getLocator(this.page, data);
        await locator.check({ force: data.force, timeout: data.timeout });
    }

    private async executeUncheck(data: Record<string, any>): Promise<void> {
        const locator = getLocator(this.page, data);
        await locator.uncheck({ force: data.force, timeout: data.timeout });
    }

    private async executeSelectOption(data: Record<string, any>): Promise<void> {
        const locator = getLocator(this.page, data);
        await locator.selectOption(data.optionValue, { timeout: data.timeout });
    }

    // ============================================
    // Waits
    // ============================================

    private async executeWaitForElement(data: Record<string, any>): Promise<void> {
        const locator = getLocator(this.page, data);
        await locator.waitFor({ state: data.state || 'visible', timeout: data.timeout });
    }

    // ============================================
    // Assertions
    // ============================================

    private async executeAssertVisible(data: Record<string, any>): Promise<void> {
        const locator = getLocator(this.page, data);
        const isVisible = await locator.isVisible();
        if (data.not) {
            if (isVisible) throw new Error('Element is visible but expected to be hidden');
        } else {
            if (!isVisible) throw new Error('Element is not visible');
        }
    }

    private async executeAssertHidden(data: Record<string, any>): Promise<void> {
        const locator = getLocator(this.page, data);
        const isHidden = await locator.isHidden();
        if (!isHidden) throw new Error('Element is not hidden');
    }

    private async executeAssertText(data: Record<string, any>): Promise<void> {
        const locator = getLocator(this.page, data);
        const text = await locator.textContent();
        const expected = interpolateVariables(data.expectedText || '', this.context.variables);

        if (data.matchType === 'exact') {
            if (text !== expected) throw new Error(`Text mismatch: expected "${expected}", got "${text}"`);
        } else {
            if (!text?.includes(expected)) throw new Error(`Text does not contain "${expected}"`);
        }
    }

    private async executeAssertValue(data: Record<string, any>): Promise<void> {
        const locator = getLocator(this.page, data);
        const value = await locator.inputValue();
        const expected = interpolateVariables(data.expectedValue || '', this.context.variables);
        if (value !== expected) throw new Error(`Value mismatch: expected "${expected}", got "${value}"`);
    }

    private async executeAssertUrl(data: Record<string, any>): Promise<void> {
        const url = this.page.url();
        const expected = data.expectedUrl || '';
        if (data.matchType === 'contains') {
            if (!url.includes(expected)) throw new Error(`URL does not contain "${expected}"`);
        } else {
            if (url !== expected) throw new Error(`URL mismatch: expected "${expected}", got "${url}"`);
        }
    }

    // ============================================
    // Variables
    // ============================================

    private async executeSetVariable(data: Record<string, any>): Promise<void> {
        const varName = data.name || 'variable';
        let value: any;

        switch (data.valueType) {
            case 'string':
                value = interpolateVariables(data.value || '', this.context.variables);
                break;
            case 'number':
                value = Number(data.value) || 0;
                break;
            case 'boolean':
                value = data.boolValue || false;
                break;
            case 'json':
                value = JSON.parse(data.jsonValue || '{}');
                break;
            case 'expression':
                value = eval(interpolateVariables(data.expression || '', this.context.variables));
                break;
            default:
                value = data.value;
        }

        this.context.variables[varName] = value;
    }

    private async executeGetText(data: Record<string, any>): Promise<void> {
        const locator = getLocator(this.page, data);
        const text = await locator.textContent();
        this.context.variables[data.variable || 'text'] = data.trim ? text?.trim() : text;
    }

    private async executeGetAttribute(data: Record<string, any>): Promise<void> {
        const locator = getLocator(this.page, data);
        const value = await locator.getAttribute(data.attribute || 'value');
        this.context.variables[data.variable || 'attribute'] = value;
    }

    private async executeGetValue(data: Record<string, any>): Promise<void> {
        const locator = getLocator(this.page, data);
        const value = await locator.inputValue();
        this.context.variables[data.variable || 'value'] = value;
    }

    // ============================================
    // Advanced
    // ============================================

    private async executeScreenshot(data: Record<string, any>): Promise<void> {
        const name = data.name || 'screenshot';
        if (data.type === 'element' && data.selector) {
            const locator = getLocator(this.page, data);
            await locator.screenshot({ path: `${name}.png` });
        } else {
            await this.page.screenshot({ path: `${name}.png`, fullPage: data.fullPage });
        }
    }
}

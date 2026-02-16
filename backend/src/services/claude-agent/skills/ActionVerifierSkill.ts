/**
 * Action Verifier Skill
 *
 * Verifies that actions completed successfully after execution.
 * Runs as a low-priority skill after main action skills.
 */

import { BaseSkill, type ExecutionContext, type SkillDetection, type PrepareResult, type ExecuteResult, type VerifyResult } from '../interfaces';

/** Verification strategies by action type */
type VerificationStrategy = (
    context: ExecutionContext,
    expectedValue?: string
) => Promise<VerifyResult>;

export class ActionVerifierSkill extends BaseSkill {
    name = 'ActionVerifier';
    priority = 100; // Run last to verify after other skills
    description = 'Verifies that browser actions completed successfully';

    private strategies: Record<string, VerificationStrategy>;

    constructor() {
        super();
        this.strategies = {
            click: this.verifyClick.bind(this),
            fill: this.verifyFill.bind(this),
            select: this.verifySelect.bind(this),
            check: this.verifyCheck.bind(this),
            uncheck: this.verifyUncheck.bind(this),
            navigate: this.verifyNavigate.bind(this),
        };
    }

    /**
     * Detect: Apply to all actionable steps that have been executed
     */
    async detect(context: ExecutionContext): Promise<SkillDetection> {
        // Only verify if we have a resolved selector (action was attempted)
        if (!context.resolvedSelector && context.step.action !== 'navigate') {
            return {
                applies: false,
                confidence: 1.0,
                reason: 'No action to verify (no resolved selector)',
            };
        }

        // Check if we have a strategy for this action
        const hasStrategy = context.step.action in this.strategies;

        return {
            applies: hasStrategy,
            confidence: hasStrategy ? 0.9 : 0.5,
            reason: hasStrategy
                ? `Will verify ${context.step.action} action`
                : `No verification strategy for ${context.step.action}`,
        };
    }

    /**
     * Prepare: Nothing needed
     */
    async prepare(_context: ExecutionContext): Promise<PrepareResult> {
        return { success: true };
    }

    /**
     * Execute: This skill doesn't perform actions, only verifies
     */
    async execute(context: ExecutionContext): Promise<ExecuteResult> {
        // ActionVerifier doesn't execute actions, it only verifies
        // The actual execution is handled by other skills
        return {
            success: true,
            playwrightCode: `// Verification step for ${context.step.action}`,
            durationMs: 0,
        };
    }

    /**
     * Verify: Run the appropriate verification strategy
     */
    async verify(context: ExecutionContext): Promise<VerifyResult> {
        const strategy = this.strategies[context.step.action];

        if (!strategy) {
            return {
                verified: true,
                confidence: 0.5,
                verifiedCondition: `No specific verification for ${context.step.action}`,
            };
        }

        try {
            return await strategy(context, context.step.value);
        } catch (error: any) {
            return {
                verified: false,
                confidence: 0,
                error: `Verification failed: ${error.message}`,
            };
        }
    }

    /**
     * Verify click: Check for state changes (navigation, element visibility)
     */
    private async verifyClick(context: ExecutionContext): Promise<VerifyResult> {
        const { page, resolvedSelector, url } = context;

        // Check 1: Element is still interactable (not disabled)
        if (resolvedSelector) {
            try {
                const isDisabled = await page
                    .locator(resolvedSelector.selector)
                    .isDisabled()
                    .catch(() => false);

                if (!isDisabled) {
                    return {
                        verified: true,
                        confidence: 0.8,
                        verifiedCondition: 'Element remains interactable after click',
                    };
                }
            } catch {
                // Element might have disappeared (e.g., modal close button)
            }
        }

        // Check 2: URL changed (navigation occurred)
        const currentUrl = page.url();
        if (currentUrl !== url) {
            return {
                verified: true,
                confidence: 1.0,
                verifiedCondition: `Navigation occurred: ${url} → ${currentUrl}`,
            };
        }

        // Check 3: Wait a moment and check page stability
        await page.waitForLoadState('domcontentloaded', { timeout: 1000 }).catch(() => { });

        return {
            verified: true,
            confidence: 0.7,
            verifiedCondition: 'Click action completed (no explicit state change detected)',
        };
    }

    /**
     * Verify fill: Check the input has the expected value
     */
    private async verifyFill(
        context: ExecutionContext,
        expectedValue?: string
    ): Promise<VerifyResult> {
        if (!context.resolvedSelector || !expectedValue) {
            return {
                verified: true,
                confidence: 0.5,
                verifiedCondition: 'Fill completed (no value to verify)',
            };
        }

        const { page, resolvedSelector } = context;

        try {
            const actualValue = await page
                .locator(resolvedSelector.selector)
                .inputValue();

            if (actualValue === expectedValue) {
                return {
                    verified: true,
                    confidence: 1.0,
                    verifiedCondition: `Input value matches: "${expectedValue}"`,
                };
            }

            // Partial match (might have auto-formatting)
            if (actualValue.includes(expectedValue) || expectedValue.includes(actualValue)) {
                return {
                    verified: true,
                    confidence: 0.8,
                    verifiedCondition: `Partial value match: expected "${expectedValue}", got "${actualValue}"`,
                };
            }

            return {
                verified: false,
                confidence: 0,
                error: `Value mismatch: expected "${expectedValue}", got "${actualValue}"`,
                retrySuggestions: [
                    'Clear the field before filling',
                    'Use pressSequentially instead of fill',
                ],
            };
        } catch (error: any) {
            return {
                verified: false,
                confidence: 0,
                error: `Could not read input value: ${error.message}`,
            };
        }
    }

    /**
     * Verify select: Check the selected option
     */
    private async verifySelect(
        context: ExecutionContext,
        expectedValue?: string
    ): Promise<VerifyResult> {
        if (!context.resolvedSelector || !expectedValue) {
            return {
                verified: true,
                confidence: 0.5,
                verifiedCondition: 'Select completed (no value to verify)',
            };
        }

        const { page, resolvedSelector } = context;

        try {
            // Get the selected option's value or text
            const selectedValue = await page.locator(resolvedSelector.selector).evaluate(
                (el: HTMLSelectElement) => el.options[el.selectedIndex]?.value
            );

            const selectedText = await page.locator(resolvedSelector.selector).evaluate(
                (el: HTMLSelectElement) => el.options[el.selectedIndex]?.text
            );

            if (selectedValue === expectedValue || selectedText === expectedValue) {
                return {
                    verified: true,
                    confidence: 1.0,
                    verifiedCondition: `Option selected: "${expectedValue}"`,
                };
            }

            return {
                verified: false,
                confidence: 0,
                error: `Selection mismatch: expected "${expectedValue}", got value="${selectedValue}" text="${selectedText}"`,
                retrySuggestions: [
                    'Use the value attribute instead of display text',
                    'Wait for options to load',
                ],
            };
        } catch (error: any) {
            return {
                verified: false,
                confidence: 0,
                error: `Could not verify selection: ${error.message}`,
            };
        }
    }

    /**
     * Verify check: Ensure checkbox is checked
     */
    private async verifyCheck(context: ExecutionContext): Promise<VerifyResult> {
        if (!context.resolvedSelector) {
            return {
                verified: true,
                confidence: 0.5,
                verifiedCondition: 'Check completed (no selector to verify)',
            };
        }

        const { page, resolvedSelector } = context;

        try {
            const isChecked = await page.locator(resolvedSelector.selector).isChecked();

            return {
                verified: isChecked,
                confidence: isChecked ? 1.0 : 0,
                verifiedCondition: isChecked ? 'Checkbox is checked' : undefined,
                error: isChecked ? undefined : 'Checkbox is not checked',
                retrySuggestions: isChecked ? undefined : ['Force check with { force: true }'],
            };
        } catch (error: any) {
            return {
                verified: false,
                confidence: 0,
                error: `Could not verify checkbox state: ${error.message}`,
            };
        }
    }

    /**
     * Verify uncheck: Ensure checkbox is unchecked
     */
    private async verifyUncheck(context: ExecutionContext): Promise<VerifyResult> {
        if (!context.resolvedSelector) {
            return {
                verified: true,
                confidence: 0.5,
                verifiedCondition: 'Uncheck completed (no selector to verify)',
            };
        }

        const { page, resolvedSelector } = context;

        try {
            const isChecked = await page.locator(resolvedSelector.selector).isChecked();

            return {
                verified: !isChecked,
                confidence: !isChecked ? 1.0 : 0,
                verifiedCondition: !isChecked ? 'Checkbox is unchecked' : undefined,
                error: !isChecked ? undefined : 'Checkbox is still checked',
                retrySuggestions: !isChecked ? undefined : ['Force uncheck with { force: true }'],
            };
        } catch (error: any) {
            return {
                verified: false,
                confidence: 0,
                error: `Could not verify checkbox state: ${error.message}`,
            };
        }
    }

    /**
     * Verify navigate: Check URL matches expected
     */
    private async verifyNavigate(context: ExecutionContext): Promise<VerifyResult> {
        const { page, step } = context;
        const expectedUrl = step.value || step.target;

        if (!expectedUrl) {
            return {
                verified: true,
                confidence: 0.5,
                verifiedCondition: 'Navigation completed (no URL to verify)',
            };
        }

        try {
            // Wait for navigation to complete
            await page.waitForLoadState('domcontentloaded', { timeout: 5000 });

            const currentUrl = page.url();

            // Exact match
            if (currentUrl === expectedUrl) {
                return {
                    verified: true,
                    confidence: 1.0,
                    verifiedCondition: `Navigated to: ${currentUrl}`,
                };
            }

            // URL contains expected (partial match)
            if (currentUrl.includes(expectedUrl) || expectedUrl.includes(currentUrl)) {
                return {
                    verified: true,
                    confidence: 0.8,
                    verifiedCondition: `Partial URL match: ${currentUrl}`,
                };
            }

            return {
                verified: false,
                confidence: 0,
                error: `URL mismatch: expected "${expectedUrl}", got "${currentUrl}"`,
                retrySuggestions: ['Wait for redirect to complete', 'Check for auth redirects'],
            };
        } catch (error: any) {
            return {
                verified: false,
                confidence: 0,
                error: `Navigation verification failed: ${error.message}`,
            };
        }
    }
}

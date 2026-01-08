/**
 * AssertionError - Test assertion failures
 *
 * These errors occur when VERIFY statements fail - when the actual
 * state of the page doesn't match the expected state.
 */

import { VeroError, VeroErrorData, ErrorLocation } from '../VeroError.js';

export class AssertionError extends VeroError {
    constructor(data: Omit<VeroErrorData, 'category'>) {
        super({ ...data, category: 'assertion' });
        this.name = 'AssertionError';
    }

    /**
     * Visibility assertion failed
     */
    static visibilityFailed(
        selector: string,
        expected: 'visible' | 'hidden',
        actual: 'visible' | 'hidden',
        veroStatement: string,
        location?: ErrorLocation
    ): AssertionError {
        return new AssertionError({
            code: 'VERO-701',
            severity: 'error',
            location,
            title: 'Visibility Check Failed',
            whatWentWrong: `Expected "${selector}" to be ${expected}, but it was ${actual}.`,
            howToFix: expected === 'visible'
                ? `The element should be visible but isn't. Check if:
- The element has finished loading
- The element is not hidden by CSS
- A previous action completed successfully`
                : `The element should be hidden but is still visible. Check if:
- The hide/close action completed
- The correct element was targeted`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            selector,
            expectedValue: expected,
            actualValue: actual,
            suggestions: [
                { text: 'Add a wait before the verify step', action: 'fix' },
                { text: 'Check if a previous action needs to complete', action: 'investigate' },
            ],
        });
    }

    /**
     * Text content mismatch
     */
    static textMismatch(
        selector: string,
        expected: string,
        actual: string,
        veroStatement: string,
        location?: ErrorLocation
    ): AssertionError {
        // Truncate long strings for display
        const truncate = (s: string, len: number) =>
            s.length > len ? s.substring(0, len) + '...' : s;

        return new AssertionError({
            code: 'VERO-702',
            severity: 'error',
            location,
            title: 'Text Mismatch',
            whatWentWrong: `The text of "${selector}" didn't match.

Expected: "${truncate(expected, 50)}"
Got: "${truncate(actual, 50)}"`,
            howToFix: `The element contains different text than expected. This might be due to:
- Dynamic content that varies between runs
- Text that includes extra whitespace
- Data that changed since the test was written`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            selector,
            expectedValue: expected,
            actualValue: actual,
            suggestions: [
                { text: 'Use "contains" instead of exact match', action: 'fix' },
                { text: 'Check if the expected text is up to date', action: 'investigate' },
                { text: 'Account for dynamic content with variables', action: 'fix' },
            ],
        });
    }

    /**
     * Input value mismatch
     */
    static valueMismatch(
        selector: string,
        expected: string,
        actual: string,
        veroStatement: string,
        location?: ErrorLocation
    ): AssertionError {
        return new AssertionError({
            code: 'VERO-703',
            severity: 'error',
            location,
            title: 'Value Mismatch',
            whatWentWrong: `The input value of "${selector}" didn't match.

Expected: "${expected}"
Got: "${actual}"`,
            howToFix: `The input field contains a different value. This might happen if:
- The fill action didn't complete properly
- The value was changed by JavaScript
- The field has auto-formatting (phone, date, currency)`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            selector,
            expectedValue: expected,
            actualValue: actual,
            suggestions: [
                { text: 'Clear the field before filling', action: 'fix' },
                { text: 'Check for auto-formatting on the field', action: 'investigate' },
            ],
        });
    }

    /**
     * Element count mismatch
     */
    static countMismatch(
        selector: string,
        expected: number,
        actual: number,
        veroStatement: string,
        location?: ErrorLocation
    ): AssertionError {
        return new AssertionError({
            code: 'VERO-704',
            severity: 'error',
            location,
            title: 'Count Mismatch',
            whatWentWrong: `Expected ${expected} "${selector}" element(s), but found ${actual}.`,
            howToFix: `The number of matching elements is different than expected. Check if:
- All expected items have loaded
- The selector is specific enough
- Items weren't added or removed unexpectedly`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            selector,
            expectedValue: String(expected),
            actualValue: String(actual),
            suggestions: [
                { text: 'Wait for all items to load', action: 'fix' },
                { text: 'Verify the test data setup', action: 'investigate' },
            ],
        });
    }

    /**
     * URL mismatch
     */
    static urlMismatch(
        expected: string,
        actual: string,
        veroStatement: string,
        location?: ErrorLocation
    ): AssertionError {
        return new AssertionError({
            code: 'VERO-705',
            severity: 'error',
            location,
            title: 'URL Mismatch',
            whatWentWrong: `Page URL didn't match.

Expected: ${expected}
Got: ${actual}`,
            howToFix: `The browser is on a different page than expected. This might happen if:
- Navigation didn't complete
- A redirect went to a different page
- The expected URL pattern is too strict`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            expectedValue: expected,
            actualValue: actual,
            suggestions: [
                { text: 'Use "contains" for partial URL matching', action: 'fix' },
                { text: 'Wait for navigation to complete', action: 'fix' },
                { text: 'Check for unexpected redirects', action: 'investigate' },
            ],
        });
    }

    /**
     * Title mismatch
     */
    static titleMismatch(
        expected: string,
        actual: string,
        veroStatement: string,
        location?: ErrorLocation
    ): AssertionError {
        return new AssertionError({
            code: 'VERO-706',
            severity: 'error',
            location,
            title: 'Title Mismatch',
            whatWentWrong: `Page title didn't match.

Expected: "${expected}"
Got: "${actual}"`,
            howToFix: `The page title is different than expected. This might happen if:
- The page is still loading
- You're on a different page
- The title was updated by JavaScript`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            expectedValue: expected,
            actualValue: actual,
            suggestions: [
                { text: 'Wait for the page to fully load', action: 'fix' },
                { text: 'Use "contains" for partial title matching', action: 'fix' },
            ],
        });
    }

    /**
     * Attribute mismatch
     */
    static attributeMismatch(
        selector: string,
        attribute: string,
        expected: string,
        actual: string | null,
        veroStatement: string,
        location?: ErrorLocation
    ): AssertionError {
        const actualDisplay = actual === null ? '(not set)' : `"${actual}"`;

        return new AssertionError({
            code: 'VERO-707',
            severity: 'error',
            location,
            title: 'Attribute Mismatch',
            whatWentWrong: `The "${attribute}" attribute of "${selector}" didn't match.

Expected: "${expected}"
Got: ${actualDisplay}`,
            howToFix: `The element's attribute has a different value. Check if:
- The attribute is set correctly in the HTML
- JavaScript modified the attribute
- You're checking the right element`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            selector,
            expectedValue: expected,
            actualValue: actual ?? '(not set)',
            suggestions: [
                { text: 'Inspect the element to verify the attribute', action: 'investigate' },
                { text: 'Wait for any dynamic updates to complete', action: 'fix' },
            ],
        });
    }

    /**
     * State mismatch (enabled/disabled/checked/focused)
     */
    static stateMismatch(
        selector: string,
        state: 'enabled' | 'disabled' | 'checked' | 'unchecked' | 'focused',
        expected: boolean,
        veroStatement: string,
        location?: ErrorLocation
    ): AssertionError {
        const expectedStr = expected ? state : `not ${state}`;
        const actualStr = expected ? `not ${state}` : state;

        return new AssertionError({
            code: 'VERO-708',
            severity: 'error',
            location,
            title: 'State Mismatch',
            whatWentWrong: `Expected "${selector}" to be ${expectedStr}, but it was ${actualStr}.`,
            howToFix: `The element's state doesn't match the expectation. Check if:
- A previous action completed successfully
- Form validation passed
- Required fields are filled`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            selector,
            expectedValue: expectedStr,
            actualValue: actualStr,
            suggestions: [
                { text: 'Check for validation errors on the form', action: 'investigate' },
                { text: 'Verify required fields are filled', action: 'investigate' },
            ],
        });
    }
}

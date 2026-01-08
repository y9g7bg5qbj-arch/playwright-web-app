/**
 * TimeoutError - Timeout-related errors
 *
 * These errors occur when operations take longer than the allowed time limit.
 */

import { VeroError, VeroErrorData, ErrorLocation } from '../VeroError.js';

export class TimeoutError extends VeroError {
    constructor(data: Omit<VeroErrorData, 'category'>) {
        super({ ...data, category: 'timeout' });
        this.name = 'TimeoutError';
    }

    /**
     * Page load timeout
     */
    static pageLoad(
        url: string,
        timeoutMs: number,
        veroStatement: string,
        location?: ErrorLocation
    ): TimeoutError {
        const seconds = Math.round(timeoutMs / 1000);

        return new TimeoutError({
            code: 'VERO-501',
            severity: 'error',
            location,
            title: 'Page Load Timeout',
            whatWentWrong: `The page "${url}" took too long to load (more than ${seconds} seconds).`,
            howToFix: `The website might be slow or unavailable. Try:
- Checking if the website is accessible
- Increasing the timeout setting
- Running tests during off-peak hours`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            suggestions: [
                { text: 'Check if the website is accessible', action: 'investigate' },
                { text: 'Increase page load timeout in settings', action: 'fix' },
                { text: 'Try running the test again', action: 'retry' },
            ],
        });
    }

    /**
     * Element wait timeout
     */
    static elementWait(
        selector: string,
        timeoutMs: number,
        veroStatement: string,
        location?: ErrorLocation
    ): TimeoutError {
        const seconds = Math.round(timeoutMs / 1000);

        return new TimeoutError({
            code: 'VERO-502',
            severity: 'error',
            location,
            title: 'Element Wait Timeout',
            whatWentWrong: `Waited ${seconds} seconds for "${selector}" to appear but it never showed up.`,
            howToFix: `The element might:
- Take longer to appear than expected
- Only appear after a specific action
- Not exist on this page`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 3,
            veroStatement,
            selector,
            suggestions: [
                { text: 'Check if a previous action needs to complete first', action: 'investigate' },
                { text: 'Verify the element selector is correct', action: 'investigate' },
                { text: 'Increase the wait timeout', action: 'fix' },
            ],
        });
    }

    /**
     * Navigation timeout
     */
    static navigation(
        timeoutMs: number,
        veroStatement: string,
        location?: ErrorLocation
    ): TimeoutError {
        const seconds = Math.round(timeoutMs / 1000);

        return new TimeoutError({
            code: 'VERO-503',
            severity: 'error',
            location,
            title: 'Navigation Timeout',
            whatWentWrong: `Page navigation took too long (more than ${seconds} seconds).`,
            howToFix: `The page navigation didn't complete in time. This might happen when:
- The target page is loading slowly
- A redirect is taking too long
- The network connection is slow`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            suggestions: [
                { text: 'Check network connectivity', action: 'investigate' },
                { text: 'Increase navigation timeout', action: 'fix' },
                { text: 'Check if the page requires authentication', action: 'investigate' },
            ],
        });
    }

    /**
     * Network idle timeout
     */
    static networkIdle(
        timeoutMs: number,
        veroStatement: string,
        location?: ErrorLocation
    ): TimeoutError {
        const seconds = Math.round(timeoutMs / 1000);

        return new TimeoutError({
            code: 'VERO-504',
            severity: 'error',
            location,
            title: 'Network Idle Timeout',
            whatWentWrong: `Network activity didn't settle within ${seconds} seconds.`,
            howToFix: `The page has continuous network activity. This might happen when:
- The page has real-time updates (chat, notifications)
- Analytics or tracking requests are ongoing
- The page is polling for data`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            suggestions: [
                { text: 'Use "wait for element" instead of "wait for network"', action: 'fix' },
                { text: 'Increase the network idle timeout', action: 'fix' },
            ],
        });
    }

    /**
     * Action timeout (click, fill, etc.)
     */
    static action(
        actionType: string,
        selector: string,
        timeoutMs: number,
        veroStatement: string,
        location?: ErrorLocation
    ): TimeoutError {
        const seconds = Math.round(timeoutMs / 1000);

        return new TimeoutError({
            code: 'VERO-505',
            severity: 'error',
            location,
            title: 'Action Timeout',
            whatWentWrong: `The ${actionType} action on "${selector}" didn't complete within ${seconds} seconds.`,
            howToFix: `The element might not be ready for interaction. Check if:
- The element is visible and enabled
- No overlays are blocking the element
- The page has finished loading`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            selector,
            suggestions: [
                { text: 'Wait for the element to be visible first', action: 'fix' },
                { text: 'Check for overlays or loading indicators', action: 'investigate' },
                { text: 'Increase the action timeout', action: 'fix' },
            ],
        });
    }

    /**
     * Test timeout (entire test exceeded limit)
     */
    static test(
        testName: string,
        timeoutMs: number,
        location?: ErrorLocation
    ): TimeoutError {
        const seconds = Math.round(timeoutMs / 1000);
        const minutes = Math.round(seconds / 60);
        const timeStr = minutes > 1 ? `${minutes} minutes` : `${seconds} seconds`;

        return new TimeoutError({
            code: 'VERO-506',
            severity: 'error',
            location,
            title: 'Test Timeout',
            whatWentWrong: `The test "${testName}" exceeded the time limit of ${timeStr}.`,
            howToFix: `The test is taking too long. Consider:
- Breaking it into smaller tests
- Optimizing wait conditions
- Increasing the test timeout if needed`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 1,
            veroStatement: testName,
            suggestions: [
                { text: 'Split into smaller, focused tests', action: 'fix' },
                { text: 'Review and optimize wait conditions', action: 'investigate' },
                { text: 'Increase test timeout in configuration', action: 'fix' },
            ],
        });
    }
}

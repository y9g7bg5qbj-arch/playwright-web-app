/**
 * BrowserError - Browser-level errors
 *
 * These errors occur at the browser level, including crashes,
 * context issues, and frame problems.
 */

import { VeroError, VeroErrorData, ErrorLocation } from '../VeroError.js';

export class BrowserError extends VeroError {
    constructor(data: Omit<VeroErrorData, 'category'>) {
        super({ ...data, category: 'browser' });
        this.name = 'BrowserError';
    }

    /**
     * Browser crashed
     */
    static crashed(
        veroStatement: string,
        location?: ErrorLocation
    ): BrowserError {
        return new BrowserError({
            code: 'VERO-801',
            severity: 'error',
            location,
            title: 'Browser Crashed',
            whatWentWrong: 'The browser stopped unexpectedly during the test.',
            howToFix: `The browser crashed, which can happen due to:
- Running out of memory
- A bug in the website being tested
- Resource-intensive operations`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            suggestions: [
                { text: 'Try running the test again', action: 'retry' },
                { text: 'Check if the website is causing crashes', action: 'investigate' },
                { text: 'Increase memory allocation if running in container', action: 'fix' },
            ],
        });
    }

    /**
     * Browser not installed
     */
    static notInstalled(
        browserType: string,
        veroStatement: string,
        location?: ErrorLocation
    ): BrowserError {
        return new BrowserError({
            code: 'VERO-802',
            severity: 'error',
            location,
            title: 'Browser Not Installed',
            whatWentWrong: `The ${browserType} browser is not installed on this system.`,
            howToFix: `Run "npx playwright install ${browserType}" to install the browser, or choose a different browser type.`,
            flakiness: 'permanent',
            retryable: false,
            veroStatement,
            suggestions: [
                { text: `Install with: npx playwright install ${browserType}`, action: 'fix' },
                { text: 'Use a different browser type', action: 'fix' },
            ],
        });
    }

    /**
     * Browser context closed
     */
    static contextClosed(
        veroStatement: string,
        location?: ErrorLocation
    ): BrowserError {
        return new BrowserError({
            code: 'VERO-803',
            severity: 'error',
            location,
            title: 'Context Closed',
            whatWentWrong: 'The browser context was closed unexpectedly.',
            howToFix: `The browser session ended before the test completed. This might happen if:
- Another test or process closed the browser
- A timeout caused the context to close
- There was a browser crash`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            suggestions: [
                { text: 'Try running the test again', action: 'retry' },
                { text: 'Check for parallel test interference', action: 'investigate' },
            ],
        });
    }

    /**
     * Page closed
     */
    static pageClosed(
        veroStatement: string,
        location?: ErrorLocation
    ): BrowserError {
        return new BrowserError({
            code: 'VERO-804',
            severity: 'error',
            location,
            title: 'Page Closed',
            whatWentWrong: 'The browser tab was closed unexpectedly.',
            howToFix: `The page/tab was closed before the action could complete. This might happen if:
- JavaScript on the page closed the window
- A download or popup triggered tab closure
- Another test step closed the tab`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            suggestions: [
                { text: 'Check if the page closes itself', action: 'investigate' },
                { text: 'Handle popup windows explicitly', action: 'fix' },
            ],
        });
    }

    /**
     * Frame detached
     */
    static frameDetached(
        frameName: string,
        veroStatement: string,
        location?: ErrorLocation
    ): BrowserError {
        return new BrowserError({
            code: 'VERO-805',
            severity: 'error',
            location,
            title: 'Frame Detached',
            whatWentWrong: `The frame "${frameName}" was removed from the page.`,
            howToFix: `The iframe or frame was removed during the test. This might happen when:
- The parent page navigated away
- JavaScript removed the frame
- The frame content changed`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            suggestions: [
                { text: 'Wait for the frame to be stable before interacting', action: 'fix' },
                { text: 'Check if navigation removed the frame', action: 'investigate' },
            ],
        });
    }

    /**
     * Popup not found
     */
    static popupNotFound(
        veroStatement: string,
        location?: ErrorLocation
    ): BrowserError {
        return new BrowserError({
            code: 'VERO-806',
            severity: 'error',
            location,
            title: 'Popup Not Found',
            whatWentWrong: 'Expected a popup window to appear, but none was opened.',
            howToFix: `The popup window didn't open as expected. This might happen if:
- The click didn't trigger a popup
- A popup blocker prevented the window
- The popup opened and closed too quickly`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            suggestions: [
                { text: 'Ensure popup blockers are disabled', action: 'investigate' },
                { text: 'Check if the triggering action succeeded', action: 'investigate' },
            ],
        });
    }
}

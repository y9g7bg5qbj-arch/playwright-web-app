/**
 * RuntimeErrorHandler
 *
 * Catches and classifies Playwright runtime errors, converting them
 * to user-friendly VeroError format for WebSocket streaming to frontend.
 */

import { EventEmitter } from 'events';

/**
 * VeroError JSON format (matches vero-lang VeroErrorJSON)
 */
export interface VeroRuntimeError {
    code: string;
    category: string;
    severity: 'error' | 'warning' | 'info' | 'hint';
    location?: {
        line: number;
        column?: number;
        endLine?: number;
        endColumn?: number;
    };
    title: string;
    whatWentWrong: string;
    howToFix: string;
    suggestions: Array<{ text: string; action?: string }>;
    veroStatement?: string;
    selector?: string;
    flakiness?: 'permanent' | 'flaky' | 'unknown';
    retryable?: boolean;
    suggestedRetries?: number;
    timestamp?: string;
    executionId?: string;
}

/**
 * Source map entry for line mapping
 */
export interface SourceMapEntry {
    veroLine: number;
    playwrightLine: number;
    veroStatement: string;
}

/**
 * Error pattern for matching Playwright errors
 */
interface ErrorPattern {
    pattern: RegExp;
    code: string;
    category: string;
    title: string;
    howToFix: string;
    flakiness: 'permanent' | 'flaky' | 'unknown';
    retryable: boolean;
    suggestedRetries: number;
}

/**
 * Common Playwright error patterns
 */
const ERROR_PATTERNS: ErrorPattern[] = [
    // Locator errors
    {
        pattern: /Locator resolves to 0 element/i,
        code: 'VERO-401',
        category: 'locator',
        title: 'Element Not Found',
        howToFix: 'Make sure the page has fully loaded and the element exists. Check that selectors are correct.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 3,
    },
    {
        pattern: /strict mode violation.*resolved to (\d+) elements/i,
        code: 'VERO-402',
        category: 'locator',
        title: 'Multiple Elements Found',
        howToFix: 'Use a more specific selector to match only one element.',
        flakiness: 'permanent',
        retryable: false,
        suggestedRetries: 0,
    },
    {
        pattern: /element is not visible/i,
        code: 'VERO-403',
        category: 'locator',
        title: 'Element Not Visible',
        howToFix: 'Wait for the element to become visible, or scroll it into view.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 2,
    },
    {
        pattern: /element is disabled/i,
        code: 'VERO-404',
        category: 'locator',
        title: 'Element Disabled',
        howToFix: 'Wait for the element to become enabled before interacting.',
        flakiness: 'permanent',
        retryable: false,
        suggestedRetries: 0,
    },
    {
        pattern: /element is not attached to the DOM/i,
        code: 'VERO-405',
        category: 'locator',
        title: 'Element Detached',
        howToFix: 'The element was removed from the page. Re-query the element before interacting.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 3,
    },
    {
        pattern: /element is outside of the viewport/i,
        code: 'VERO-407',
        category: 'locator',
        title: 'Element Outside Viewport',
        howToFix: 'Scroll the element into view before clicking.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 2,
    },
    {
        pattern: /element (?:is|was) (?:covered|intercepted)/i,
        code: 'VERO-406',
        category: 'locator',
        title: 'Element Covered',
        howToFix: 'Another element is blocking clicks. Close popups, dismiss overlays, or wait for animations.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 2,
    },

    // Timeout errors
    {
        pattern: /Timeout (\d+)ms exceeded/i,
        code: 'VERO-502',
        category: 'timeout',
        title: 'Element Wait Timeout',
        howToFix: 'Increase the timeout or ensure the element appears faster.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 3,
    },
    {
        pattern: /page\.goto.*?Timeout/i,
        code: 'VERO-501',
        category: 'timeout',
        title: 'Page Load Timeout',
        howToFix: 'The page is loading slowly. Check network connectivity and server response time.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 2,
    },
    {
        pattern: /navigation.*?timeout/i,
        code: 'VERO-503',
        category: 'timeout',
        title: 'Navigation Timeout',
        howToFix: 'Navigation took too long. Check network conditions and page complexity.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 2,
    },
    {
        pattern: /Test timeout of (\d+)ms exceeded/i,
        code: 'VERO-506',
        category: 'timeout',
        title: 'Test Timeout',
        howToFix: 'The entire test took too long. Consider increasing test timeout or optimizing the test.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 1,
    },

    // Navigation errors
    {
        pattern: /net::ERR_NAME_NOT_RESOLVED/i,
        code: 'VERO-602',
        category: 'navigation',
        title: 'DNS Resolution Failed',
        howToFix: 'The URL could not be resolved. Check the URL spelling and network connectivity.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 2,
    },
    {
        pattern: /net::ERR_CONNECTION_REFUSED/i,
        code: 'VERO-603',
        category: 'navigation',
        title: 'Connection Refused',
        howToFix: 'The server refused the connection. Make sure the server is running.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 2,
    },
    {
        pattern: /net::ERR_CERT_|SSL_PROTOCOL_ERROR/i,
        code: 'VERO-604',
        category: 'navigation',
        title: 'SSL Certificate Error',
        howToFix: 'The SSL certificate is invalid. Check the certificate configuration.',
        flakiness: 'permanent',
        retryable: false,
        suggestedRetries: 0,
    },
    {
        pattern: /invalid url/i,
        code: 'VERO-601',
        category: 'navigation',
        title: 'Invalid URL',
        howToFix: 'The URL is malformed. Make sure it starts with http:// or https://.',
        flakiness: 'permanent',
        retryable: false,
        suggestedRetries: 0,
    },
    {
        pattern: /net::ERR_INTERNET_DISCONNECTED/i,
        code: 'VERO-607',
        category: 'navigation',
        title: 'Offline',
        howToFix: 'No internet connection. Check your network settings.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 3,
    },

    // Assertion errors
    {
        pattern: /expect\(.*?\)\.toBeVisible/i,
        code: 'VERO-701',
        category: 'assertion',
        title: 'Visibility Assertion Failed',
        howToFix: 'The element visibility did not match expectations. Wait for the correct state.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 2,
    },
    {
        pattern: /expect\(.*?\)\.toHaveText/i,
        code: 'VERO-702',
        category: 'assertion',
        title: 'Text Assertion Failed',
        howToFix: 'The element text did not match. Check for dynamic content or timing issues.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 2,
    },
    {
        pattern: /expect\(.*?\)\.toHaveValue/i,
        code: 'VERO-703',
        category: 'assertion',
        title: 'Value Assertion Failed',
        howToFix: 'The input value did not match. Verify the fill operation completed.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 2,
    },
    {
        pattern: /expect\(.*?\)\.toHaveCount/i,
        code: 'VERO-704',
        category: 'assertion',
        title: 'Count Assertion Failed',
        howToFix: 'The element count did not match. Wait for all elements to load.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 2,
    },

    // Browser errors
    {
        pattern: /browser.*?(?:crashed|disconnected)/i,
        code: 'VERO-801',
        category: 'browser',
        title: 'Browser Crashed',
        howToFix: 'The browser crashed unexpectedly. Try running the test again.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 2,
    },
    {
        pattern: /executable doesn't exist|browser.*?not.*?installed/i,
        code: 'VERO-802',
        category: 'browser',
        title: 'Browser Not Installed',
        howToFix: 'Run "npx playwright install" to install browsers.',
        flakiness: 'permanent',
        retryable: false,
        suggestedRetries: 0,
    },
    {
        pattern: /context.*?closed/i,
        code: 'VERO-803',
        category: 'browser',
        title: 'Browser Context Closed',
        howToFix: 'The browser context was closed prematurely. Check for page.close() calls.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 2,
    },
    {
        pattern: /page.*?closed/i,
        code: 'VERO-804',
        category: 'browser',
        title: 'Page Closed',
        howToFix: 'The page was closed during the test. Check for navigation or window.close().',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 2,
    },

    // Network errors
    {
        pattern: /CORS|cross-origin/i,
        code: 'VERO-903',
        category: 'network',
        title: 'CORS Error',
        howToFix: 'Cross-origin request blocked. Configure CORS on the server.',
        flakiness: 'permanent',
        retryable: false,
        suggestedRetries: 0,
    },
    {
        pattern: /request failed|fetch failed/i,
        code: 'VERO-902',
        category: 'network',
        title: 'Request Failed',
        howToFix: 'A network request failed. Check server availability and network connectivity.',
        flakiness: 'flaky',
        retryable: true,
        suggestedRetries: 3,
    },
];

/**
 * RuntimeErrorHandler class
 */
export class RuntimeErrorHandler extends EventEmitter {
    private sourceMap: SourceMapEntry[] = [];
    private executionId?: string;

    constructor(executionId?: string) {
        super();
        this.executionId = executionId;
    }

    /**
     * Set source map for line number mapping
     */
    setSourceMap(map: SourceMapEntry[]): void {
        this.sourceMap = map;
    }

    /**
     * Get Vero location from Playwright line
     */
    private getVeroLocation(playwrightLine?: number): SourceMapEntry | undefined {
        if (!playwrightLine || this.sourceMap.length === 0) {
            return undefined;
        }

        // Find closest Vero line
        let closest: SourceMapEntry | undefined;
        for (const entry of this.sourceMap) {
            if (entry.playwrightLine <= playwrightLine) {
                if (!closest || entry.playwrightLine > closest.playwrightLine) {
                    closest = entry;
                }
            }
        }

        return closest;
    }

    /**
     * Extract line number from error stack
     */
    private extractLineFromStack(error: Error | string): number | undefined {
        const errorStr = typeof error === 'string' ? error : error.stack || error.message;
        const match = errorStr.match(/:(\d+):\d+/);
        return match ? parseInt(match[1], 10) : undefined;
    }

    /**
     * Map Playwright error to VeroRuntimeError
     */
    handleError(error: Error | string, veroStatement?: string): VeroRuntimeError {
        const errorMessage = typeof error === 'string' ? error : error.message;
        const errorStack = typeof error === 'string' ? error : error.stack || '';
        const fullError = errorMessage + '\n' + errorStack;

        // Try to get Vero location
        const playwrightLine = this.extractLineFromStack(error);
        const veroEntry = this.getVeroLocation(playwrightLine);

        // Find matching pattern
        for (const pattern of ERROR_PATTERNS) {
            const match = fullError.match(pattern.pattern);
            if (match) {
                const veroError: VeroRuntimeError = {
                    code: pattern.code,
                    category: pattern.category,
                    severity: 'error',
                    location: veroEntry ? { line: veroEntry.veroLine } : undefined,
                    title: pattern.title,
                    whatWentWrong: errorMessage,
                    howToFix: pattern.howToFix,
                    suggestions: this.getSuggestions(pattern.category, pattern.retryable),
                    veroStatement: veroStatement || veroEntry?.veroStatement || 'Unknown statement',
                    flakiness: pattern.flakiness,
                    retryable: pattern.retryable,
                    suggestedRetries: pattern.suggestedRetries,
                    timestamp: new Date().toISOString(),
                    executionId: this.executionId,
                };

                // Emit error event
                this.emit('error', veroError);

                return veroError;
            }
        }

        // Default error
        const defaultError: VeroRuntimeError = {
            code: 'VERO-999',
            category: 'runtime',
            severity: 'error',
            location: veroEntry ? { line: veroEntry.veroLine } : undefined,
            title: 'Runtime Error',
            whatWentWrong: errorMessage,
            howToFix: 'Review the error details and check your test script.',
            suggestions: [{ text: 'Check the error message for details', action: 'investigate' }],
            veroStatement: veroStatement || veroEntry?.veroStatement || 'Unknown statement',
            flakiness: 'unknown',
            retryable: true,
            suggestedRetries: 1,
            timestamp: new Date().toISOString(),
            executionId: this.executionId,
        };

        this.emit('error', defaultError);

        return defaultError;
    }

    /**
     * Get suggestions based on error category
     */
    private getSuggestions(category: string, retryable: boolean): Array<{ text: string; action?: string }> {
        const suggestions: Array<{ text: string; action?: string }> = [];

        switch (category) {
            case 'locator':
                suggestions.push({ text: 'Wait for the element to appear', action: 'fix' });
                suggestions.push({ text: 'Check the selector in Page Object', action: 'investigate' });
                break;
            case 'timeout':
                suggestions.push({ text: 'Increase the timeout value', action: 'fix' });
                suggestions.push({ text: 'Check network connectivity', action: 'investigate' });
                break;
            case 'navigation':
                suggestions.push({ text: 'Verify the URL is correct', action: 'investigate' });
                suggestions.push({ text: 'Check server availability', action: 'investigate' });
                break;
            case 'assertion':
                suggestions.push({ text: 'Add explicit wait before assertion', action: 'fix' });
                suggestions.push({ text: 'Check for dynamic content', action: 'investigate' });
                break;
            case 'browser':
                suggestions.push({ text: 'Restart the browser', action: 'retry' });
                break;
            case 'network':
                suggestions.push({ text: 'Check network settings', action: 'investigate' });
                break;
        }

        if (retryable) {
            suggestions.push({ text: 'Try running the test again', action: 'retry' });
        }

        return suggestions;
    }

    /**
     * Wrap async function with error handling
     */
    async wrapAsync<T>(
        fn: () => Promise<T>,
        veroStatement?: string
    ): Promise<{ success: boolean; result?: T; error?: VeroRuntimeError }> {
        try {
            const result = await fn();
            return { success: true, result };
        } catch (error) {
            const veroError = this.handleError(error as Error, veroStatement);
            return { success: false, error: veroError };
        }
    }

    /**
     * Format error for WebSocket transmission
     */
    formatForWebSocket(error: VeroRuntimeError): object {
        return {
            type: 'execution:error',
            payload: error,
        };
    }

    /**
     * Check if error should trigger retry
     */
    shouldRetry(error: VeroRuntimeError, attemptNumber: number): boolean {
        if (!error.retryable) return false;
        return attemptNumber < (error.suggestedRetries || 0);
    }
}

/**
 * Create error handler for execution
 */
export function createErrorHandler(executionId?: string): RuntimeErrorHandler {
    return new RuntimeErrorHandler(executionId);
}

/**
 * Quick map function for simple usage
 */
export function mapRuntimeError(
    error: Error | string,
    veroStatement?: string
): VeroRuntimeError {
    const handler = new RuntimeErrorHandler();
    return handler.handleError(error, veroStatement);
}

export default RuntimeErrorHandler;

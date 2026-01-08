/**
 * PlaywrightErrorMapper
 *
 * Maps Playwright runtime errors to user-friendly VeroError instances.
 * Handles 40+ common Playwright error patterns with actionable fix suggestions.
 */

import { VeroError, ErrorLocation, ErrorCategory } from '../VeroError.js';
import { LocatorError } from '../categories/LocatorError.js';
import { TimeoutError } from '../categories/TimeoutError.js';
import { NavigationError } from '../categories/NavigationError.js';
import { AssertionError } from '../categories/AssertionError.js';
import { BrowserError } from '../categories/BrowserError.js';
import { NetworkError } from '../categories/NetworkError.js';

/**
 * Error pattern definition
 */
interface ErrorPattern {
    /** Regex pattern to match Playwright error messages */
    pattern: RegExp;
    /** Factory function to create VeroError from match */
    create: (match: RegExpMatchArray, veroStatement: string, location?: ErrorLocation) => VeroError;
    /** Optional priority (higher = matched first) */
    priority?: number;
}

/**
 * Source map entry for Vero-to-Playwright line mapping
 */
export interface SourceMapEntry {
    veroLine: number;
    playwrightLine: number;
    veroStatement: string;
}

/**
 * All error patterns sorted by priority
 */
const ERROR_PATTERNS: ErrorPattern[] = [
    // ==================== LOCATOR ERRORS (VERO-4xx) ====================

    // Element not found - most common
    {
        pattern: /Locator resolves to (\d+) element[s]?/i,
        create: (match, stmt, loc) => {
            const count = parseInt(match[1], 10);
            if (count === 0) {
                return LocatorError.notFound('element', stmt, loc);
            }
            return LocatorError.ambiguous('element', count, stmt, loc);
        },
        priority: 100,
    },

    // Strict mode violation
    {
        pattern: /strict mode violation: (?:getByRole|getByText|locator)\(.+?\) resolved to (\d+) elements/i,
        create: (match, stmt, loc) => LocatorError.ambiguous('element', parseInt(match[1], 10), stmt, loc),
        priority: 99,
    },

    // Element is not visible
    {
        pattern: /element is not visible/i,
        create: (_, stmt, loc) => LocatorError.notVisible('element', stmt, loc),
        priority: 95,
    },

    // Element not attached to DOM
    {
        pattern: /element is not attached to the DOM/i,
        create: (_, stmt, loc) => LocatorError.detached('element', stmt, loc),
        priority: 95,
    },

    // Element is disabled
    {
        pattern: /element is disabled/i,
        create: (_, stmt, loc) => LocatorError.disabled('element', stmt, loc),
        priority: 95,
    },

    // Element is outside viewport
    {
        pattern: /element is outside of the viewport/i,
        create: (_, stmt, loc) => LocatorError.outsideViewport('element', stmt, loc),
        priority: 90,
    },

    // Another element is covering/receiving click
    {
        pattern: /element (?:is|was) (?:outside|covered|intercepted|not receiving)/i,
        create: (_, stmt, loc) => LocatorError.covered('element', stmt, loc),
        priority: 90,
    },

    // Waiting for element
    {
        pattern: /waiting for (?:locator|selector|element) ['"](.*?)['"].*?to be (?:visible|hidden|enabled|disabled)/i,
        create: (match, stmt, loc) => LocatorError.notFound(match[1] || 'element', stmt, loc),
        priority: 85,
    },

    // Frame detached
    {
        pattern: /frame was detached/i,
        create: (_, stmt, loc) => BrowserError.frameDetached('frame', stmt, loc),
        priority: 80,
    },

    // ==================== TIMEOUT ERRORS (VERO-5xx) ====================

    // Generic timeout
    {
        pattern: /Timeout (\d+)ms exceeded/i,
        create: (match, stmt, loc) => {
            const timeout = parseInt(match[1], 10);
            return TimeoutError.elementWait('element', timeout, stmt, loc);
        },
        priority: 75,
    },

    // Page load timeout
    {
        pattern: /page\.goto.*?Timeout (\d+)ms exceeded/i,
        create: (match, stmt, loc) => {
            const timeout = parseInt(match[1], 10);
            return TimeoutError.pageLoad('', timeout, stmt, loc);
        },
        priority: 80,
    },

    // Navigation timeout
    {
        pattern: /navigation.*?(?:timeout|timed out)/i,
        create: (_, stmt, loc) => TimeoutError.navigation(30000, stmt, loc),
        priority: 78,
    },

    // Wait for network idle timeout
    {
        pattern: /waitForLoadState.*?networkidle.*?timeout/i,
        create: (_, stmt, loc) => TimeoutError.networkIdle(30000, stmt, loc),
        priority: 77,
    },

    // Action timeout
    {
        pattern: /(?:click|fill|check|hover|press|select).*?timeout.*?exceeded/i,
        create: (_, stmt, loc) => TimeoutError.action('action', 'element', 30000, stmt, loc),
        priority: 76,
    },

    // Test timeout
    {
        pattern: /Test timeout of (\d+)ms exceeded/i,
        create: (match, stmt, loc) => TimeoutError.test(stmt, parseInt(match[1], 10), loc),
        priority: 70,
    },

    // ==================== NAVIGATION ERRORS (VERO-6xx) ====================

    // Invalid URL
    {
        pattern: /invalid url/i,
        create: (_, stmt, loc) => NavigationError.invalidUrl('', stmt, loc),
        priority: 85,
    },

    // Protocol error (not http/https)
    {
        pattern: /Protocol "(.+?)" is not supported/i,
        create: (match, stmt, loc) => NavigationError.invalidUrl(match[1], stmt, loc),
        priority: 85,
    },

    // DNS resolution failed
    {
        pattern: /net::ERR_NAME_NOT_RESOLVED|DNS_PROBE_FINISHED/i,
        create: (_, stmt, loc) => NavigationError.dnsNotResolved('', stmt, loc),
        priority: 85,
    },

    // Connection refused
    {
        pattern: /net::ERR_CONNECTION_REFUSED/i,
        create: (_, stmt, loc) => NavigationError.connectionRefused('', stmt, loc),
        priority: 85,
    },

    // SSL certificate error
    {
        pattern: /net::ERR_CERT_|SSL_PROTOCOL_ERROR|certificate/i,
        create: (_, stmt, loc) => NavigationError.sslError('', stmt, loc),
        priority: 85,
    },

    // Connection reset
    {
        pattern: /net::ERR_CONNECTION_RESET/i,
        create: (_, stmt, loc) => NavigationError.connectionRefused('', stmt, loc),
        priority: 84,
    },

    // Connection timed out
    {
        pattern: /net::ERR_CONNECTION_TIMED_OUT/i,
        create: (_, stmt, loc) => NavigationError.connectionRefused('', stmt, loc),
        priority: 84,
    },

    // Page not found (404)
    {
        pattern: /net::ERR_ABORTED|404/i,
        create: (_, stmt, loc) => NavigationError.notFound('', stmt, loc),
        priority: 80,
    },

    // Offline
    {
        pattern: /net::ERR_INTERNET_DISCONNECTED/i,
        create: (_, stmt, loc) => NavigationError.offline(stmt, loc),
        priority: 90,
    },

    // HTTP errors
    {
        pattern: /response.*?status code (\d+)/i,
        create: (match, stmt, loc) => {
            const status = parseInt(match[1], 10);
            const statusText = status >= 500 ? 'Server Error' : 'Client Error';
            return NavigationError.httpError('', status, statusText, stmt, loc);
        },
        priority: 75,
    },

    // ==================== ASSERTION ERRORS (VERO-7xx) ====================

    // toBeVisible assertion
    {
        pattern: /expect\(.*?\)\.toBeVisible/i,
        create: (_, stmt, loc) => AssertionError.visibilityFailed('element', 'visible', 'hidden', stmt, loc),
        priority: 70,
    },

    // toBeHidden assertion
    {
        pattern: /expect\(.*?\)\.toBeHidden/i,
        create: (_, stmt, loc) => AssertionError.visibilityFailed('element', 'hidden', 'visible', stmt, loc),
        priority: 70,
    },

    // toHaveText assertion
    {
        pattern: /expect\(.*?\)\.toHaveText.*?Expected.*?['"](.+?)['"].*?Received.*?['"](.+?)['"]/is,
        create: (match, stmt, loc) => AssertionError.textMismatch('element', match[1], match[2], stmt, loc),
        priority: 70,
    },

    // toContainText assertion
    {
        pattern: /expect\(.*?\)\.toContainText.*?Expected.*?['"](.+?)['"]/is,
        create: (match, stmt, loc) => AssertionError.textMismatch('element', match[1], '', stmt, loc),
        priority: 70,
    },

    // toHaveValue assertion
    {
        pattern: /expect\(.*?\)\.toHaveValue.*?Expected.*?['"](.+?)['"].*?Received.*?['"](.+?)['"]/is,
        create: (match, stmt, loc) => AssertionError.valueMismatch('element', match[1], match[2], stmt, loc),
        priority: 70,
    },

    // toHaveCount assertion
    {
        pattern: /expect\(.*?\)\.toHaveCount.*?Expected:?\s*(\d+).*?Received:?\s*(\d+)/is,
        create: (match, stmt, loc) => AssertionError.countMismatch('element', parseInt(match[1], 10), parseInt(match[2], 10), stmt, loc),
        priority: 70,
    },

    // toHaveURL assertion
    {
        pattern: /expect\(.*?\)\.toHaveURL.*?Expected.*?['"](.+?)['"].*?Received.*?['"](.+?)['"]/is,
        create: (match, stmt, loc) => AssertionError.urlMismatch(match[1], match[2], stmt, loc),
        priority: 70,
    },

    // toHaveTitle assertion
    {
        pattern: /expect\(.*?\)\.toHaveTitle.*?Expected.*?['"](.+?)['"].*?Received.*?['"](.+?)['"]/is,
        create: (match, stmt, loc) => AssertionError.titleMismatch(match[1], match[2], stmt, loc),
        priority: 70,
    },

    // toHaveAttribute assertion
    {
        pattern: /expect\(.*?\)\.toHaveAttribute.*?['"](.+?)['"].*?Expected.*?['"](.+?)['"].*?Received.*?['"](.+?)['"]/is,
        create: (match, stmt, loc) => AssertionError.attributeMismatch('element', match[1], match[2], match[3], stmt, loc),
        priority: 70,
    },

    // toBe/toEqual assertion (generic)
    {
        pattern: /Expected:?\s*(.+?)\s+Received:?\s*(.+)/i,
        create: (match, stmt, loc) => AssertionError.valueMismatch('value', match[1], match[2], stmt, loc),
        priority: 50,
    },

    // ==================== BROWSER ERRORS (VERO-8xx) ====================

    // Browser crashed
    {
        pattern: /browser.*?(?:crashed|disconnected|closed unexpectedly)/i,
        create: (_, stmt, loc) => BrowserError.crashed(stmt, loc),
        priority: 95,
    },

    // Browser not installed
    {
        pattern: /executable doesn't exist|browserType\.launch|browser.*?not.*?installed/i,
        create: (_, stmt, loc) => BrowserError.notInstalled('chromium', stmt, loc),
        priority: 95,
    },

    // Context closed
    {
        pattern: /context.*?(?:closed|has been destroyed)/i,
        create: (_, stmt, loc) => BrowserError.contextClosed(stmt, loc),
        priority: 90,
    },

    // Page closed
    {
        pattern: /page.*?(?:closed|has been destroyed)/i,
        create: (_, stmt, loc) => BrowserError.pageClosed(stmt, loc),
        priority: 90,
    },

    // Popup not found
    {
        pattern: /waiting for popup/i,
        create: (_, stmt, loc) => BrowserError.popupNotFound(stmt, loc),
        priority: 80,
    },

    // ==================== NETWORK ERRORS (VERO-9xx) ====================

    // Offline
    {
        pattern: /offline|no internet/i,
        create: (_, stmt, loc) => NetworkError.offline(stmt, loc),
        priority: 85,
    },

    // CORS error
    {
        pattern: /CORS|cross-origin|Access-Control-Allow-Origin/i,
        create: (_, stmt, loc) => NetworkError.corsBlocked('', stmt, loc),
        priority: 85,
    },

    // Request failed
    {
        pattern: /request failed|fetch failed/i,
        create: (_, stmt, loc) => NetworkError.requestFailed('', stmt, loc),
        priority: 75,
    },

    // WebSocket error
    {
        pattern: /websocket.*?(?:error|failed|closed)/i,
        create: (_, stmt, loc) => NetworkError.webSocketError('', stmt, loc),
        priority: 75,
    },
];

// Sort patterns by priority (highest first)
const SORTED_PATTERNS = [...ERROR_PATTERNS].sort((a, b) => (b.priority || 0) - (a.priority || 0));

/**
 * PlaywrightErrorMapper class
 */
export class PlaywrightErrorMapper {
    private sourceMap: SourceMapEntry[] = [];

    /**
     * Set source map for Vero-to-Playwright line mapping
     */
    setSourceMap(map: SourceMapEntry[]): void {
        this.sourceMap = map;
    }

    /**
     * Get the Vero source location from a Playwright error
     */
    getVeroLocation(playwrightLine?: number): { line: number; statement: string } | undefined {
        if (!playwrightLine || this.sourceMap.length === 0) {
            return undefined;
        }

        // Find the closest Vero line that maps to or before this Playwright line
        let closest: SourceMapEntry | undefined;
        for (const entry of this.sourceMap) {
            if (entry.playwrightLine <= playwrightLine) {
                if (!closest || entry.playwrightLine > closest.playwrightLine) {
                    closest = entry;
                }
            }
        }

        if (closest) {
            return { line: closest.veroLine, statement: closest.veroStatement };
        }

        return undefined;
    }

    /**
     * Extract line number from Playwright error stack trace
     */
    extractLineFromStack(error: Error | string): number | undefined {
        const errorStr = typeof error === 'string' ? error : error.stack || error.message;

        // Match patterns like "at file.ts:123:45" or ":123:45"
        const match = errorStr.match(/:(\d+):\d+/);
        if (match) {
            return parseInt(match[1], 10);
        }

        return undefined;
    }

    /**
     * Map a Playwright error to a VeroError
     */
    mapError(error: Error | string, veroStatement?: string): VeroError {
        const errorMessage = typeof error === 'string' ? error : error.message;
        const errorStack = typeof error === 'string' ? error : error.stack || '';
        const fullError = errorMessage + '\n' + errorStack;

        // Try to extract location from stack
        const playwrightLine = this.extractLineFromStack(error);
        const veroLocation = this.getVeroLocation(playwrightLine);

        const location: ErrorLocation | undefined = veroLocation
            ? { line: veroLocation.line }
            : undefined;

        const statement = veroStatement || veroLocation?.statement || 'Unknown statement';

        // Try each pattern
        for (const pattern of SORTED_PATTERNS) {
            const match = fullError.match(pattern.pattern);
            if (match) {
                return pattern.create(match, statement, location);
            }
        }

        // Default: return a generic script error
        return new VeroError({
            code: 'VERO-499',
            category: 'script',
            severity: 'error',
            location,
            title: 'Runtime Error',
            whatWentWrong: errorMessage,
            howToFix: 'Review the error details and check your test script.',
            flakiness: 'unknown',
            retryable: true,
            suggestedRetries: 1,
            veroStatement: statement,
            suggestions: [
                { text: 'Check the Playwright error message for details', action: 'investigate' },
            ],
        });
    }

    /**
     * Map multiple errors
     */
    mapErrors(errors: Array<Error | string>, veroStatements?: string[]): VeroError[] {
        return errors.map((error, index) =>
            this.mapError(error, veroStatements?.[index])
        );
    }

    /**
     * Quick check if an error message matches any known pattern
     */
    static isKnownError(errorMessage: string): boolean {
        return SORTED_PATTERNS.some(p => p.pattern.test(errorMessage));
    }

    /**
     * Get suggested retry count for an error
     */
    static getSuggestedRetries(error: VeroError): number {
        if (!error.retryable) return 0;
        return error.suggestedRetries || 0;
    }
}

/**
 * Singleton instance for convenience
 */
export const playwrightErrorMapper = new PlaywrightErrorMapper();

/**
 * Quick map function for simple usage
 */
export function mapPlaywrightError(
    error: Error | string,
    veroStatement?: string
): VeroError {
    return playwrightErrorMapper.mapError(error, veroStatement);
}

/**
 * Check if error is retryable (flaky)
 */
export function isRetryableError(error: VeroError): boolean {
    return error.retryable && error.flakiness !== 'permanent';
}

/**
 * Get error category from error message (quick check)
 */
export function getErrorCategory(errorMessage: string): ErrorCategory {
    const lowerMessage = errorMessage.toLowerCase();

    if (lowerMessage.includes('locator') || lowerMessage.includes('element')) {
        return 'locator';
    }
    if (lowerMessage.includes('timeout')) {
        return 'timeout';
    }
    if (lowerMessage.includes('navigation') || lowerMessage.includes('net::')) {
        return 'navigation';
    }
    if (lowerMessage.includes('expect') || lowerMessage.includes('assertion')) {
        return 'assertion';
    }
    if (lowerMessage.includes('browser') || lowerMessage.includes('context')) {
        return 'browser';
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('cors')) {
        return 'network';
    }

    return 'script';
}

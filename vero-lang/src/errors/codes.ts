/**
 * Error Code Registry
 *
 * All Vero error codes follow the pattern: VERO-XXX
 *
 * Code ranges:
 * - VERO-1xx: Lexer errors (tokenization)
 * - VERO-2xx: Parser errors (syntax)
 * - VERO-3xx: Validation errors (semantic)
 * - VERO-4xx: Locator/Element errors (runtime)
 * - VERO-5xx: Timeout errors (runtime)
 * - VERO-6xx: Navigation errors (runtime)
 * - VERO-7xx: Assertion errors (runtime)
 * - VERO-8xx: Browser errors (runtime)
 * - VERO-9xx: Network errors (runtime)
 */

import { ErrorCategory, FlakinessType } from './VeroError.js';

export interface ErrorCodeDefinition {
    code: string;
    category: ErrorCategory;
    title: string;
    description: string;
    flakiness: FlakinessType;
    retryable: boolean;
    defaultRetries: number;
}

// ==================== LEXER ERRORS (100-199) ====================

export const LEXER_ERRORS = {
    VERO_101: {
        code: 'VERO-101',
        category: 'lexer' as ErrorCategory,
        title: 'Unexpected Character',
        description: 'Found a character that is not allowed in Vero script',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_102: {
        code: 'VERO-102',
        category: 'lexer' as ErrorCategory,
        title: 'Unterminated String',
        description: 'A quoted string was started but never closed',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_103: {
        code: 'VERO-103',
        category: 'lexer' as ErrorCategory,
        title: 'Invalid Number',
        description: 'A number is not formatted correctly',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_104: {
        code: 'VERO-104',
        category: 'lexer' as ErrorCategory,
        title: 'Unknown Token',
        description: 'Could not recognize this text',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
};

// ==================== PARSER ERRORS (200-299) ====================

export const PARSER_ERRORS = {
    VERO_201: {
        code: 'VERO-201',
        category: 'parser' as ErrorCategory,
        title: 'Missing Keyword',
        description: 'Expected a specific keyword at this position',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_202: {
        code: 'VERO-202',
        category: 'parser' as ErrorCategory,
        title: 'Missing Brace',
        description: 'Expected { or } but found something else',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_203: {
        code: 'VERO-203',
        category: 'parser' as ErrorCategory,
        title: 'Invalid Statement',
        description: 'This line is not a valid Vero statement',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_204: {
        code: 'VERO-204',
        category: 'parser' as ErrorCategory,
        title: 'Missing String',
        description: 'Expected a quoted string value',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_205: {
        code: 'VERO-205',
        category: 'parser' as ErrorCategory,
        title: 'Missing Name',
        description: 'Expected a name (like a page or field name)',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_206: {
        code: 'VERO-206',
        category: 'parser' as ErrorCategory,
        title: 'Unexpected Token',
        description: 'Found something unexpected at this position',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_207: {
        code: 'VERO-207',
        category: 'parser' as ErrorCategory,
        title: 'Incomplete Statement',
        description: 'This statement is not complete',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
};

// ==================== VALIDATION ERRORS (300-399) ====================

export const VALIDATION_ERRORS = {
    VERO_301: {
        code: 'VERO-301',
        category: 'validation' as ErrorCategory,
        title: 'Undefined Page',
        description: 'This page is used but not defined',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_302: {
        code: 'VERO-302',
        category: 'validation' as ErrorCategory,
        title: 'Undefined Field',
        description: 'This field does not exist on the page',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_303: {
        code: 'VERO-303',
        category: 'validation' as ErrorCategory,
        title: 'Duplicate Definition',
        description: 'This name is already defined elsewhere',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_304: {
        code: 'VERO-304',
        category: 'validation' as ErrorCategory,
        title: 'Page Not Imported',
        description: 'Add USE PageName to import this page',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_305: {
        code: 'VERO-305',
        category: 'validation' as ErrorCategory,
        title: 'Undefined Action',
        description: 'This action does not exist on the page',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_306: {
        code: 'VERO-306',
        category: 'validation' as ErrorCategory,
        title: 'Wrong Number of Arguments',
        description: 'The action expects a different number of arguments',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_310: {
        code: 'VERO-310',
        category: 'validation' as ErrorCategory,
        title: 'Naming Convention',
        description: 'Names should follow the recommended style',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
};

// ==================== LOCATOR ERRORS (400-499) ====================

export const LOCATOR_ERRORS = {
    VERO_401: {
        code: 'VERO-401',
        category: 'locator' as ErrorCategory,
        title: 'Element Not Found',
        description: 'Could not find an element on the page',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 3,
    },
    VERO_402: {
        code: 'VERO-402',
        category: 'locator' as ErrorCategory,
        title: 'Multiple Elements Found',
        description: 'Found more than one matching element',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_403: {
        code: 'VERO-403',
        category: 'locator' as ErrorCategory,
        title: 'Element Not Visible',
        description: 'Element exists but is not visible',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_404: {
        code: 'VERO-404',
        category: 'locator' as ErrorCategory,
        title: 'Element Disabled',
        description: 'Cannot interact with a disabled element',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_405: {
        code: 'VERO-405',
        category: 'locator' as ErrorCategory,
        title: 'Element Detached',
        description: 'Element was removed from the page',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 3,
    },
    VERO_406: {
        code: 'VERO-406',
        category: 'locator' as ErrorCategory,
        title: 'Element Covered',
        description: 'Element is blocked by another element',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_407: {
        code: 'VERO-407',
        category: 'locator' as ErrorCategory,
        title: 'Element Outside Viewport',
        description: 'Element is outside the visible area',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
};

// ==================== TIMEOUT ERRORS (500-599) ====================

export const TIMEOUT_ERRORS = {
    VERO_501: {
        code: 'VERO-501',
        category: 'timeout' as ErrorCategory,
        title: 'Page Load Timeout',
        description: 'Page took too long to load',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_502: {
        code: 'VERO-502',
        category: 'timeout' as ErrorCategory,
        title: 'Element Wait Timeout',
        description: 'Waited too long for element to appear',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 3,
    },
    VERO_503: {
        code: 'VERO-503',
        category: 'timeout' as ErrorCategory,
        title: 'Navigation Timeout',
        description: 'Page navigation took too long',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_504: {
        code: 'VERO-504',
        category: 'timeout' as ErrorCategory,
        title: 'Network Idle Timeout',
        description: 'Network activity did not settle',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_505: {
        code: 'VERO-505',
        category: 'timeout' as ErrorCategory,
        title: 'Action Timeout',
        description: 'Click, fill, or other action took too long',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_506: {
        code: 'VERO-506',
        category: 'timeout' as ErrorCategory,
        title: 'Test Timeout',
        description: 'The entire test exceeded the time limit',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 1,
    },
};

// ==================== NAVIGATION ERRORS (600-699) ====================

export const NAVIGATION_ERRORS = {
    VERO_601: {
        code: 'VERO-601',
        category: 'navigation' as ErrorCategory,
        title: 'Invalid URL',
        description: 'The URL format is not valid',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_602: {
        code: 'VERO-602',
        category: 'navigation' as ErrorCategory,
        title: 'DNS Failed',
        description: 'Could not find the website address',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_603: {
        code: 'VERO-603',
        category: 'navigation' as ErrorCategory,
        title: 'Connection Refused',
        description: 'Server refused the connection',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_604: {
        code: 'VERO-604',
        category: 'navigation' as ErrorCategory,
        title: 'SSL Certificate Error',
        description: 'Website security certificate problem',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_605: {
        code: 'VERO-605',
        category: 'navigation' as ErrorCategory,
        title: 'HTTP Error',
        description: 'Server returned an error response',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_606: {
        code: 'VERO-606',
        category: 'navigation' as ErrorCategory,
        title: 'Page Not Found (404)',
        description: 'The requested page does not exist',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_607: {
        code: 'VERO-607',
        category: 'navigation' as ErrorCategory,
        title: 'Server Error (5xx)',
        description: 'Server encountered an internal error',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 3,
    },
    VERO_608: {
        code: 'VERO-608',
        category: 'navigation' as ErrorCategory,
        title: 'Network Offline',
        description: 'No internet connection',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 3,
    },
};

// ==================== ASSERTION ERRORS (700-799) ====================

export const ASSERTION_ERRORS = {
    VERO_701: {
        code: 'VERO-701',
        category: 'assertion' as ErrorCategory,
        title: 'Visibility Check Failed',
        description: 'Element visibility did not match expectation',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_702: {
        code: 'VERO-702',
        category: 'assertion' as ErrorCategory,
        title: 'Text Mismatch',
        description: 'Element text did not match expected value',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_703: {
        code: 'VERO-703',
        category: 'assertion' as ErrorCategory,
        title: 'Value Mismatch',
        description: 'Input value did not match expected value',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_704: {
        code: 'VERO-704',
        category: 'assertion' as ErrorCategory,
        title: 'Count Mismatch',
        description: 'Number of elements did not match',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_705: {
        code: 'VERO-705',
        category: 'assertion' as ErrorCategory,
        title: 'URL Mismatch',
        description: 'Page URL did not match expected pattern',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_706: {
        code: 'VERO-706',
        category: 'assertion' as ErrorCategory,
        title: 'Title Mismatch',
        description: 'Page title did not match expected value',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_707: {
        code: 'VERO-707',
        category: 'assertion' as ErrorCategory,
        title: 'Attribute Mismatch',
        description: 'Element attribute did not match expected value',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_708: {
        code: 'VERO-708',
        category: 'assertion' as ErrorCategory,
        title: 'State Mismatch',
        description: 'Element state (enabled/checked/focused) did not match',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
};

// ==================== BROWSER ERRORS (800-899) ====================

export const BROWSER_ERRORS = {
    VERO_801: {
        code: 'VERO-801',
        category: 'browser' as ErrorCategory,
        title: 'Browser Crashed',
        description: 'The browser stopped unexpectedly',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_802: {
        code: 'VERO-802',
        category: 'browser' as ErrorCategory,
        title: 'Browser Not Installed',
        description: 'Required browser is not installed',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_803: {
        code: 'VERO-803',
        category: 'browser' as ErrorCategory,
        title: 'Context Closed',
        description: 'Browser context was closed unexpectedly',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_804: {
        code: 'VERO-804',
        category: 'browser' as ErrorCategory,
        title: 'Page Closed',
        description: 'Browser tab was closed unexpectedly',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_805: {
        code: 'VERO-805',
        category: 'browser' as ErrorCategory,
        title: 'Frame Detached',
        description: 'The frame was removed from the page',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
    VERO_806: {
        code: 'VERO-806',
        category: 'browser' as ErrorCategory,
        title: 'Popup Not Found',
        description: 'Expected popup window did not appear',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
};

// ==================== NETWORK ERRORS (900-999) ====================

export const NETWORK_ERRORS = {
    VERO_901: {
        code: 'VERO-901',
        category: 'network' as ErrorCategory,
        title: 'Offline',
        description: 'No internet connection available',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 3,
    },
    VERO_902: {
        code: 'VERO-902',
        category: 'network' as ErrorCategory,
        title: 'Request Failed',
        description: 'Network request did not complete',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 3,
    },
    VERO_903: {
        code: 'VERO-903',
        category: 'network' as ErrorCategory,
        title: 'CORS Error',
        description: 'Request blocked by browser security',
        flakiness: 'permanent' as FlakinessType,
        retryable: false,
        defaultRetries: 0,
    },
    VERO_904: {
        code: 'VERO-904',
        category: 'network' as ErrorCategory,
        title: 'Request Timeout',
        description: 'Network request took too long',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 3,
    },
    VERO_905: {
        code: 'VERO-905',
        category: 'network' as ErrorCategory,
        title: 'WebSocket Error',
        description: 'WebSocket connection failed',
        flakiness: 'flaky' as FlakinessType,
        retryable: true,
        defaultRetries: 2,
    },
};

// ==================== ALL ERROR CODES ====================

export const ERROR_CODES: Record<string, ErrorCodeDefinition> = {
    ...LEXER_ERRORS,
    ...PARSER_ERRORS,
    ...VALIDATION_ERRORS,
    ...LOCATOR_ERRORS,
    ...TIMEOUT_ERRORS,
    ...NAVIGATION_ERRORS,
    ...ASSERTION_ERRORS,
    ...BROWSER_ERRORS,
    ...NETWORK_ERRORS,
};

/**
 * Get error code definition by code string
 */
export function getErrorCode(code: string): ErrorCodeDefinition | undefined {
    const normalized = code.replace('-', '_').toUpperCase();
    return ERROR_CODES[normalized];
}

/**
 * Get all error codes for a category
 */
export function getErrorCodesForCategory(category: ErrorCategory): ErrorCodeDefinition[] {
    return Object.values(ERROR_CODES).filter((def) => def.category === category);
}

/**
 * Check if an error code exists
 */
export function isValidErrorCode(code: string): boolean {
    return getErrorCode(code) !== undefined;
}

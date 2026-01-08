/**
 * Vero Error Handling System
 *
 * Provides user-friendly error messages for non-technical QA testers
 * with IntelliJ-like compile-time errors and Playwright runtime error mapping.
 */

// Base error class
export {
    VeroError,
    type VeroErrorData,
    type VeroErrorJSON,
    type ErrorSeverity,
    type ErrorCategory,
    type ErrorLocation,
    type ErrorSuggestion,
    type FlakinessType,
} from './VeroError.js';

// Error codes
export {
    ERROR_CODES,
    LEXER_ERRORS,
    PARSER_ERRORS,
    VALIDATION_ERRORS,
    LOCATOR_ERRORS,
    TIMEOUT_ERRORS,
    NAVIGATION_ERRORS,
    ASSERTION_ERRORS,
    BROWSER_ERRORS,
    NETWORK_ERRORS,
    getErrorCode,
    getErrorCodesForCategory,
    isValidErrorCode,
    type ErrorCodeDefinition,
} from './codes.js';

// Error categories
export {
    // Compile-time
    LexerError,
    ParserError,
    ValidationError,
    // Runtime
    LocatorError,
    TimeoutError,
    NavigationError,
    AssertionError,
    BrowserError,
    NetworkError,
} from './categories/index.js';

// Monaco adapter
export {
    veroErrorToMonacoMarker,
    veroErrorsToMonacoMarkers,
    convertLexerErrors,
    convertParseErrors,
    convertValidationErrors,
    compileResultsToMonacoMarkers,
    createQuickMarker,
    getMarkerStats,
    MonacoSeverity,
    type MonacoMarkerData,
} from './monacoAdapter.js';

// Playwright error mapper
export {
    PlaywrightErrorMapper,
    playwrightErrorMapper,
    mapPlaywrightError,
    isRetryableError,
    getErrorCategory,
    type SourceMapEntry,
} from './mappers/PlaywrightErrorMapper.js';

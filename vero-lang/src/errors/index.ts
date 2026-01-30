/**
 * Vero Error Handling System
 *
 * Provides user-friendly error messages for non-technical QA testers
 * with IntelliJ-like compile-time errors and Playwright runtime error mapping.
 */

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

export {
    VeroErrorCode,
    VeroErrorSeverity,
    ValidationResult,
    VeroValidationError,
    createValidationResult,
    levenshteinDistance,
    findSimilar,
    VERO_KEYWORDS,
    type VeroKeyword,
} from './VeroErrors.js';

export { VeroErrorListener } from './VeroErrorListener.js';

export { SemanticValidator } from '../validator/SemanticValidator.js';

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

export {
    LexerError,
    ParserError,
    ValidationError,
    LocatorError,
    TimeoutError,
    NavigationError,
    AssertionError,
    BrowserError,
    NetworkError,
} from './categories/index.js';

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

export {
    PlaywrightErrorMapper,
    playwrightErrorMapper,
    mapPlaywrightError,
    isRetryableError,
    getErrorCategory,
    type SourceMapEntry,
} from './mappers/PlaywrightErrorMapper.js';

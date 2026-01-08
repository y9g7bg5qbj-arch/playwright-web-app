/**
 * VeroError - Base error class for all Vero IDE errors
 *
 * Provides user-friendly error messages for non-technical QA testers
 * with "What went wrong" and "How to fix it" format.
 */

export type ErrorSeverity = 'error' | 'warning' | 'info' | 'hint';

export type ErrorCategory =
    // Compile-time categories
    | 'lexer'
    | 'parser'
    | 'validation'
    // Runtime categories
    | 'locator'
    | 'timeout'
    | 'navigation'
    | 'assertion'
    | 'browser'
    | 'network'
    | 'interaction'
    | 'script'
    | 'frame'
    | 'resource'
    | 'artifact';

export type FlakinessType = 'permanent' | 'flaky' | 'unknown';

export interface ErrorLocation {
    line: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
    /** Original Vero script line (for runtime errors) */
    veroLine?: number;
    /** Generated Playwright line (for source mapping) */
    playwrightLine?: number;
}

export interface ErrorSuggestion {
    text: string;
    action?: 'fix' | 'retry' | 'investigate';
}

export interface VeroErrorData {
    code: string;                    // VERO-401
    category: ErrorCategory;
    severity: ErrorSeverity;
    location?: ErrorLocation;

    // User-facing messages (required)
    title: string;                   // "Element Not Found"
    whatWentWrong: string;           // "Could not find the 'Login' button on the page"
    howToFix: string;                // "Make sure the button text matches..."

    // Technical details (hidden by default in UI)
    technicalMessage?: string;       // Original Playwright/parser message
    stackTrace?: string;

    // Classification for runtime errors
    flakiness: FlakinessType;
    retryable: boolean;
    suggestedRetries?: number;

    // Context
    veroStatement?: string;          // "click LoginPage.loginButton"
    selector?: string;               // For locator errors: "[data-testid='login']"
    expectedValue?: string;          // For assertion errors
    actualValue?: string;

    suggestions: ErrorSuggestion[];
}

/**
 * Serializable error data for API/WebSocket transmission
 */
export interface VeroErrorJSON {
    code: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    location?: ErrorLocation;
    title: string;
    whatWentWrong: string;
    howToFix: string;
    technicalMessage?: string;
    flakiness: FlakinessType;
    retryable: boolean;
    suggestedRetries: number;
    suggestions: ErrorSuggestion[];
    veroStatement?: string;
    selector?: string;
    expectedValue?: string;
    actualValue?: string;
}

/**
 * Base class for all Vero errors.
 * Extends native Error but adds user-friendly messaging.
 */
export class VeroError extends Error {
    public readonly code: string;
    public readonly category: ErrorCategory;
    public readonly severity: ErrorSeverity;
    public readonly location?: ErrorLocation;
    public readonly title: string;
    public readonly whatWentWrong: string;
    public readonly howToFix: string;
    public readonly technicalMessage?: string;
    public readonly flakiness: FlakinessType;
    public readonly retryable: boolean;
    public readonly suggestedRetries: number;
    public readonly suggestions: ErrorSuggestion[];
    public readonly veroStatement?: string;
    public readonly selector?: string;
    public readonly expectedValue?: string;
    public readonly actualValue?: string;

    constructor(data: VeroErrorData) {
        // Use whatWentWrong as the Error message
        super(data.whatWentWrong);
        this.name = 'VeroError';

        this.code = data.code;
        this.category = data.category;
        this.severity = data.severity;
        this.location = data.location;
        this.title = data.title;
        this.whatWentWrong = data.whatWentWrong;
        this.howToFix = data.howToFix;
        this.technicalMessage = data.technicalMessage;
        this.flakiness = data.flakiness;
        this.retryable = data.retryable;
        this.suggestedRetries = data.suggestedRetries ?? 0;
        this.suggestions = data.suggestions;
        this.veroStatement = data.veroStatement;
        this.selector = data.selector;
        this.expectedValue = data.expectedValue;
        this.actualValue = data.actualValue;

        // Maintain proper prototype chain
        Object.setPrototypeOf(this, VeroError.prototype);
    }

    /**
     * Format for display in error panel (multi-line)
     */
    toDisplayMessage(): string {
        let msg = `${this.title} [${this.code}]\n\n`;
        msg += `What went wrong:\n${this.whatWentWrong}\n\n`;
        msg += `How to fix:\n${this.howToFix}`;

        if (this.suggestions.length > 0) {
            msg += '\n\nSuggestions:\n';
            for (const s of this.suggestions) {
                msg += `  - ${s.text}\n`;
            }
        }

        return msg;
    }

    /**
     * Format for Monaco editor hover tooltip (HTML)
     */
    toTooltipHtml(): string {
        let html = `<strong>${escapeHtml(this.title)}</strong> <code>${this.code}</code><br/><br/>`;
        html += `${escapeHtml(this.whatWentWrong)}<br/><br/>`;
        html += `<em>How to fix:</em> ${escapeHtml(this.howToFix)}`;

        if (this.suggestions.length > 0) {
            html += '<br/><br/><em>Suggestions:</em><ul>';
            for (const s of this.suggestions) {
                html += `<li>${escapeHtml(s.text)}</li>`;
            }
            html += '</ul>';
        }

        return html;
    }

    /**
     * Short one-line summary for status bar or inline display
     */
    toShortMessage(): string {
        return `${this.code}: ${this.title}`;
    }

    /**
     * Serialize for WebSocket/API transmission
     */
    toJSON(): VeroErrorJSON {
        return {
            code: this.code,
            category: this.category,
            severity: this.severity,
            location: this.location,
            title: this.title,
            whatWentWrong: this.whatWentWrong,
            howToFix: this.howToFix,
            technicalMessage: this.technicalMessage,
            flakiness: this.flakiness,
            retryable: this.retryable,
            suggestedRetries: this.suggestedRetries,
            suggestions: this.suggestions,
            veroStatement: this.veroStatement,
            selector: this.selector,
            expectedValue: this.expectedValue,
            actualValue: this.actualValue,
        };
    }

    /**
     * Create VeroError from JSON (for deserialization)
     */
    static fromJSON(json: VeroErrorJSON): VeroError {
        return new VeroError({
            ...json,
            suggestions: json.suggestions || [],
        });
    }

    /**
     * Check if this error should trigger a retry
     */
    shouldRetry(attemptNumber: number): boolean {
        if (!this.retryable) return false;
        return attemptNumber < this.suggestedRetries;
    }

    /**
     * Check if this is a compile-time error (not runtime)
     */
    isCompileTime(): boolean {
        return ['lexer', 'parser', 'validation'].includes(this.category);
    }

    /**
     * Check if this is a runtime execution error
     */
    isRuntime(): boolean {
        return !this.isCompileTime();
    }
}

/**
 * Escape HTML entities for safe tooltip display
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

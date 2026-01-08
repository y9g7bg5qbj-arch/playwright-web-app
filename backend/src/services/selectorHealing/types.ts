/**
 * Selector Healing Types
 *
 * Types for resilient selector generation with fallbacks and confidence scores.
 */

/**
 * A single selector candidate with metadata
 */
export interface SelectorCandidate {
    /** Selector strategy type */
    strategy: 'testId' | 'role' | 'label' | 'placeholder' | 'text' | 'css' | 'xpath' | 'altText' | 'title' | 'id';

    /** The actual selector string in Vero format */
    selector: string;

    /** Playwright format selector for execution */
    playwrightSelector: string;

    /** Confidence score 0-100 */
    confidence: number;

    /** Whether this selector is stable (won't change with i18n, dynamic content) */
    isStable: boolean;

    /** Human-readable description */
    description?: string;
}

/**
 * Element fingerprint for visual/structural matching
 */
export interface ElementFingerprint {
    /** HTML tag name */
    tagName: string;

    /** Bounding box on page */
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };

    /** Visual hash for image-based matching (future) */
    visualHash?: string;

    /** DOM path from root */
    domPath?: string[];

    /** Parent element selectors */
    parentChain?: string[];

    /** Sibling context */
    siblingIndex?: number;

    /** Inner text content */
    textContent?: string;
}

/**
 * A resilient selector with primary and fallback options
 */
export interface ResilientSelector {
    /** Primary selector (best confidence) */
    primary: SelectorCandidate;

    /** Fallback selectors in order of preference */
    fallbacks: SelectorCandidate[];

    /** Element fingerprint for recovery */
    fingerprint?: ElementFingerprint;

    /** Overall confidence score */
    overallConfidence: number;

    /** Whether this selector set is considered reliable */
    isReliable: boolean;
}

/**
 * Element information captured during recording
 */
export interface CapturedElement {
    tagName: string;
    id?: string;
    testId?: string;
    role?: string;
    ariaLabel?: string;
    innerText?: string;
    placeholder?: string;
    alt?: string;
    title?: string;
    className?: string;
    name?: string;
    type?: string;
    href?: string;
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

/**
 * Selector validation result
 */
export interface SelectorValidationResult {
    /** Whether the selector is valid */
    isValid: boolean;

    /** Number of elements matched */
    matchCount: number;

    /** Whether the selector uniquely identifies one element */
    isUnique: boolean;

    /** Suggested alternative if not valid/unique */
    suggestedFix?: string;

    /** Error message if validation failed */
    error?: string;
}

/**
 * Priority weights for different selector strategies
 */
export const SELECTOR_STABILITY: Record<string, number> = {
    testId: 100,      // Most stable - explicit test hooks
    role: 85,         // Stable - semantic roles
    label: 80,        // Stable - form labels
    placeholder: 70,  // Moderately stable - may change
    altText: 75,      // Stable - accessibility
    title: 65,        // Less stable - may change
    id: 60,           // Variable - may be auto-generated
    text: 40,         // Unstable - changes with i18n
    css: 30,          // Unstable - breaks with UI changes
    xpath: 20,        // Most fragile
};

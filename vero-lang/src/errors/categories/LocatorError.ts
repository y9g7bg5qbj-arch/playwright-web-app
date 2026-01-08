/**
 * LocatorError - Element locator/selector errors
 *
 * These errors occur when Playwright cannot find, interact with,
 * or access elements on the page.
 */

import { VeroError, VeroErrorData, ErrorLocation } from '../VeroError.js';

export class LocatorError extends VeroError {
    constructor(data: Omit<VeroErrorData, 'category'>) {
        super({ ...data, category: 'locator' });
        this.name = 'LocatorError';
    }

    /**
     * Element not found on page
     */
    static notFound(
        selector: string,
        veroStatement: string,
        location?: ErrorLocation
    ): LocatorError {
        return new LocatorError({
            code: 'VERO-401',
            severity: 'error',
            location,
            title: 'Element Not Found',
            whatWentWrong: `Could not find an element matching "${selector}" on the page.`,
            howToFix: `Make sure the element exists on the page. Check that:
- The page has fully loaded before this step
- The element text or identifier is spelled correctly
- The element is not hidden or removed by JavaScript`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 3,
            veroStatement,
            selector,
            suggestions: [
                { text: 'Add a wait before this step', action: 'fix' },
                { text: 'Check if the element appears after a button click', action: 'investigate' },
                { text: 'Try using a different selector (testId, role, text)', action: 'fix' },
            ],
        });
    }

    /**
     * Multiple elements match the selector
     */
    static ambiguous(
        selector: string,
        matchCount: number,
        veroStatement: string,
        location?: ErrorLocation
    ): LocatorError {
        return new LocatorError({
            code: 'VERO-402',
            severity: 'error',
            location,
            title: 'Multiple Elements Found',
            whatWentWrong: `Found ${matchCount} elements matching "${selector}". Expected exactly one.`,
            howToFix: `Make your selector more specific:
- Add more text to make it unique
- Use a testId attribute: testId "unique-id"
- Combine with a parent element: "Form" > "Submit"`,
            flakiness: 'permanent',
            retryable: false,
            veroStatement,
            selector,
            suggestions: [
                { text: 'Use .first() to get the first match', action: 'fix' },
                { text: 'Add a more specific parent selector', action: 'fix' },
                { text: 'Add a testId to the element in the application', action: 'investigate' },
            ],
        });
    }

    /**
     * Element exists but is not visible
     */
    static notVisible(
        selector: string,
        veroStatement: string,
        location?: ErrorLocation
    ): LocatorError {
        return new LocatorError({
            code: 'VERO-403',
            severity: 'error',
            location,
            title: 'Element Not Visible',
            whatWentWrong: `The element "${selector}" exists but is not visible on screen.`,
            howToFix: `The element may be:
- Hidden with CSS (display: none or visibility: hidden)
- Off-screen (requires scrolling)
- Covered by another element (modal, overlay)`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            selector,
            suggestions: [
                { text: 'Add a scroll action before this step', action: 'fix' },
                { text: 'Wait for any overlays to close', action: 'fix' },
                { text: 'Check if the element is in a collapsed section', action: 'investigate' },
            ],
        });
    }

    /**
     * Element is disabled
     */
    static disabled(
        selector: string,
        veroStatement: string,
        location?: ErrorLocation
    ): LocatorError {
        return new LocatorError({
            code: 'VERO-404',
            severity: 'error',
            location,
            title: 'Element Disabled',
            whatWentWrong: `Cannot interact with "${selector}" because it is disabled.`,
            howToFix: `The element is currently disabled. This often happens when:
- Required form fields are not filled
- A previous action is still processing
- The user lacks permission for this action`,
            flakiness: 'permanent',
            retryable: false,
            veroStatement,
            selector,
            suggestions: [
                { text: 'Fill in required fields first', action: 'investigate' },
                { text: 'Wait for the element to become enabled', action: 'fix' },
                { text: 'Check if there are validation errors on the form', action: 'investigate' },
            ],
        });
    }

    /**
     * Element was detached from DOM
     */
    static detached(
        selector: string,
        veroStatement: string,
        location?: ErrorLocation
    ): LocatorError {
        return new LocatorError({
            code: 'VERO-405',
            severity: 'error',
            location,
            title: 'Element Disappeared',
            whatWentWrong: `The element "${selector}" was found but then disappeared from the page.`,
            howToFix: `The page changed while trying to interact with the element. This can happen when:
- A JavaScript framework re-renders the page
- The page navigates to a new URL
- Content loads dynamically`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 3,
            veroStatement,
            selector,
            suggestions: [
                { text: 'Add a wait for the page to stabilize', action: 'fix' },
                { text: 'Re-locate the element after page changes', action: 'fix' },
            ],
        });
    }

    /**
     * Element is covered by another element
     */
    static covered(
        selector: string,
        veroStatement: string,
        location?: ErrorLocation,
        coveringElement?: string
    ): LocatorError {
        const coveringInfo = coveringElement
            ? ` It is covered by "${coveringElement}".`
            : ' It is covered by another element (possibly a modal, overlay, or tooltip).';

        return new LocatorError({
            code: 'VERO-406',
            severity: 'error',
            location,
            title: 'Element Covered',
            whatWentWrong: `Cannot click on "${selector}" because it is blocked.${coveringInfo}`,
            howToFix: `Wait for the covering element to disappear, or close it first. Common causes:
- Modal dialogs
- Cookie consent banners
- Loading overlays
- Tooltips`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            selector,
            suggestions: [
                { text: 'Close or dismiss any overlays first', action: 'fix' },
                { text: 'Wait for loading indicators to disappear', action: 'fix' },
                { text: 'Use force click if the overlay is decorative', action: 'fix' },
            ],
        });
    }

    /**
     * Element is outside viewport
     */
    static outsideViewport(
        selector: string,
        veroStatement: string,
        location?: ErrorLocation
    ): LocatorError {
        return new LocatorError({
            code: 'VERO-407',
            severity: 'error',
            location,
            title: 'Element Outside Viewport',
            whatWentWrong: `The element "${selector}" is outside the visible area of the page.`,
            howToFix: `The element needs to be scrolled into view before interacting with it. Add a scroll action or use auto-scroll option.`,
            flakiness: 'flaky',
            retryable: true,
            suggestedRetries: 2,
            veroStatement,
            selector,
            suggestions: [
                { text: 'Add SCROLL TO element before this step', action: 'fix' },
                { text: 'Enable auto-scroll in test options', action: 'fix' },
            ],
        });
    }
}

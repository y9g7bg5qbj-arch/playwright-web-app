/**
 * Action Catalog — single source of truth for all slash-builder actions.
 *
 * Each entry defines the palette label, snippet template for Monaco insertion,
 * the slot schema for the fill-in-the-blank form, and the template used by
 * buildSnippet() to compose the final Vero line.
 *
 * Covers all statement types from the Vero parser (parser.ts parseStatement).
 */

import type { ActionDef } from './types';

export const ACTION_CATALOG: ActionDef[] = [
    // ========================================================================
    // INTERACT
    // ========================================================================
    {
        id: 'click',
        label: 'CLICK',
        keywords: ['CLICK', 'TAP'],
        template: 'CLICK {target}',
        snippetTemplate: 'CLICK ${1:‹target›}',
        category: 'interact',
        description: 'Click an element',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
        ],
    },
    {
        id: 'fill',
        label: 'FILL',
        keywords: ['FILL', 'TYPE', 'INPUT', 'ENTER'],
        template: 'FILL {target} WITH "{value}"',
        snippetTemplate: 'FILL ${1:‹target›} WITH "${2:‹value›}"',
        category: 'interact',
        description: 'Type text into an input field',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
            { id: 'value', kind: 'text', label: 'value' },
        ],
    },
    {
        id: 'right-click',
        label: 'RIGHT CLICK',
        keywords: ['RIGHT', 'CLICK', 'CONTEXT'],
        template: 'RIGHT CLICK {target}',
        snippetTemplate: 'RIGHT CLICK ${1:‹target›}',
        category: 'interact',
        description: 'Right-click an element',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
        ],
    },
    {
        id: 'double-click',
        label: 'DOUBLE CLICK',
        keywords: ['DOUBLE', 'CLICK'],
        template: 'DOUBLE CLICK {target}',
        snippetTemplate: 'DOUBLE CLICK ${1:‹target›}',
        category: 'interact',
        description: 'Double-click an element',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
        ],
    },
    {
        id: 'force-click',
        label: 'FORCE CLICK',
        keywords: ['FORCE', 'CLICK'],
        template: 'FORCE CLICK {target}',
        snippetTemplate: 'FORCE CLICK ${1:‹target›}',
        category: 'interact',
        description: 'Force-click an element (bypasses actionability checks)',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
        ],
    },
    {
        id: 'hover',
        label: 'HOVER',
        keywords: ['HOVER', 'MOUSE'],
        template: 'HOVER {target}',
        snippetTemplate: 'HOVER ${1:‹target›}',
        category: 'interact',
        description: 'Hover over an element',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
        ],
    },
    {
        id: 'check',
        label: 'CHECK',
        keywords: ['CHECK', 'TICK', 'TOGGLE'],
        template: 'CHECK {target}',
        snippetTemplate: 'CHECK ${1:‹target›}',
        category: 'interact',
        description: 'Check a checkbox',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
        ],
    },
    {
        id: 'uncheck',
        label: 'UNCHECK',
        keywords: ['UNCHECK', 'UNTICK'],
        template: 'UNCHECK {target}',
        snippetTemplate: 'UNCHECK ${1:‹target›}',
        category: 'interact',
        description: 'Uncheck a checkbox',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
        ],
    },
    {
        id: 'select',
        label: 'SELECT',
        keywords: ['SELECT', 'DROPDOWN', 'OPTION', 'CHOOSE'],
        template: 'SELECT "{value}" FROM {target}',
        snippetTemplate: 'SELECT "${1:‹value›}" FROM ${2:‹target›}',
        category: 'interact',
        description: 'Select an option from a dropdown',
        slots: [
            { id: 'value', kind: 'text', label: 'option value' },
            { id: 'target', kind: 'page-field', label: 'dropdown' },
        ],
    },
    {
        id: 'press',
        label: 'PRESS',
        keywords: ['PRESS', 'KEY', 'KEYBOARD'],
        template: 'PRESS "{key}"',
        snippetTemplate: 'PRESS "${1:‹key›}"',
        category: 'interact',
        description: 'Press a keyboard key',
        slots: [
            { id: 'key', kind: 'key', label: 'key' },
        ],
    },
    {
        id: 'drag',
        label: 'DRAG … TO',
        keywords: ['DRAG', 'DROP', 'MOVE'],
        template: 'DRAG {source} TO {destination}',
        snippetTemplate: 'DRAG ${1:‹source›} TO ${2:‹destination›}',
        category: 'interact',
        description: 'Drag an element to another element',
        slots: [
            { id: 'source', kind: 'page-field', label: 'source' },
            { id: 'destination', kind: 'page-field', label: 'destination' },
        ],
    },
    {
        id: 'clear',
        label: 'CLEAR',
        keywords: ['CLEAR', 'EMPTY', 'RESET'],
        template: 'CLEAR {target}',
        snippetTemplate: 'CLEAR ${1:‹target›}',
        category: 'interact',
        description: 'Clear an input field',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
        ],
    },
    {
        id: 'scroll-down',
        label: 'SCROLL DOWN',
        keywords: ['SCROLL', 'DOWN'],
        template: 'SCROLL DOWN',
        snippetTemplate: 'SCROLL DOWN',
        category: 'interact',
        description: 'Scroll the page down',
        slots: [],
    },
    {
        id: 'scroll-up',
        label: 'SCROLL UP',
        keywords: ['SCROLL', 'UP'],
        template: 'SCROLL UP',
        snippetTemplate: 'SCROLL UP',
        category: 'interact',
        description: 'Scroll the page up',
        slots: [],
    },
    {
        id: 'scroll-to',
        label: 'SCROLL TO',
        keywords: ['SCROLL', 'TO', 'ELEMENT'],
        template: 'SCROLL TO {target}',
        snippetTemplate: 'SCROLL TO ${1:‹target›}',
        category: 'interact',
        description: 'Scroll to an element',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
        ],
    },
    {
        id: 'upload',
        label: 'UPLOAD',
        keywords: ['UPLOAD', 'FILE', 'ATTACH'],
        template: 'UPLOAD "{file}" TO {target}',
        snippetTemplate: 'UPLOAD "${1:‹file›}" TO ${2:‹target›}',
        category: 'interact',
        description: 'Upload a file to an input',
        slots: [
            { id: 'file', kind: 'text', label: 'file path' },
            { id: 'target', kind: 'page-field', label: 'target' },
        ],
    },
    {
        id: 'download',
        label: 'DOWNLOAD FROM',
        keywords: ['DOWNLOAD', 'SAVE', 'FILE'],
        template: 'DOWNLOAD FROM {target}',
        snippetTemplate: 'DOWNLOAD FROM ${1:‹target›}',
        category: 'interact',
        description: 'Download a file by clicking an element',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
        ],
    },
    {
        id: 'download-as',
        label: 'DOWNLOAD FROM … AS',
        keywords: ['DOWNLOAD', 'SAVE', 'AS', 'RENAME'],
        template: 'DOWNLOAD FROM {target} AS "{filename}"',
        snippetTemplate: 'DOWNLOAD FROM ${1:‹target›} AS "${2:‹filename›}"',
        category: 'interact',
        description: 'Download a file and save with a custom name',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
            { id: 'filename', kind: 'text', label: 'filename' },
        ],
    },

    // ========================================================================
    // NAVIGATE
    // ========================================================================
    {
        id: 'open',
        label: 'OPEN',
        keywords: ['OPEN', 'NAVIGATE', 'GO', 'URL'],
        template: 'OPEN "{url}"',
        snippetTemplate: 'OPEN "${1:‹url›}"',
        category: 'navigate',
        description: 'Navigate to a URL',
        slots: [
            { id: 'url', kind: 'text', label: 'url' },
        ],
    },
    {
        id: 'open-new-tab',
        label: 'OPEN IN NEW TAB',
        keywords: ['OPEN', 'NEW', 'TAB'],
        template: 'OPEN "{url}" IN NEW TAB',
        snippetTemplate: 'OPEN "${1:‹url›}" IN NEW TAB',
        category: 'navigate',
        description: 'Open a URL in a new tab',
        slots: [
            { id: 'url', kind: 'text', label: 'url' },
        ],
    },
    {
        id: 'refresh',
        label: 'REFRESH',
        keywords: ['REFRESH', 'RELOAD'],
        template: 'REFRESH',
        snippetTemplate: 'REFRESH',
        category: 'navigate',
        description: 'Refresh the current page',
        slots: [],
    },
    {
        id: 'perform',
        label: 'PERFORM',
        keywords: ['PERFORM', 'ACTION', 'CALL', 'DO'],
        template: 'PERFORM {action}',
        snippetTemplate: 'PERFORM ${1:‹action›}',
        category: 'navigate',
        description: 'Call a reusable page action',
        slots: [
            { id: 'action', kind: 'page-action', label: 'action' },
        ],
    },

    // ========================================================================
    // TAB & FRAME
    // ========================================================================
    {
        id: 'switch-new-tab',
        label: 'SWITCH TO NEW TAB',
        keywords: ['SWITCH', 'NEW', 'TAB'],
        template: 'SWITCH TO NEW TAB',
        snippetTemplate: 'SWITCH TO NEW TAB',
        category: 'tab',
        description: 'Switch to the newly opened tab',
        slots: [],
    },
    {
        id: 'switch-new-tab-url',
        label: 'SWITCH TO NEW TAB (url)',
        keywords: ['SWITCH', 'NEW', 'TAB', 'URL'],
        template: 'SWITCH TO NEW TAB "{url}"',
        snippetTemplate: 'SWITCH TO NEW TAB "${1:‹url›}"',
        category: 'tab',
        description: 'Switch to new tab opened with a specific URL',
        slots: [
            { id: 'url', kind: 'text', label: 'url' },
        ],
    },
    {
        id: 'switch-tab',
        label: 'SWITCH TO TAB',
        keywords: ['SWITCH', 'TAB', 'INDEX'],
        template: 'SWITCH TO TAB {index}',
        snippetTemplate: 'SWITCH TO TAB ${1:‹index›}',
        category: 'tab',
        description: 'Switch to a tab by index (1-based)',
        slots: [
            { id: 'index', kind: 'number', label: 'tab index' },
        ],
    },
    {
        id: 'close-tab',
        label: 'CLOSE TAB',
        keywords: ['CLOSE', 'TAB'],
        template: 'CLOSE TAB',
        snippetTemplate: 'CLOSE TAB',
        category: 'tab',
        description: 'Close the current tab',
        slots: [],
    },
    {
        id: 'switch-frame',
        label: 'SWITCH TO FRAME',
        keywords: ['SWITCH', 'FRAME', 'IFRAME'],
        template: 'SWITCH TO FRAME {target}',
        snippetTemplate: 'SWITCH TO FRAME ${1:‹selector›}',
        category: 'tab',
        description: 'Switch to an iframe',
        slots: [
            { id: 'target', kind: 'page-field', label: 'selector' },
        ],
    },
    {
        id: 'switch-main-frame',
        label: 'SWITCH TO MAIN FRAME',
        keywords: ['SWITCH', 'MAIN', 'FRAME', 'PARENT'],
        template: 'SWITCH TO MAIN FRAME',
        snippetTemplate: 'SWITCH TO MAIN FRAME',
        category: 'tab',
        description: 'Switch back to the main frame',
        slots: [],
    },

    // ========================================================================
    // DIALOG
    // ========================================================================
    {
        id: 'accept-dialog',
        label: 'ACCEPT DIALOG',
        keywords: ['ACCEPT', 'DIALOG', 'ALERT', 'CONFIRM', 'OK'],
        template: 'ACCEPT DIALOG',
        snippetTemplate: 'ACCEPT DIALOG',
        category: 'dialog',
        description: 'Accept (OK) a browser dialog',
        slots: [],
    },
    {
        id: 'accept-dialog-with',
        label: 'ACCEPT DIALOG WITH',
        keywords: ['ACCEPT', 'DIALOG', 'PROMPT', 'TEXT'],
        template: 'ACCEPT DIALOG WITH "{text}"',
        snippetTemplate: 'ACCEPT DIALOG WITH "${1:‹text›}"',
        category: 'dialog',
        description: 'Accept a prompt dialog with text input',
        slots: [
            { id: 'text', kind: 'text', label: 'response text' },
        ],
    },
    {
        id: 'dismiss-dialog',
        label: 'DISMISS DIALOG',
        keywords: ['DISMISS', 'DIALOG', 'CANCEL', 'CLOSE'],
        template: 'DISMISS DIALOG',
        snippetTemplate: 'DISMISS DIALOG',
        category: 'dialog',
        description: 'Dismiss (Cancel) a browser dialog',
        slots: [],
    },

    // ========================================================================
    // ASSERT
    // ========================================================================
    {
        id: 'verify-state',
        label: 'VERIFY state',
        keywords: ['VERIFY', 'ASSERT', 'VISIBLE', 'HIDDEN', 'ENABLED', 'DISABLED', 'CHECKED'],
        template: 'VERIFY {target} {condition}',
        snippetTemplate: 'VERIFY ${1:‹target›} ${2:‹condition›}',
        category: 'assert',
        description: 'Assert element visibility or state',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
            {
                id: 'condition',
                kind: 'select',
                label: 'condition',
                options: [
                    'IS VISIBLE',
                    'IS HIDDEN',
                    'IS ENABLED',
                    'IS DISABLED',
                    'IS CHECKED',
                    'IS NOT CHECKED',
                    'IS FOCUSED',
                    'IS EMPTY',
                ],
            },
        ],
    },
    {
        id: 'verify-text',
        label: 'VERIFY HAS TEXT',
        keywords: ['VERIFY', 'ASSERT', 'TEXT', 'HAS'],
        template: 'VERIFY {target} HAS TEXT "{value}"',
        snippetTemplate: 'VERIFY ${1:‹target›} HAS TEXT "${2:‹value›}"',
        category: 'assert',
        description: 'Assert element has exact text',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
            { id: 'value', kind: 'text', label: 'text' },
        ],
    },
    {
        id: 'verify-contains-text',
        label: 'VERIFY CONTAINS TEXT',
        keywords: ['VERIFY', 'CONTAINS', 'TEXT'],
        template: 'VERIFY {target} CONTAINS TEXT "{value}"',
        snippetTemplate: 'VERIFY ${1:‹target›} CONTAINS TEXT "${2:‹value›}"',
        category: 'assert',
        description: 'Assert element contains text content',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
            { id: 'value', kind: 'text', label: 'text' },
        ],
    },
    {
        id: 'verify-has-value',
        label: 'VERIFY HAS VALUE',
        keywords: ['VERIFY', 'HAS', 'VALUE'],
        template: 'VERIFY {target} HAS VALUE "{value}"',
        snippetTemplate: 'VERIFY ${1:‹target›} HAS VALUE "${2:‹value›}"',
        category: 'assert',
        description: 'Assert element has a specific input value',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
            { id: 'value', kind: 'text', label: 'value' },
        ],
    },
    {
        id: 'verify-has-count',
        label: 'VERIFY HAS COUNT',
        keywords: ['VERIFY', 'HAS', 'COUNT', 'NUMBER'],
        template: 'VERIFY {target} HAS COUNT {count}',
        snippetTemplate: 'VERIFY ${1:‹target›} HAS COUNT ${2:‹count›}',
        category: 'assert',
        description: 'Assert element count matches',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
            { id: 'count', kind: 'number', label: 'count' },
        ],
    },
    {
        id: 'verify-has-attribute',
        label: 'VERIFY HAS ATTRIBUTE',
        keywords: ['VERIFY', 'HAS', 'ATTRIBUTE', 'ATTR'],
        template: 'VERIFY {target} HAS ATTRIBUTE "{attr}" EQUAL "{value}"',
        snippetTemplate: 'VERIFY ${1:‹target›} HAS ATTRIBUTE "${2:‹attribute›}" EQUAL "${3:‹value›}"',
        category: 'assert',
        description: 'Assert element has an attribute value',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
            { id: 'attr', kind: 'text', label: 'attribute name' },
            { id: 'value', kind: 'text', label: 'value' },
        ],
    },
    {
        id: 'verify-has-class',
        label: 'VERIFY HAS CLASS',
        keywords: ['VERIFY', 'HAS', 'CLASS', 'CSS'],
        template: 'VERIFY {target} HAS CLASS "{value}"',
        snippetTemplate: 'VERIFY ${1:‹target›} HAS CLASS "${2:‹class›}"',
        category: 'assert',
        description: 'Assert element has a CSS class',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
            { id: 'value', kind: 'text', label: 'class name' },
        ],
    },
    {
        id: 'verify-element-count',
        label: 'VERIFY ELEMENT COUNT',
        keywords: ['VERIFY', 'ELEMENT', 'COUNT'],
        template: 'VERIFY ELEMENT COUNT OF {target} IS {count}',
        snippetTemplate: 'VERIFY ELEMENT COUNT OF ${1:‹target›} IS ${2:‹count›}',
        category: 'assert',
        description: 'Assert the number of matching elements',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
            { id: 'count', kind: 'number', label: 'count' },
        ],
    },
    {
        id: 'verify-url',
        label: 'VERIFY URL',
        keywords: ['VERIFY', 'URL', 'ASSERT', 'ADDRESS'],
        template: 'VERIFY URL {condition} "{value}"',
        snippetTemplate: 'VERIFY URL ${1:‹condition›} "${2:‹path›}"',
        category: 'assert',
        description: 'Assert the current URL',
        slots: [
            {
                id: 'condition',
                kind: 'select',
                label: 'condition',
                options: ['CONTAINS', 'EQUALS', 'MATCHES'],
            },
            { id: 'value', kind: 'text', label: 'path' },
        ],
    },
    {
        id: 'verify-title',
        label: 'VERIFY TITLE',
        keywords: ['VERIFY', 'TITLE', 'PAGE'],
        template: 'VERIFY TITLE {condition} "{value}"',
        snippetTemplate: 'VERIFY TITLE ${1:‹condition›} "${2:‹title›}"',
        category: 'assert',
        description: 'Assert the page title',
        slots: [
            {
                id: 'condition',
                kind: 'select',
                label: 'condition',
                options: ['CONTAINS', 'EQUALS'],
            },
            { id: 'value', kind: 'text', label: 'title' },
        ],
    },
    {
        id: 'verify-screenshot',
        label: 'VERIFY SCREENSHOT',
        keywords: ['VERIFY', 'SCREENSHOT', 'VISUAL'],
        template: 'VERIFY SCREENSHOT',
        snippetTemplate: 'VERIFY SCREENSHOT',
        category: 'assert',
        description: 'Visual regression test (full page)',
        slots: [],
    },
    {
        id: 'verify-element-screenshot',
        label: 'VERIFY MATCHES SCREENSHOT',
        keywords: ['VERIFY', 'MATCHES', 'SCREENSHOT', 'ELEMENT', 'VISUAL'],
        template: 'VERIFY {target} MATCHES SCREENSHOT',
        snippetTemplate: 'VERIFY ${1:‹target›} MATCHES SCREENSHOT',
        category: 'assert',
        description: 'Visual regression test for a specific element',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
        ],
    },
    {
        id: 'verify-response-status',
        label: 'VERIFY RESPONSE STATUS',
        keywords: ['VERIFY', 'RESPONSE', 'STATUS', 'HTTP'],
        template: 'VERIFY RESPONSE STATUS {status}',
        snippetTemplate: 'VERIFY RESPONSE STATUS ${1:‹status›}',
        category: 'assert',
        description: 'Assert the HTTP response status code',
        slots: [
            { id: 'status', kind: 'number', label: 'status code' },
        ],
    },
    {
        id: 'verify-response-body',
        label: 'VERIFY RESPONSE BODY',
        keywords: ['VERIFY', 'RESPONSE', 'BODY', 'JSON'],
        template: 'VERIFY RESPONSE BODY {condition} "{value}"',
        snippetTemplate: 'VERIFY RESPONSE BODY ${1:‹condition›} "${2:‹value›}"',
        category: 'assert',
        description: 'Assert the HTTP response body',
        slots: [
            {
                id: 'condition',
                kind: 'select',
                label: 'condition',
                options: ['CONTAINS', 'EQUALS'],
            },
            { id: 'value', kind: 'text', label: 'value' },
        ],
    },
    {
        id: 'verify-response-headers',
        label: 'VERIFY RESPONSE HEADERS',
        keywords: ['VERIFY', 'RESPONSE', 'HEADERS'],
        template: 'VERIFY RESPONSE HEADERS CONTAINS "{value}"',
        snippetTemplate: 'VERIFY RESPONSE HEADERS CONTAINS "${1:‹value›}"',
        category: 'assert',
        description: 'Assert the HTTP response headers contain a value',
        slots: [
            { id: 'value', kind: 'text', label: 'header value' },
        ],
    },
    {
        id: 'verify-variable-true',
        label: 'VERIFY var IS TRUE',
        keywords: ['VERIFY', 'VARIABLE', 'TRUE', 'BOOLEAN'],
        template: 'VERIFY {variable} IS TRUE',
        snippetTemplate: 'VERIFY ${1:‹variable›} IS TRUE',
        category: 'assert',
        description: 'Assert a variable is true',
        slots: [
            { id: 'variable', kind: 'text', label: 'variable name' },
        ],
    },
    {
        id: 'verify-variable-false',
        label: 'VERIFY var IS FALSE',
        keywords: ['VERIFY', 'VARIABLE', 'FALSE', 'BOOLEAN'],
        template: 'VERIFY {variable} IS FALSE',
        snippetTemplate: 'VERIFY ${1:‹variable›} IS FALSE',
        category: 'assert',
        description: 'Assert a variable is false',
        slots: [
            { id: 'variable', kind: 'text', label: 'variable name' },
        ],
    },
    {
        id: 'verify-variable-contains',
        label: 'VERIFY var CONTAINS',
        keywords: ['VERIFY', 'VARIABLE', 'CONTAINS', 'STRING'],
        template: 'VERIFY {variable} CONTAINS "{value}"',
        snippetTemplate: 'VERIFY ${1:‹variable›} CONTAINS "${2:‹value›}"',
        category: 'assert',
        description: 'Assert a variable contains text',
        slots: [
            { id: 'variable', kind: 'text', label: 'variable name' },
            { id: 'value', kind: 'text', label: 'text' },
        ],
    },
    {
        id: 'verify-variable-equals',
        label: 'VERIFY var EQUALS',
        keywords: ['VERIFY', 'VARIABLE', 'EQUALS', 'EQUAL'],
        template: 'VERIFY {variable} EQUAL "{value}"',
        snippetTemplate: 'VERIFY ${1:‹variable›} EQUAL "${2:‹value›}"',
        category: 'assert',
        description: 'Assert a variable equals a value',
        slots: [
            { id: 'variable', kind: 'text', label: 'variable name' },
            { id: 'value', kind: 'text', label: 'value' },
        ],
    },

    // ========================================================================
    // WAIT
    // ========================================================================
    {
        id: 'wait-seconds',
        label: 'WAIT … SECONDS',
        keywords: ['WAIT', 'PAUSE', 'DELAY', 'SLEEP', 'SECONDS'],
        template: 'WAIT {duration} SECONDS',
        snippetTemplate: 'WAIT ${1:‹duration›} SECONDS',
        category: 'wait',
        description: 'Wait for a duration in seconds',
        slots: [
            { id: 'duration', kind: 'number', label: 'seconds' },
        ],
    },
    {
        id: 'wait-milliseconds',
        label: 'WAIT … MILLISECONDS',
        keywords: ['WAIT', 'PAUSE', 'DELAY', 'MILLISECONDS', 'MS'],
        template: 'WAIT {duration} MILLISECONDS',
        snippetTemplate: 'WAIT ${1:‹duration›} MILLISECONDS',
        category: 'wait',
        description: 'Wait for a duration in milliseconds',
        slots: [
            { id: 'duration', kind: 'number', label: 'milliseconds' },
        ],
    },
    {
        id: 'wait-for',
        label: 'WAIT FOR',
        keywords: ['WAIT', 'FOR', 'ELEMENT', 'APPEAR'],
        template: 'WAIT FOR {target}',
        snippetTemplate: 'WAIT FOR ${1:‹target›}',
        category: 'wait',
        description: 'Wait for an element to appear',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
        ],
    },
    {
        id: 'wait-for-navigation',
        label: 'WAIT FOR NAVIGATION',
        keywords: ['WAIT', 'NAVIGATION', 'LOAD'],
        template: 'WAIT FOR NAVIGATION',
        snippetTemplate: 'WAIT FOR NAVIGATION',
        category: 'wait',
        description: 'Wait for page navigation to complete',
        slots: [],
    },
    {
        id: 'wait-for-network-idle',
        label: 'WAIT FOR NETWORK IDLE',
        keywords: ['WAIT', 'NETWORK', 'IDLE', 'API'],
        template: 'WAIT FOR NETWORK IDLE',
        snippetTemplate: 'WAIT FOR NETWORK IDLE',
        category: 'wait',
        description: 'Wait for all network requests to finish',
        slots: [],
    },
    {
        id: 'wait-for-url-contains',
        label: 'WAIT FOR URL CONTAINS',
        keywords: ['WAIT', 'URL', 'CONTAINS', 'REDIRECT'],
        template: 'WAIT FOR URL CONTAINS "{value}"',
        snippetTemplate: 'WAIT FOR URL CONTAINS "${1:‹path›}"',
        category: 'wait',
        description: 'Wait for the URL to contain a value',
        slots: [
            { id: 'value', kind: 'text', label: 'path' },
        ],
    },
    {
        id: 'wait-for-url-equals',
        label: 'WAIT FOR URL EQUALS',
        keywords: ['WAIT', 'URL', 'EQUALS', 'EXACT'],
        template: 'WAIT FOR URL EQUAL "{value}"',
        snippetTemplate: 'WAIT FOR URL EQUAL "${1:‹url›}"',
        category: 'wait',
        description: 'Wait for the URL to equal an exact value',
        slots: [
            { id: 'value', kind: 'text', label: 'url' },
        ],
    },

    // ========================================================================
    // STORAGE & COOKIES
    // ========================================================================
    {
        id: 'set-cookie',
        label: 'SET COOKIE',
        keywords: ['SET', 'COOKIE'],
        template: 'SET COOKIE "{name}" TO "{value}"',
        snippetTemplate: 'SET COOKIE "${1:‹name›}" TO "${2:‹value›}"',
        category: 'storage',
        description: 'Set a browser cookie',
        slots: [
            { id: 'name', kind: 'text', label: 'cookie name' },
            { id: 'value', kind: 'text', label: 'value' },
        ],
    },
    {
        id: 'set-storage',
        label: 'SET STORAGE',
        keywords: ['SET', 'STORAGE', 'LOCAL'],
        template: 'SET STORAGE "{key}" TO "{value}"',
        snippetTemplate: 'SET STORAGE "${1:‹key›}" TO "${2:‹value›}"',
        category: 'storage',
        description: 'Set a localStorage value',
        slots: [
            { id: 'key', kind: 'text', label: 'key' },
            { id: 'value', kind: 'text', label: 'value' },
        ],
    },
    {
        id: 'get-storage',
        label: 'GET STORAGE',
        keywords: ['GET', 'STORAGE', 'LOCAL', 'READ'],
        template: 'GET STORAGE "{key}" INTO {variable}',
        snippetTemplate: 'GET STORAGE "${1:‹key›}" INTO ${2:‹variable›}',
        category: 'storage',
        description: 'Read a localStorage value into a variable',
        slots: [
            { id: 'key', kind: 'text', label: 'key' },
            { id: 'variable', kind: 'text', label: 'variable name' },
        ],
    },
    {
        id: 'clear-cookies',
        label: 'CLEAR COOKIES',
        keywords: ['CLEAR', 'COOKIES', 'DELETE'],
        template: 'CLEAR COOKIES',
        snippetTemplate: 'CLEAR COOKIES',
        category: 'storage',
        description: 'Clear all browser cookies',
        slots: [],
    },
    {
        id: 'clear-storage',
        label: 'CLEAR STORAGE',
        keywords: ['CLEAR', 'STORAGE', 'LOCAL', 'DELETE'],
        template: 'CLEAR STORAGE',
        snippetTemplate: 'CLEAR STORAGE',
        category: 'storage',
        description: 'Clear all localStorage data',
        slots: [],
    },

    // ========================================================================
    // API
    // ========================================================================
    {
        id: 'api-get',
        label: 'API GET',
        keywords: ['API', 'GET', 'REQUEST', 'FETCH'],
        template: 'API GET "{url}"',
        snippetTemplate: 'API GET "${1:‹url›}"',
        category: 'api',
        description: 'Make an HTTP GET request',
        slots: [
            { id: 'url', kind: 'text', label: 'url' },
        ],
    },
    {
        id: 'api-post',
        label: 'API POST',
        keywords: ['API', 'POST', 'REQUEST', 'SEND'],
        template: 'API POST "{url}" WITH BODY "{body}"',
        snippetTemplate: 'API POST "${1:‹url›}" WITH BODY "${2:‹body›}"',
        category: 'api',
        description: 'Make an HTTP POST request with body',
        slots: [
            { id: 'url', kind: 'text', label: 'url' },
            { id: 'body', kind: 'text', label: 'body' },
        ],
    },
    {
        id: 'api-put',
        label: 'API PUT',
        keywords: ['API', 'PUT', 'REQUEST', 'UPDATE'],
        template: 'API PUT "{url}" WITH BODY "{body}"',
        snippetTemplate: 'API PUT "${1:‹url›}" WITH BODY "${2:‹body›}"',
        category: 'api',
        description: 'Make an HTTP PUT request with body',
        slots: [
            { id: 'url', kind: 'text', label: 'url' },
            { id: 'body', kind: 'text', label: 'body' },
        ],
    },
    {
        id: 'api-delete',
        label: 'API DELETE',
        keywords: ['API', 'DELETE', 'REQUEST', 'REMOVE'],
        template: 'API DELETE "{url}"',
        snippetTemplate: 'API DELETE "${1:‹url›}"',
        category: 'api',
        description: 'Make an HTTP DELETE request',
        slots: [
            { id: 'url', kind: 'text', label: 'url' },
        ],
    },
    {
        id: 'api-patch',
        label: 'API PATCH',
        keywords: ['API', 'PATCH', 'REQUEST', 'PARTIAL'],
        template: 'API PATCH "{url}" WITH BODY "{body}"',
        snippetTemplate: 'API PATCH "${1:‹url›}" WITH BODY "${2:‹body›}"',
        category: 'api',
        description: 'Make an HTTP PATCH request with body',
        slots: [
            { id: 'url', kind: 'text', label: 'url' },
            { id: 'body', kind: 'text', label: 'body' },
        ],
    },
    {
        id: 'mock-api',
        label: 'MOCK API',
        keywords: ['MOCK', 'API', 'STUB', 'INTERCEPT'],
        template: 'MOCK API "{url}" WITH STATUS {status}',
        snippetTemplate: 'MOCK API "${1:‹url›}" WITH STATUS ${2:‹status›}',
        category: 'api',
        description: 'Mock an API response with status code',
        slots: [
            { id: 'url', kind: 'text', label: 'url pattern' },
            { id: 'status', kind: 'number', label: 'status code' },
        ],
    },
    {
        id: 'mock-api-body',
        label: 'MOCK API WITH BODY',
        keywords: ['MOCK', 'API', 'STUB', 'BODY', 'JSON'],
        template: 'MOCK API "{url}" WITH STATUS {status} AND BODY "{body}"',
        snippetTemplate: 'MOCK API "${1:‹url›}" WITH STATUS ${2:‹status›} AND BODY "${3:‹body›}"',
        category: 'api',
        description: 'Mock an API response with status and body',
        slots: [
            { id: 'url', kind: 'text', label: 'url pattern' },
            { id: 'status', kind: 'number', label: 'status code' },
            { id: 'body', kind: 'text', label: 'response body' },
        ],
    },

    // ========================================================================
    // CONTROL FLOW
    // ========================================================================
    {
        id: 'for-each',
        label: 'FOR EACH',
        keywords: ['FOR', 'EACH', 'LOOP', 'ITERATE', 'COLLECTION'],
        template: 'FOR EACH {item} IN {collection} {\n}',
        snippetTemplate: 'FOR EACH ${1:‹item›} IN ${2:‹collection›} {\n    ${3}\n}',
        category: 'control',
        description: 'Loop over each item in a collection',
        slots: [
            { id: 'item', kind: 'text', label: 'item variable' },
            { id: 'collection', kind: 'text', label: 'collection variable' },
        ],
    },
    {
        id: 'if',
        label: 'IF',
        keywords: ['IF', 'CONDITION', 'WHEN', 'BRANCH'],
        template: 'IF {target} {condition} {\n}',
        snippetTemplate: 'IF ${1:‹target›} ${2:IS VISIBLE} {\n    ${3}\n}',
        category: 'control',
        description: 'Conditional: run steps only if condition is true',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
            {
                id: 'condition', kind: 'select', label: 'condition',
                options: ['IS VISIBLE', 'IS HIDDEN', 'IS ENABLED', 'IS DISABLED', 'IS CHECKED',
                          'IS NOT VISIBLE', 'IS NOT HIDDEN', 'IS NOT ENABLED', 'IS NOT DISABLED', 'IS NOT CHECKED'],
            },
        ],
    },
    {
        id: 'if-else',
        label: 'IF … ELSE',
        keywords: ['IF', 'ELSE', 'CONDITION', 'BRANCH', 'OTHERWISE'],
        template: 'IF {target} {condition} {\n} ELSE {\n}',
        snippetTemplate: 'IF ${1:‹target›} ${2:IS VISIBLE} {\n    ${3}\n} ELSE {\n    ${4}\n}',
        category: 'control',
        description: 'Conditional with alternative branch',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
            {
                id: 'condition', kind: 'select', label: 'condition',
                options: ['IS VISIBLE', 'IS HIDDEN', 'IS ENABLED', 'IS DISABLED', 'IS CHECKED',
                          'IS NOT VISIBLE', 'IS NOT HIDDEN', 'IS NOT ENABLED', 'IS NOT DISABLED', 'IS NOT CHECKED'],
            },
        ],
    },
    {
        id: 'repeat',
        label: 'REPEAT … TIMES',
        keywords: ['REPEAT', 'TIMES', 'LOOP', 'COUNT', 'ITERATE'],
        template: 'REPEAT {count} TIMES {\n}',
        snippetTemplate: 'REPEAT ${1:‹count›} TIMES {\n    ${2}\n}',
        category: 'control',
        description: 'Repeat steps a fixed number of times',
        slots: [
            { id: 'count', kind: 'number', label: 'count' },
        ],
    },
    {
        id: 'try-catch',
        label: 'TRY … CATCH',
        keywords: ['TRY', 'CATCH', 'ERROR', 'HANDLE', 'EXCEPTION'],
        template: 'TRY {\n} CATCH {\n}',
        snippetTemplate: 'TRY {\n    ${1}\n} CATCH {\n    ${2}\n}',
        category: 'control',
        description: 'Wrap steps in error handling',
        slots: [],
    },

    // ========================================================================
    // VARIABLE & UTILITY
    // ========================================================================
    // — String operations —
    {
        id: 'var-trim',
        label: 'TEXT var = TRIM',
        keywords: ['TEXT', 'TRIM', 'WHITESPACE', 'STRIP'],
        template: 'TEXT {varName} = TRIM {input}',
        snippetTemplate: 'TEXT ${1:‹varName›} = TRIM ${2:‹input›}',
        category: 'variable',
        description: 'Trim whitespace from a value',
        slots: [
            { id: 'varName', kind: 'text', label: 'variable name' },
            { id: 'input', kind: 'text', label: 'input value' },
        ],
    },
    {
        id: 'var-convert-upper',
        label: 'TEXT var = CONVERT TO UPPERCASE',
        keywords: ['TEXT', 'CONVERT', 'UPPERCASE', 'UPPER'],
        template: 'TEXT {varName} = CONVERT {input} TO UPPERCASE',
        snippetTemplate: 'TEXT ${1:‹varName›} = CONVERT ${2:‹input›} TO UPPERCASE',
        category: 'variable',
        description: 'Convert text to uppercase',
        slots: [
            { id: 'varName', kind: 'text', label: 'variable name' },
            { id: 'input', kind: 'text', label: 'input value' },
        ],
    },
    {
        id: 'var-convert-lower',
        label: 'TEXT var = CONVERT TO LOWERCASE',
        keywords: ['TEXT', 'CONVERT', 'LOWERCASE', 'LOWER'],
        template: 'TEXT {varName} = CONVERT {input} TO LOWERCASE',
        snippetTemplate: 'TEXT ${1:‹varName›} = CONVERT ${2:‹input›} TO LOWERCASE',
        category: 'variable',
        description: 'Convert text to lowercase',
        slots: [
            { id: 'varName', kind: 'text', label: 'variable name' },
            { id: 'input', kind: 'text', label: 'input value' },
        ],
    },
    {
        id: 'var-replace',
        label: 'TEXT var = REPLACE',
        keywords: ['TEXT', 'REPLACE', 'SUBSTITUTE'],
        template: 'TEXT {varName} = REPLACE {input} "{search}" WITH "{replacement}"',
        snippetTemplate: 'TEXT ${1:‹varName›} = REPLACE ${2:‹input›} "${3:‹search›}" WITH "${4:‹replacement›}"',
        category: 'variable',
        description: 'Replace text within a string',
        slots: [
            { id: 'varName', kind: 'text', label: 'variable name' },
            { id: 'input', kind: 'text', label: 'input value' },
            { id: 'search', kind: 'text', label: 'search text' },
            { id: 'replacement', kind: 'text', label: 'replacement' },
        ],
    },
    {
        id: 'var-split',
        label: 'LIST var = SPLIT',
        keywords: ['LIST', 'SPLIT', 'TOKENIZE', 'DELIMITER'],
        template: 'LIST {varName} = SPLIT {input} BY "{delimiter}"',
        snippetTemplate: 'LIST ${1:‹varName›} = SPLIT ${2:‹input›} BY "${3:‹delimiter›}"',
        category: 'variable',
        description: 'Split text into a list by delimiter',
        slots: [
            { id: 'varName', kind: 'text', label: 'variable name' },
            { id: 'input', kind: 'text', label: 'input value' },
            { id: 'delimiter', kind: 'text', label: 'delimiter' },
        ],
    },
    {
        id: 'var-join',
        label: 'TEXT var = JOIN',
        keywords: ['TEXT', 'JOIN', 'CONCAT', 'COMBINE'],
        template: 'TEXT {varName} = JOIN {input} WITH "{delimiter}"',
        snippetTemplate: 'TEXT ${1:‹varName›} = JOIN ${2:‹input›} WITH "${3:‹delimiter›}"',
        category: 'variable',
        description: 'Join a list into text with delimiter',
        slots: [
            { id: 'varName', kind: 'text', label: 'variable name' },
            { id: 'input', kind: 'text', label: 'list variable' },
            { id: 'delimiter', kind: 'text', label: 'delimiter' },
        ],
    },
    {
        id: 'var-length',
        label: 'NUMBER var = LENGTH OF',
        keywords: ['NUMBER', 'LENGTH', 'COUNT', 'SIZE'],
        template: 'NUMBER {varName} = LENGTH OF {input}',
        snippetTemplate: 'NUMBER ${1:‹varName›} = LENGTH OF ${2:‹input›}',
        category: 'variable',
        description: 'Get the length of a string or list',
        slots: [
            { id: 'varName', kind: 'text', label: 'variable name' },
            { id: 'input', kind: 'text', label: 'input value' },
        ],
    },
    {
        id: 'var-extract',
        label: 'TEXT var = EXTRACT',
        keywords: ['TEXT', 'EXTRACT', 'SUBSTRING', 'SLICE'],
        template: 'TEXT {varName} = EXTRACT {input} FROM {start} TO {end}',
        snippetTemplate: 'TEXT ${1:‹varName›} = EXTRACT ${2:‹input›} FROM ${3:‹start›} TO ${4:‹end›}',
        category: 'variable',
        description: 'Extract a substring by position',
        slots: [
            { id: 'varName', kind: 'text', label: 'variable name' },
            { id: 'input', kind: 'text', label: 'input value' },
            { id: 'start', kind: 'number', label: 'start' },
            { id: 'end', kind: 'number', label: 'end' },
        ],
    },
    // — Date operations —
    {
        id: 'var-today',
        label: 'TEXT var = TODAY',
        keywords: ['TEXT', 'TODAY', 'DATE', 'CURRENT'],
        template: 'TEXT {varName} = TODAY',
        snippetTemplate: 'TEXT ${1:‹varName›} = TODAY',
        category: 'variable',
        description: 'Get today\'s date',
        slots: [
            { id: 'varName', kind: 'text', label: 'variable name' },
        ],
    },
    {
        id: 'var-now',
        label: 'TEXT var = NOW',
        keywords: ['TEXT', 'NOW', 'DATETIME', 'TIMESTAMP'],
        template: 'TEXT {varName} = NOW',
        snippetTemplate: 'TEXT ${1:‹varName›} = NOW',
        category: 'variable',
        description: 'Get the current date and time',
        slots: [
            { id: 'varName', kind: 'text', label: 'variable name' },
        ],
    },
    {
        id: 'var-add-date',
        label: 'TEXT var = ADD … TO',
        keywords: ['TEXT', 'ADD', 'DATE', 'DAYS', 'MONTHS', 'YEARS', 'FUTURE'],
        template: 'TEXT {varName} = ADD {amount} DAYS TO {date}',
        snippetTemplate: 'TEXT ${1:‹varName›} = ADD ${2:‹amount›} DAYS TO ${3:‹date›}',
        category: 'variable',
        description: 'Add days/months/years to a date',
        slots: [
            { id: 'varName', kind: 'text', label: 'variable name' },
            { id: 'amount', kind: 'number', label: 'amount' },
            { id: 'date', kind: 'text', label: 'date value' },
        ],
    },
    {
        id: 'var-subtract-date',
        label: 'TEXT var = SUBTRACT … FROM',
        keywords: ['TEXT', 'SUBTRACT', 'DATE', 'DAYS', 'MONTHS', 'YEARS', 'PAST'],
        template: 'TEXT {varName} = SUBTRACT {amount} DAYS FROM {date}',
        snippetTemplate: 'TEXT ${1:‹varName›} = SUBTRACT ${2:‹amount›} DAYS FROM ${3:‹date›}',
        category: 'variable',
        description: 'Subtract days/months/years from a date',
        slots: [
            { id: 'varName', kind: 'text', label: 'variable name' },
            { id: 'amount', kind: 'number', label: 'amount' },
            { id: 'date', kind: 'text', label: 'date value' },
        ],
    },
    {
        id: 'var-format',
        label: 'TEXT var = FORMAT',
        keywords: ['TEXT', 'FORMAT', 'DATE', 'PATTERN'],
        template: 'TEXT {varName} = FORMAT {input} AS "{pattern}"',
        snippetTemplate: 'TEXT ${1:‹varName›} = FORMAT ${2:‹input›} AS "${3:‹pattern›}"',
        category: 'variable',
        description: 'Format a date or number with a pattern',
        slots: [
            { id: 'varName', kind: 'text', label: 'variable name' },
            { id: 'input', kind: 'text', label: 'input value' },
            { id: 'pattern', kind: 'text', label: 'format pattern' },
        ],
    },
    // — Number operations —
    {
        id: 'var-round',
        label: 'NUMBER var = ROUND',
        keywords: ['NUMBER', 'ROUND', 'DECIMAL', 'MATH'],
        template: 'NUMBER {varName} = ROUND {input}',
        snippetTemplate: 'NUMBER ${1:‹varName›} = ROUND ${2:‹input›}',
        category: 'variable',
        description: 'Round a number',
        slots: [
            { id: 'varName', kind: 'text', label: 'variable name' },
            { id: 'input', kind: 'text', label: 'number value' },
        ],
    },
    {
        id: 'var-absolute',
        label: 'NUMBER var = ABSOLUTE',
        keywords: ['NUMBER', 'ABSOLUTE', 'ABS', 'MATH'],
        template: 'NUMBER {varName} = ABSOLUTE {input}',
        snippetTemplate: 'NUMBER ${1:‹varName›} = ABSOLUTE ${2:‹input›}',
        category: 'variable',
        description: 'Get absolute value of a number',
        slots: [
            { id: 'varName', kind: 'text', label: 'variable name' },
            { id: 'input', kind: 'text', label: 'number value' },
        ],
    },
    // — Generate operations —
    {
        id: 'var-generate-uuid',
        label: 'TEXT var = GENERATE UUID',
        keywords: ['TEXT', 'GENERATE', 'UUID', 'UNIQUE', 'ID'],
        template: 'TEXT {varName} = GENERATE UUID',
        snippetTemplate: 'TEXT ${1:‹varName›} = GENERATE UUID',
        category: 'variable',
        description: 'Generate a unique UUID',
        slots: [
            { id: 'varName', kind: 'text', label: 'variable name' },
        ],
    },
    {
        id: 'var-random-number',
        label: 'NUMBER var = RANDOM',
        keywords: ['NUMBER', 'RANDOM', 'GENERATE', 'RANGE'],
        template: 'NUMBER {varName} = RANDOM NUMBER FROM {min} TO {max}',
        snippetTemplate: 'NUMBER ${1:‹varName›} = RANDOM NUMBER FROM ${2:‹min›} TO ${3:‹max›}',
        category: 'variable',
        description: 'Generate a random number in a range',
        slots: [
            { id: 'varName', kind: 'text', label: 'variable name' },
            { id: 'min', kind: 'number', label: 'minimum' },
            { id: 'max', kind: 'number', label: 'maximum' },
        ],
    },
    // — Perform assignment —
    {
        id: 'perform-assignment',
        label: 'var = PERFORM',
        keywords: ['PERFORM', 'ASSIGN', 'RESULT', 'RETURN', 'FLAG', 'TEXT', 'NUMBER'],
        template: '{varType} {varName} = PERFORM {action}',
        snippetTemplate: '${1:‹type›} ${2:‹varName›} = PERFORM ${3:‹action›}',
        category: 'variable',
        description: 'Store the result of a page action in a variable',
        slots: [
            {
                id: 'varType',
                kind: 'select',
                label: 'type',
                options: ['TEXT', 'NUMBER', 'FLAG', 'LIST'],
            },
            { id: 'varName', kind: 'text', label: 'variable name' },
            { id: 'action', kind: 'page-action', label: 'action' },
        ],
    },
    // — Return —
    {
        id: 'return',
        label: 'RETURN',
        keywords: ['RETURN', 'RESULT', 'OUTPUT'],
        template: 'RETURN {returnType} OF {target}',
        snippetTemplate: 'RETURN ${1:‹returnType›} OF ${2:‹target›}',
        category: 'variable',
        description: 'Return a value from a page action',
        slots: [
            {
                id: 'returnType',
                kind: 'select',
                label: 'return type',
                options: ['VISIBLE', 'TEXT', 'VALUE'],
            },
            { id: 'target', kind: 'page-field', label: 'target' },
        ],
    },

    // ========================================================================
    // OTHER
    // ========================================================================
    {
        id: 'screenshot',
        label: 'TAKE SCREENSHOT',
        keywords: ['SCREENSHOT', 'TAKE', 'CAPTURE', 'SNAP'],
        template: 'TAKE SCREENSHOT "{name}"',
        snippetTemplate: 'TAKE SCREENSHOT "${1:‹name›}"',
        category: 'other',
        description: 'Capture a full-page screenshot',
        slots: [
            { id: 'name', kind: 'text', label: 'name' },
        ],
    },
    {
        id: 'screenshot-element',
        label: 'TAKE SCREENSHOT OF',
        keywords: ['SCREENSHOT', 'TAKE', 'ELEMENT', 'CAPTURE', 'OF'],
        template: 'TAKE SCREENSHOT OF {target} AS "{name}"',
        snippetTemplate: 'TAKE SCREENSHOT OF ${1:‹target›} AS "${2:‹name›}"',
        category: 'other',
        description: 'Capture a screenshot of a specific element',
        slots: [
            { id: 'target', kind: 'page-field', label: 'target' },
            { id: 'name', kind: 'text', label: 'name' },
        ],
    },
    {
        id: 'log',
        label: 'LOG',
        keywords: ['LOG', 'PRINT', 'DEBUG', 'OUTPUT'],
        template: 'LOG "{message}"',
        snippetTemplate: 'LOG "${1:‹message›}"',
        category: 'other',
        description: 'Log a message to the test output',
        slots: [
            { id: 'message', kind: 'text', label: 'message' },
        ],
    },

    // ========================================================================
    // DATA (handoff to existing DataQueryModal)
    // ========================================================================
    {
        id: 'data-query',
        label: 'Data Query',
        keywords: ['DATA', 'QUERY', 'ROW', 'ROWS', 'COUNT', 'TABLE', 'LOAD'],
        template: '',
        snippetTemplate: '',
        category: 'data',
        description: 'Open the Data Query builder (ROW, ROWS, LOAD, COUNT)',
        slots: [],
    },
];

/** Category labels for palette section headers */
export const CATEGORY_LABELS: Record<ActionDef['category'], string> = {
    interact: 'INTERACT',
    navigate: 'NAVIGATE',
    assert: 'ASSERT',
    wait: 'WAIT',
    tab: 'TAB & FRAME',
    dialog: 'DIALOG',
    storage: 'STORAGE & COOKIES',
    api: 'API',
    control: 'CONTROL FLOW',
    variable: 'VARIABLE & UTILITY',
    data: 'DATA',
    other: 'OTHER',
};

/** Category display order */
export const CATEGORY_ORDER: ActionDef['category'][] = [
    'interact',
    'navigate',
    'assert',
    'wait',
    'tab',
    'dialog',
    'storage',
    'api',
    'control',
    'variable',
    'data',
    'other',
];

/**
 * Filter actions by a search query.
 * Matches against label, keywords, and description.
 */
export function filterActions(query: string): ActionDef[] {
    if (!query.trim()) return ACTION_CATALOG;

    const normalized = query.toUpperCase().trim();
    return ACTION_CATALOG.filter(action =>
        action.label.toUpperCase().includes(normalized) ||
        action.keywords.some(kw => kw.startsWith(normalized)) ||
        action.description?.toUpperCase().includes(normalized)
    );
}

/**
 * Group actions by category in display order.
 */
export function groupActionsByCategory(actions: ActionDef[]): { category: ActionDef['category']; label: string; actions: ActionDef[] }[] {
    const groups: { category: ActionDef['category']; label: string; actions: ActionDef[] }[] = [];

    for (const cat of CATEGORY_ORDER) {
        const catActions = actions.filter(a => a.category === cat);
        if (catActions.length > 0) {
            groups.push({ category: cat, label: CATEGORY_LABELS[cat], actions: catActions });
        }
    }

    return groups;
}

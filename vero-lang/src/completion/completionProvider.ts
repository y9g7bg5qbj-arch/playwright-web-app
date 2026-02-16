/**
 * Vero Language Completion Provider
 *
 * Provides context-aware autocomplete suggestions for Vero scripts.
 * Integrates with Monaco editor's completion API.
 */

/**
 * Completion item kinds matching Monaco's CompletionItemKind
 */
export const CompletionItemKind = {
    Text: 0,
    Method: 1,
    Function: 2,
    Constructor: 3,
    Field: 4,
    Variable: 5,
    Class: 6,
    Interface: 7,
    Module: 8,
    Property: 9,
    Unit: 10,
    Value: 11,
    Enum: 12,
    Keyword: 13,
    Snippet: 14,
    Color: 15,
    File: 16,
    Reference: 17,
    Folder: 18,
    EnumMember: 19,
    Constant: 20,
    Struct: 21,
    Event: 22,
    Operator: 23,
    TypeParameter: 24,
} as const;

/**
 * Completion item interface matching Monaco's CompletionItem
 */
export interface CompletionItem {
    label: string;
    kind: number;
    detail?: string;
    documentation?: string;
    insertText?: string;
    insertTextRules?: number;  // InsertTextRule.InsertAsSnippet = 4
    range?: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
    };
    sortText?: string;  // For ordering
}

/**
 * Context for providing completions
 */
export interface CompletionContext {
    lineContent: string;
    lineNumber: number;
    column: number;
    wordBefore: string;
    definedPages?: string[];
    definedVariables?: string[];
    pageFields?: Map<string, string[]>;
    pageActions?: Map<string, string[]>;
}

/**
 * Keywords for statement start
 * Uses UPPERCASE keywords matching Vero DSL specification
 */
const STATEMENT_KEYWORDS: CompletionItem[] = [
    { label: 'OPEN', kind: CompletionItemKind.Keyword, detail: 'Open a URL', insertText: 'OPEN "${1:url}"', insertTextRules: 4 },
    { label: 'CLICK', kind: CompletionItemKind.Keyword, detail: 'Click an element', insertText: 'CLICK ${1:Page}.${2:field}', insertTextRules: 4 },
    { label: 'FILL', kind: CompletionItemKind.Keyword, detail: 'Fill a field with a value', insertText: 'FILL ${1:Page}.${2:field} WITH "${3:value}"', insertTextRules: 4 },
    { label: 'VERIFY', kind: CompletionItemKind.Keyword, detail: 'Verify a condition', insertText: 'VERIFY ${1:Page}.${2:field} IS VISIBLE', insertTextRules: 4 },
    {
        label: 'VERIFY SCREENSHOT',
        kind: CompletionItemKind.Keyword,
        detail: 'Compare page screenshot with baseline',
        insertText: 'VERIFY SCREENSHOT AS "${1:home}" WITH ${2|STRICT,BALANCED,RELAXED|}',
        insertTextRules: 4,
    },
    {
        label: 'VERIFY TARGET MATCHES SCREENSHOT',
        kind: CompletionItemKind.Keyword,
        detail: 'Compare target screenshot with baseline',
        insertText: 'VERIFY ${1:Page}.${2:field} MATCHES SCREENSHOT AS "${3:element}" WITH ${4|STRICT,BALANCED,RELAXED|}',
        insertTextRules: 4,
    },
    { label: 'WAIT', kind: CompletionItemKind.Keyword, detail: 'Wait for time or condition', insertText: 'WAIT ${1:2} SECONDS', insertTextRules: 4 },
    { label: 'HOVER', kind: CompletionItemKind.Keyword, detail: 'Hover over an element', insertText: 'HOVER ${1:Page}.${2:field}', insertTextRules: 4 },
    { label: 'PRESS', kind: CompletionItemKind.Keyword, detail: 'Press a key', insertText: 'PRESS "${1:Enter}"', insertTextRules: 4 },
    { label: 'CHECK', kind: CompletionItemKind.Keyword, detail: 'Check a checkbox', insertText: 'CHECK ${1:Page}.${2:checkbox}', insertTextRules: 4 },
    { label: 'UNCHECK', kind: CompletionItemKind.Keyword, detail: 'Uncheck a checkbox', insertText: 'UNCHECK ${1:Page}.${2:checkbox}', insertTextRules: 4 },
    { label: 'SELECT', kind: CompletionItemKind.Keyword, detail: 'Select from dropdown', insertText: 'SELECT "${1:option}" FROM ${2:Page}.${3:dropdown}', insertTextRules: 4 },
    { label: 'LOAD', kind: CompletionItemKind.Keyword, detail: 'Load data from a table', insertText: 'LOAD ${1:data} FROM "${2:table}"', insertTextRules: 4 },
    { label: 'FOR EACH', kind: CompletionItemKind.Keyword, detail: 'Iterate over data', insertText: 'FOR EACH $${1:item} IN ${2:items} {\n\t${3}\n}', insertTextRules: 4 },
    { label: 'IF', kind: CompletionItemKind.Keyword, detail: 'Conditional statement', insertText: 'IF ${1:condition} {\n\t${2}\n}', insertTextRules: 4 },
    { label: 'DO', kind: CompletionItemKind.Keyword, detail: 'Call an action', insertText: 'DO ${1:Page}.${2:action}', insertTextRules: 4 },
    { label: 'REFRESH', kind: CompletionItemKind.Keyword, detail: 'Refresh the page', insertText: 'REFRESH' },
    { label: 'SCREENSHOT', kind: CompletionItemKind.Keyword, detail: 'Take a screenshot', insertText: 'SCREENSHOT "${1:description}"', insertTextRules: 4 },
    { label: 'LOG', kind: CompletionItemKind.Keyword, detail: 'Log a message', insertText: 'LOG "${1:message}"', insertTextRules: 4 },
    { label: 'UPLOAD', kind: CompletionItemKind.Keyword, detail: 'Upload a file', insertText: 'UPLOAD "${1:file}" TO ${2:Page}.${3:fileInput}', insertTextRules: 4 },
    { label: 'SCROLL', kind: CompletionItemKind.Keyword, detail: 'Scroll to element', insertText: 'SCROLL TO ${1:Page}.${2:field}', insertTextRules: 4 },
    { label: 'CLEAR', kind: CompletionItemKind.Keyword, detail: 'Clear a field', insertText: 'CLEAR ${1:Page}.${2:field}', insertTextRules: 4 },
    { label: 'SWITCH TO NEW TAB', kind: CompletionItemKind.Keyword, detail: 'Switch to/wait for a new popup tab', insertText: 'SWITCH TO NEW TAB "${1:url}"', insertTextRules: 4 },
    { label: 'SWITCH TO TAB', kind: CompletionItemKind.Keyword, detail: 'Switch to existing tab by index (1-based)', insertText: 'SWITCH TO TAB ${1:1}', insertTextRules: 4 },
    { label: 'OPEN IN NEW TAB', kind: CompletionItemKind.Keyword, detail: 'Open URL in a new browser tab', insertText: 'OPEN "${1:url}" IN NEW TAB', insertTextRules: 4 },
    { label: 'CLOSE TAB', kind: CompletionItemKind.Keyword, detail: 'Close the current browser tab', insertText: 'CLOSE TAB' },
];

/**
 * Keywords for VERIFY conditions
 * Uses UPPERCASE keywords matching Vero DSL specification
 */
const VERIFY_CONDITIONS: CompletionItem[] = [
    { label: 'IS VISIBLE', kind: CompletionItemKind.Property, detail: 'Element is visible', insertText: 'IS VISIBLE' },
    { label: 'IS HIDDEN', kind: CompletionItemKind.Property, detail: 'Element is hidden', insertText: 'IS HIDDEN' },
    { label: 'IS ENABLED', kind: CompletionItemKind.Property, detail: 'Element is enabled', insertText: 'IS ENABLED' },
    { label: 'IS DISABLED', kind: CompletionItemKind.Property, detail: 'Element is disabled', insertText: 'IS DISABLED' },
    { label: 'IS CHECKED', kind: CompletionItemKind.Property, detail: 'Checkbox is checked', insertText: 'IS CHECKED' },
    { label: 'IS FOCUSED', kind: CompletionItemKind.Property, detail: 'Element is focused', insertText: 'IS FOCUSED' },
    { label: 'HAS TEXT', kind: CompletionItemKind.Property, detail: 'Element has exact text', insertText: 'HAS TEXT "${1:expected}"', insertTextRules: 4 },
    { label: 'CONTAINS', kind: CompletionItemKind.Property, detail: 'Element contains text', insertText: 'CONTAINS "${1:expected}"', insertTextRules: 4 },
    { label: 'HAS CLASS', kind: CompletionItemKind.Property, detail: 'Element has CSS class', insertText: 'HAS CLASS "${1:classname}"', insertTextRules: 4 },
    { label: 'HAS VALUE', kind: CompletionItemKind.Property, detail: 'Input has value', insertText: 'HAS VALUE "${1:value}"', insertTextRules: 4 },
    { label: 'HAS COUNT', kind: CompletionItemKind.Property, detail: 'Number of matching elements', insertText: 'HAS COUNT ${1:number}', insertTextRules: 4 },
];

/**
 * Page/URL assertions
 * Uses UPPERCASE keywords matching Vero DSL specification
 */
const PAGE_ASSERTIONS: CompletionItem[] = [
    { label: 'URL CONTAINS', kind: CompletionItemKind.Property, detail: 'URL contains substring', insertText: 'URL CONTAINS "${1:text}"', insertTextRules: 4 },
    { label: 'URL EQUALS', kind: CompletionItemKind.Property, detail: 'URL equals exactly', insertText: 'URL EQUALS "${1:url}"', insertTextRules: 4 },
    { label: 'PAGE TITLE IS', kind: CompletionItemKind.Property, detail: 'Page title equals', insertText: 'PAGE TITLE IS "${1:title}"', insertTextRules: 4 },
    { label: 'PAGE TITLE CONTAINS', kind: CompletionItemKind.Property, detail: 'Page title contains', insertText: 'PAGE TITLE CONTAINS "${1:text}"', insertTextRules: 4 },
];

const VISUAL_ASSERTIONS: CompletionItem[] = [
    {
        label: 'SCREENSHOT',
        kind: CompletionItemKind.Property,
        detail: 'Compare page screenshot against baseline',
        insertText: 'SCREENSHOT AS "${1:home}" WITH ${2|STRICT,BALANCED,RELAXED|}',
        insertTextRules: 4,
    },
    {
        label: 'MATCHES SCREENSHOT',
        kind: CompletionItemKind.Property,
        detail: 'Compare target screenshot against baseline',
        insertText: 'MATCHES SCREENSHOT AS "${1:element}" WITH ${2|STRICT,BALANCED,RELAXED|}',
        insertTextRules: 4,
    },
    {
        label: 'WITH THRESHOLDS',
        kind: CompletionItemKind.Property,
        detail: 'Override visual diff tolerance',
        insertText: 'WITH ${1|STRICT,BALANCED,RELAXED|} THRESHOLD ${2:0.2} MAX_DIFF_PIXELS ${3:0} MAX_DIFF_RATIO ${4:0}',
        insertTextRules: 4,
    },
];

/**
 * Structure keywords for pages/features
 * Uses UPPERCASE keywords matching Vero DSL specification
 */
const STRUCTURE_KEYWORDS: CompletionItem[] = [
    { label: 'PAGE', kind: CompletionItemKind.Class, detail: 'Define a page object', insertText: 'PAGE ${1:PageName} ("/") {\n\tFIELD ${2:fieldName} = BUTTON "${3:Submit}"\n}', insertTextRules: 4 },
    { label: 'FEATURE', kind: CompletionItemKind.Class, detail: 'Define a feature', insertText: 'FEATURE ${1:FeatureName} {\n\tUSE ${2:PageName}\n\n\tSCENARIO ${3:ScenarioName} {\n\t\t${4}\n\t}\n}', insertTextRules: 4 },
    { label: 'SCENARIO', kind: CompletionItemKind.Function, detail: 'Define a scenario', insertText: 'SCENARIO ${1:ScenarioName} {\n\t${2}\n}', insertTextRules: 4 },
    { label: 'FIELD', kind: CompletionItemKind.Field, detail: 'Define a page field', insertText: 'FIELD ${1:fieldName} = ${2|BUTTON,TEXTBOX,LINK,TESTID,LABEL,PLACEHOLDER,CHECKBOX,HEADING,COMBOBOX,RADIO,ROLE,TEXT,ALT,TITLE,CSS,XPATH|} "${3:value}"', insertTextRules: 4 },
    { label: 'ACTION', kind: CompletionItemKind.Method, detail: 'Define a page action', insertText: 'ACTION ${1:actionName} {\n\t${2}\n}', insertTextRules: 4 },
    { label: 'USE', kind: CompletionItemKind.Reference, detail: 'Import a page', insertText: 'USE ${1:PageName}', insertTextRules: 4 },
    { label: 'BEFORE EACH', kind: CompletionItemKind.Event, detail: 'Run before each scenario', insertText: 'BEFORE EACH {\n\t${1}\n}', insertTextRules: 4 },
    { label: 'AFTER EACH', kind: CompletionItemKind.Event, detail: 'Run after each scenario', insertText: 'AFTER EACH {\n\t${1}\n}', insertTextRules: 4 },
];

type ContextType = 'empty' | 'keyword' | 'afterVerify' | 'afterClick' | 'afterFill' | 'afterDo' | 'afterVariable' | 'afterFieldEquals' | 'structure';

function analyzeContext(ctx: CompletionContext): { type: ContextType; trigger?: string } {
    const beforeCursor = ctx.lineContent.substring(0, ctx.column - 1).trim().toLowerCase();

    if (!beforeCursor) {
        return { type: ctx.lineNumber === 1 ? 'structure' : 'empty' };
    }

    if (/^field\s+\w+\s*=\s*$/.test(beforeCursor)) return { type: 'afterFieldEquals' };
    if (/^verify\s+"[^"]*"\s*$/.test(beforeCursor)) return { type: 'afterVerify' };
    if (/^verify\s+$/.test(beforeCursor)) return { type: 'afterVerify', trigger: 'target' };
    if (/^click\s*$/.test(beforeCursor)) return { type: 'afterClick' };
    if (/^fill\s+"[^"]*"\s+with\s+$/.test(beforeCursor)) return { type: 'afterFill' };
    if (/^do\s+$/.test(beforeCursor)) return { type: 'afterDo' };
    if (beforeCursor.endsWith('$')) return { type: 'afterVariable' };
    if (ctx.wordBefore) return { type: 'keyword', trigger: ctx.wordBefore };

    return { type: 'empty' };
}

/** Typed selector completions for FIELD definitions */
const SELECTOR_TYPES: CompletionItem[] = [
    { label: 'BUTTON', kind: CompletionItemKind.Keyword, detail: 'getByRole(\'button\')', insertText: 'BUTTON "${1:name}"', insertTextRules: 4 },
    { label: 'TEXTBOX', kind: CompletionItemKind.Keyword, detail: 'getByRole(\'textbox\')', insertText: 'TEXTBOX "${1:name}"', insertTextRules: 4 },
    { label: 'LINK', kind: CompletionItemKind.Keyword, detail: 'getByRole(\'link\')', insertText: 'LINK "${1:name}"', insertTextRules: 4 },
    { label: 'CHECKBOX', kind: CompletionItemKind.Keyword, detail: 'getByRole(\'checkbox\')', insertText: 'CHECKBOX "${1:name}"', insertTextRules: 4 },
    { label: 'HEADING', kind: CompletionItemKind.Keyword, detail: 'getByRole(\'heading\')', insertText: 'HEADING "${1:text}"', insertTextRules: 4 },
    { label: 'COMBOBOX', kind: CompletionItemKind.Keyword, detail: 'getByRole(\'combobox\')', insertText: 'COMBOBOX "${1:name}"', insertTextRules: 4 },
    { label: 'RADIO', kind: CompletionItemKind.Keyword, detail: 'getByRole(\'radio\')', insertText: 'RADIO "${1:name}"', insertTextRules: 4 },
    { label: 'ROLE', kind: CompletionItemKind.Keyword, detail: 'getByRole()', insertText: 'ROLE "${1:role}"', insertTextRules: 4 },
    { label: 'LABEL', kind: CompletionItemKind.Keyword, detail: 'getByLabel()', insertText: 'LABEL "${1:label}"', insertTextRules: 4 },
    { label: 'PLACEHOLDER', kind: CompletionItemKind.Keyword, detail: 'getByPlaceholder()', insertText: 'PLACEHOLDER "${1:text}"', insertTextRules: 4 },
    { label: 'TESTID', kind: CompletionItemKind.Keyword, detail: 'getByTestId()', insertText: 'TESTID "${1:testId}"', insertTextRules: 4 },
    { label: 'TEXT', kind: CompletionItemKind.Keyword, detail: 'getByText()', insertText: 'TEXT "${1:text}"', insertTextRules: 4 },
    { label: 'ALT', kind: CompletionItemKind.Keyword, detail: 'getByAltText()', insertText: 'ALT "${1:altText}"', insertTextRules: 4 },
    { label: 'TITLE', kind: CompletionItemKind.Keyword, detail: 'getByTitle()', insertText: 'TITLE "${1:title}"', insertTextRules: 4 },
    { label: 'CSS', kind: CompletionItemKind.Keyword, detail: 'page.locator(css)', insertText: 'CSS "${1:#selector}"', insertTextRules: 4 },
    { label: 'XPATH', kind: CompletionItemKind.Keyword, detail: 'page.locator(xpath)', insertText: 'XPATH "${1://div}"', insertTextRules: 4 },
];

/**
 * Provide completions based on context
 */
export function provideCompletions(ctx: CompletionContext): CompletionItem[] {
    const analysis = analyzeContext(ctx);
    const items: CompletionItem[] = [];

    switch (analysis.type) {
        case 'structure':
            items.push(...STRUCTURE_KEYWORDS);
            break;

        case 'empty':
        case 'keyword':
            // All statement keywords + structure if at file level
            items.push(...STATEMENT_KEYWORDS);
            if (ctx.lineNumber <= 5) {
                items.push(...STRUCTURE_KEYWORDS);
            }
            break;

        case 'afterFieldEquals':
            items.push(...SELECTOR_TYPES);
            break;

        case 'afterVerify':
            items.push(...VERIFY_CONDITIONS);
            items.push(...PAGE_ASSERTIONS);
            items.push(...VISUAL_ASSERTIONS);
            break;

        case 'afterClick':
            // Suggest element selectors or page fields
            if (ctx.pageFields) {
                for (const [pageName, fields] of ctx.pageFields) {
                    for (const field of fields) {
                        items.push({
                            label: `${pageName}.${field}`,
                            kind: CompletionItemKind.Field,
                            detail: `Field from ${pageName}`,
                            insertText: `${pageName}.${field}`,
                        });
                    }
                }
            }
            break;

        case 'afterFill':
            // Suggest variables
            if (ctx.definedVariables) {
                for (const varName of ctx.definedVariables) {
                    items.push({
                        label: `$${varName}`,
                        kind: CompletionItemKind.Variable,
                        detail: 'Variable',
                        insertText: `$${varName}`,
                    });
                }
            }
            // Common patterns
            items.push({
                label: '"value"',
                kind: CompletionItemKind.Value,
                detail: 'String literal',
                insertText: '"${1:value}"',
                insertTextRules: 4,
            });
            break;

        case 'afterDo':
            // Suggest page.action combinations
            if (ctx.pageActions) {
                for (const [pageName, actions] of ctx.pageActions) {
                    for (const action of actions) {
                        items.push({
                            label: `${pageName}.${action}`,
                            kind: CompletionItemKind.Method,
                            detail: `Action from ${pageName}`,
                            insertText: `${pageName}.${action}`,
                        });
                    }
                }
            }
            // Also suggest defined pages
            if (ctx.definedPages) {
                for (const pageName of ctx.definedPages) {
                    items.push({
                        label: pageName,
                        kind: CompletionItemKind.Class,
                        detail: 'Page object',
                        insertText: `${pageName}.`,
                    });
                }
            }
            break;

        case 'afterVariable':
            // Suggest defined variables
            if (ctx.definedVariables) {
                for (const varName of ctx.definedVariables) {
                    items.push({
                        label: varName,
                        kind: CompletionItemKind.Variable,
                        detail: 'Variable',
                        insertText: varName,
                    });
                }
            }
            break;
    }

    // Filter by word being typed if applicable
    if (analysis.trigger) {
        const filterLower = analysis.trigger.toLowerCase();
        return items.filter(item => item.label.toLowerCase().includes(filterLower));
    }

    return items;
}

/**
 * Get all available keywords (for highlighting/tokenization)
 */
export function getAllKeywords(): string[] {
    const keywords = new Set<string>();

    for (const item of STATEMENT_KEYWORDS) {
        keywords.add(item.label.split(' ')[0]);
    }
    for (const item of STRUCTURE_KEYWORDS) {
        keywords.add(item.label.split(' ')[0]);
    }

    // Assertion keywords
    for (const kw of [
        'is', 'not', 'visible', 'hidden', 'enabled', 'disabled', 'checked', 'focused',
        'has', 'text', 'class', 'value', 'count', 'contains', 'attribute',
        'url', 'title', 'page', 'element',
    ]) {
        keywords.add(kw);
    }

    return [...keywords];
}

/**
 * Export for Monaco integration
 */
export default {
    provideCompletions,
    getAllKeywords,
    CompletionItemKind,
};

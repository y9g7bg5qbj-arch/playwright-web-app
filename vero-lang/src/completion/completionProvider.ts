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
    filterText?: string;  // For filtering
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
 */
const STATEMENT_KEYWORDS: CompletionItem[] = [
    { label: 'navigate', kind: CompletionItemKind.Keyword, detail: 'Navigate to a URL', insertText: 'navigate to "${1:url}"', insertTextRules: 4 },
    { label: 'open', kind: CompletionItemKind.Keyword, detail: 'Open a URL (alias for navigate)', insertText: 'open "${1:url}"', insertTextRules: 4 },
    { label: 'click', kind: CompletionItemKind.Keyword, detail: 'Click an element', insertText: 'click "${1:element}"', insertTextRules: 4 },
    { label: 'fill', kind: CompletionItemKind.Keyword, detail: 'Fill a field with a value', insertText: 'fill "${1:field}" with "${2:value}"', insertTextRules: 4 },
    { label: 'verify', kind: CompletionItemKind.Keyword, detail: 'Verify a condition', insertText: 'verify "${1:element}" is visible', insertTextRules: 4 },
    { label: 'wait', kind: CompletionItemKind.Keyword, detail: 'Wait for time or condition', insertText: 'wait ${1:2} seconds', insertTextRules: 4 },
    { label: 'hover', kind: CompletionItemKind.Keyword, detail: 'Hover over an element', insertText: 'hover "${1:element}"', insertTextRules: 4 },
    { label: 'press', kind: CompletionItemKind.Keyword, detail: 'Press a key', insertText: 'press "${1:Enter}"', insertTextRules: 4 },
    { label: 'check', kind: CompletionItemKind.Keyword, detail: 'Check a checkbox', insertText: 'check "${1:checkbox}"', insertTextRules: 4 },
    { label: 'load', kind: CompletionItemKind.Keyword, detail: 'Load data from a table', insertText: 'load ${1:data} from "${2:table}"', insertTextRules: 4 },
    { label: 'for each', kind: CompletionItemKind.Keyword, detail: 'Iterate over data', insertText: 'for each $${1:item} in ${2:items}\n\t${3}\nend', insertTextRules: 4 },
    { label: 'if', kind: CompletionItemKind.Keyword, detail: 'Conditional statement', insertText: 'if ${1:condition} then\n\t${2}\nend', insertTextRules: 4 },
    { label: 'do', kind: CompletionItemKind.Keyword, detail: 'Call an action', insertText: 'do ${1:Page}.${2:action}', insertTextRules: 4 },
    { label: 'refresh', kind: CompletionItemKind.Keyword, detail: 'Refresh the page', insertText: 'refresh' },
    { label: 'take screenshot', kind: CompletionItemKind.Keyword, detail: 'Take full page screenshot', insertText: 'take screenshot', insertTextRules: 4 },
    { label: 'take screenshot as', kind: CompletionItemKind.Keyword, detail: 'Take full page screenshot with filename', insertText: 'take screenshot as "${1:filename.png}"', insertTextRules: 4 },
    { label: 'take screenshot of', kind: CompletionItemKind.Keyword, detail: 'Take element screenshot (Page.field)', insertText: 'take screenshot of ${1:Page}.${2:field}', insertTextRules: 4 },
    { label: 'take screenshot of ... as', kind: CompletionItemKind.Keyword, detail: 'Take element screenshot with filename', insertText: 'take screenshot of ${1:Page}.${2:field} as "${3:filename.png}"', insertTextRules: 4 },
    { label: 'log', kind: CompletionItemKind.Keyword, detail: 'Log a message', insertText: 'log "${1:message}"', insertTextRules: 4 },
    { label: 'upload', kind: CompletionItemKind.Keyword, detail: 'Upload a file', insertText: 'upload "${1:file}" to "${2:element}"', insertTextRules: 4 },
    { label: 'right-click', kind: CompletionItemKind.Keyword, detail: 'Right-click an element', insertText: 'right-click "${1:element}"', insertTextRules: 4 },
    { label: 'double-click', kind: CompletionItemKind.Keyword, detail: 'Double-click an element', insertText: 'double-click "${1:element}"', insertTextRules: 4 },
    { label: 'drag', kind: CompletionItemKind.Keyword, detail: 'Drag an element', insertText: 'drag "${1:source}" to "${2:target}"', insertTextRules: 4 },
];

/**
 * Keywords for VERIFY conditions
 */
const VERIFY_CONDITIONS: CompletionItem[] = [
    { label: 'is visible', kind: CompletionItemKind.Property, detail: 'Element is visible', insertText: 'is visible' },
    { label: 'is not visible', kind: CompletionItemKind.Property, detail: 'Element is not visible', insertText: 'is not visible' },
    { label: 'is enabled', kind: CompletionItemKind.Property, detail: 'Element is enabled', insertText: 'is enabled' },
    { label: 'is disabled', kind: CompletionItemKind.Property, detail: 'Element is disabled', insertText: 'is disabled' },
    { label: 'is checked', kind: CompletionItemKind.Property, detail: 'Checkbox is checked', insertText: 'is checked' },
    { label: 'is focused', kind: CompletionItemKind.Property, detail: 'Element is focused', insertText: 'is focused' },
    { label: 'has text', kind: CompletionItemKind.Property, detail: 'Element has exact text', insertText: 'has text "${1:expected}"', insertTextRules: 4 },
    { label: 'contains text', kind: CompletionItemKind.Property, detail: 'Element contains text', insertText: 'contains text "${1:expected}"', insertTextRules: 4 },
    { label: 'has class', kind: CompletionItemKind.Property, detail: 'Element has CSS class', insertText: 'has class "${1:classname}"', insertTextRules: 4 },
    { label: 'has value', kind: CompletionItemKind.Property, detail: 'Input has value', insertText: 'has value "${1:value}"', insertTextRules: 4 },
    { label: 'has count', kind: CompletionItemKind.Property, detail: 'Number of matching elements', insertText: 'has count ${1:number}', insertTextRules: 4 },
];

/**
 * Page/URL assertions
 */
const PAGE_ASSERTIONS: CompletionItem[] = [
    { label: 'url contains', kind: CompletionItemKind.Property, detail: 'URL contains substring', insertText: 'url contains "${1:text}"', insertTextRules: 4 },
    { label: 'url equals', kind: CompletionItemKind.Property, detail: 'URL equals exactly', insertText: 'url equals "${1:url}"', insertTextRules: 4 },
    { label: 'page title is', kind: CompletionItemKind.Property, detail: 'Page title equals', insertText: 'page title is "${1:title}"', insertTextRules: 4 },
    { label: 'page title contains', kind: CompletionItemKind.Property, detail: 'Page title contains', insertText: 'page title contains "${1:text}"', insertTextRules: 4 },
    { label: 'element count of', kind: CompletionItemKind.Property, detail: 'Count matching elements', insertText: 'element count of "${1:selector}" is ${2:count}', insertTextRules: 4 },
];

/**
 * Structure keywords for pages/features
 */
const STRUCTURE_KEYWORDS: CompletionItem[] = [
    { label: 'page', kind: CompletionItemKind.Class, detail: 'Define a page object', insertText: 'page ${1:PageName} {\n\t${2}\n}', insertTextRules: 4 },
    { label: 'feature', kind: CompletionItemKind.Class, detail: 'Define a feature', insertText: 'feature "${1:Feature Name}" {\n\t${2}\n}', insertTextRules: 4 },
    { label: 'scenario', kind: CompletionItemKind.Function, detail: 'Define a scenario', insertText: 'scenario "${1:Scenario Name}" {\n\t${2}\n}', insertTextRules: 4 },
    { label: 'field', kind: CompletionItemKind.Field, detail: 'Define a page field', insertText: 'field ${1:fieldName} = "${2:selector}"', insertTextRules: 4 },
    { label: 'action', kind: CompletionItemKind.Method, detail: 'Define a page action', insertText: 'action ${1:actionName} {\n\t${2}\n}', insertTextRules: 4 },
    { label: 'use', kind: CompletionItemKind.Reference, detail: 'Import a page', insertText: 'use ${1:PageName}', insertTextRules: 4 },
    { label: 'before each', kind: CompletionItemKind.Event, detail: 'Run before each scenario', insertText: 'before each {\n\t${1}\n}', insertTextRules: 4 },
    { label: 'after each', kind: CompletionItemKind.Event, detail: 'Run after each scenario', insertText: 'after each {\n\t${1}\n}', insertTextRules: 4 },
];

type ContextType = 'empty' | 'keyword' | 'afterVerify' | 'afterClick' | 'afterFill' | 'afterDo' | 'afterVariable' | 'structure';

function analyzeContext(ctx: CompletionContext): { type: ContextType; trigger?: string } {
    const beforeCursor = ctx.lineContent.substring(0, ctx.column - 1).trim().toLowerCase();

    if (!beforeCursor) {
        return { type: ctx.lineNumber === 1 ? 'structure' : 'empty' };
    }

    if (/^verify\s+"[^"]*"\s*$/.test(beforeCursor)) return { type: 'afterVerify' };
    if (/^verify\s+$/.test(beforeCursor)) return { type: 'afterVerify', trigger: 'target' };
    if (/^click\s*$/.test(beforeCursor)) return { type: 'afterClick' };
    if (/^fill\s+"[^"]*"\s+with\s+$/.test(beforeCursor)) return { type: 'afterFill' };
    if (/^do\s+$/.test(beforeCursor)) return { type: 'afterDo' };
    if (beforeCursor.endsWith('$')) return { type: 'afterVariable' };
    if (ctx.wordBefore && ctx.wordBefore.length > 0) return { type: 'keyword', trigger: ctx.wordBefore };

    return { type: 'empty' };
}

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

        case 'afterVerify':
            items.push(...VERIFY_CONDITIONS);
            items.push(...PAGE_ASSERTIONS);
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
    if (analysis.trigger && analysis.trigger.length > 0) {
        const filterLower = analysis.trigger.toLowerCase();
        return items.filter(item =>
            item.label.toLowerCase().startsWith(filterLower) ||
            item.label.toLowerCase().includes(filterLower)
        );
    }

    return items;
}

/**
 * Get all available keywords (for highlighting/tokenization)
 */
export function getAllKeywords(): string[] {
    const keywords: string[] = [];

    for (const item of [...STATEMENT_KEYWORDS, ...STRUCTURE_KEYWORDS]) {
        keywords.push(item.label.split(' ')[0]);  // Get first word
    }

    // Add assertion keywords
    keywords.push('is', 'not', 'visible', 'hidden', 'enabled', 'disabled', 'checked', 'focused');
    keywords.push('has', 'text', 'class', 'value', 'count', 'contains', 'attribute');
    keywords.push('url', 'title', 'page', 'element');

    return [...new Set(keywords)];
}

/**
 * Export for Monaco integration
 */
export default {
    provideCompletions,
    getAllKeywords,
    CompletionItemKind,
};

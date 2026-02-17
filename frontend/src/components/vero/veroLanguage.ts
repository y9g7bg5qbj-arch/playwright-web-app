import type { Monaco } from '@monaco-editor/react';
import type * as MonacoEditor from 'monaco-editor';
import {
    provideDocumentSymbols,
    provideHover,
    provideFoldingRanges,
    provideDefinition,
    provideReferences,
    parseVeroPages,
    provideQuickFixes,
    formatDocument,
    type VeroPageDefinition,
    type HoverContext,
    type DefinitionContext,
    type ReferencesContext,
    type CodeActionContext,
    type FormattingOptions,
    type FormattingTextEdit,
} from 'vero-lang';

// =============================================================================
// Token Categories
// =============================================================================

// =============================================================================
// Theme Definitions
// =============================================================================

interface ThemeRule {
    token: string;
    foreground: string;
    fontStyle?: string;
}

const DARK_THEME_RULES: ThemeRule[] = [
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    { token: 'tag', foreground: '00FF41', fontStyle: 'bold' },
    { token: 'string', foreground: 'A5D6A7' },
    { token: 'number', foreground: '00FF41', fontStyle: 'bold' },
    { token: 'keyword.structure', foreground: 'BB86FC', fontStyle: 'bold' },
    { token: 'keyword.hook', foreground: 'BB86FC', fontStyle: 'bold' },
    { token: 'keyword.control', foreground: '00FF41', fontStyle: 'bold' },
    { token: 'keyword.operator', foreground: '00FF41', fontStyle: 'bold' },
    { token: 'type.selector', foreground: '00FF41', fontStyle: 'bold' },
    { token: 'function.action', foreground: '00FF41', fontStyle: 'bold' },
    { token: 'keyword.assertion', foreground: '00FF41', fontStyle: 'bold' },
    { token: 'constant.condition', foreground: '00FF41', fontStyle: 'bold' },
    { token: 'type', foreground: '00FF41', fontStyle: 'bold' },
    { token: 'type.identifier', foreground: 'E0E0E0' },
    { token: 'variable.name', foreground: '82B1FF' },
    { token: 'identifier', foreground: 'E0E0E0' },
    { token: 'keyword.vdql', foreground: 'FFAB40', fontStyle: 'bold' },
    { token: 'keyword.vdql.operator', foreground: 'FFAB40' },
    { token: 'function.vdql', foreground: 'FFAB40', fontStyle: 'bold' },
    { token: 'operator.vdql', foreground: 'FF7043' },
    { token: 'variable.vdql.table', foreground: '03DAC5', fontStyle: 'bold' },
    { token: 'variable.vdql.name', foreground: '82B1FF' },
    { token: 'function.utility.string', foreground: '64B5F6', fontStyle: 'bold' },
    { token: 'function.utility.date', foreground: '81C784', fontStyle: 'bold' },
    { token: 'function.utility.number', foreground: 'FFB74D', fontStyle: 'bold' },
    { token: 'function.utility.generate', foreground: 'BA68C8', fontStyle: 'bold' },
];

const LIGHT_THEME_RULES: ThemeRule[] = [
    { token: 'comment', foreground: '008000', fontStyle: 'italic' },
    { token: 'tag', foreground: '795E26' },
    { token: 'string', foreground: 'A31515' },
    { token: 'number', foreground: '098658' },
    { token: 'keyword.structure', foreground: 'AF00DB', fontStyle: 'bold' },
    { token: 'keyword.hook', foreground: 'AF00DB' },
    { token: 'keyword.control', foreground: 'AF00DB' },
    { token: 'keyword.operator', foreground: '0000FF' },
    { token: 'type.selector', foreground: '267F99' },
    { token: 'function.action', foreground: '795E26' },
    { token: 'keyword.assertion', foreground: '0070C1', fontStyle: 'bold' },
    { token: 'constant.condition', foreground: '0070C1' },
    { token: 'type', foreground: '267F99' },
    { token: 'type.identifier', foreground: '267F99' },
    { token: 'variable.name', foreground: '1565C0' },
    { token: 'identifier', foreground: '000000' },
    { token: 'keyword.vdql', foreground: 'E65100', fontStyle: 'bold' },
    { token: 'keyword.vdql.operator', foreground: 'E65100' },
    { token: 'function.vdql', foreground: 'E65100', fontStyle: 'bold' },
    { token: 'operator.vdql', foreground: 'BF360C' },
    { token: 'variable.vdql.table', foreground: '00838F', fontStyle: 'bold' },
    { token: 'variable.vdql.name', foreground: '1565C0' },
    { token: 'function.utility.string', foreground: '1565C0', fontStyle: 'bold' },
    { token: 'function.utility.date', foreground: '2E7D32', fontStyle: 'bold' },
    { token: 'function.utility.number', foreground: 'EF6C00', fontStyle: 'bold' },
    { token: 'function.utility.generate', foreground: '7B1FA2', fontStyle: 'bold' },
];

// =============================================================================
// Language Registration
// =============================================================================

export function registerVeroLanguage(monaco: Monaco): void {
    monaco.languages.register({ id: 'vero' });

    monaco.languages.setLanguageConfiguration('vero', {
        comments: { lineComment: '#' },
        brackets: [['{', '}'], ['(', ')']],
        autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
        ],
        surroundingPairs: [
            { open: '{', close: '}' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
        ],
    });

    monaco.languages.setMonarchTokensProvider('vero', {
        ignoreCase: true,
        tokenizer: {
            root: [
                [/(#|\/\/).*$/, 'comment'],
                [/@[a-zA-Z][a-zA-Z0-9]*/, 'tag'],
                [/"([^"\\]|\\.)*"/, 'string'],
                [/\b\d+(\.\d+)?\b/, 'number'],
                [/\b[A-Z][a-zA-Z0-9]*\.[a-zA-Z][a-zA-Z0-9]*\b/, 'variable.name'],

                // VDQL compound patterns — must come before individual keyword rules
                // ROW/ROWS x FROM TableName  (blue variable, gold table)
                [/\b(ROW|ROWS)(\s+)(\w+)(\s+)(FROM)(\s+)([A-Z]\w*)/i,
                    ['keyword.vdql', '', 'variable.vdql.name', '', 'keyword.vdql', '', 'variable.vdql.table']],
                // NUMBER total = COUNT TableName
                [/\b(NUMBER)(\s+)(\w+)(\s*)(=)(\s*)(COUNT)(\s+)([A-Z]\w*)/i,
                    ['keyword.vdql', '', 'variable.vdql.name', '', 'operator.vdql', '', 'function.vdql', '', 'variable.vdql.table']],
                // WHERE/AND/OR column_name — color the column reference
                [/\b(WHERE|AND|OR)(\s+)(\w+)/i,
                    ['keyword.vdql', '', 'variable.vdql.name']],

                // Assertion phrase rules must come before generic keyword rules
                // so PAGE/TITLE in VERIFY PAGE TITLE are not colored as structure/selector keywords.
                [/\b(verify)(\s+)(page)(\s+)(title)\b/i,
                    ['keyword.assertion', '', 'keyword.assertion', '', 'keyword.assertion']],
                [/\b(verify)(\s+)(title)\b/i,
                    ['keyword.assertion', '', 'keyword.assertion']],

                [/\b(page|feature|scenario|field|use)\b/i, 'keyword.structure'],
                [/\b(before|after|all|each)\b/i, 'keyword.hook'],
                [/\b(if|else|repeat|times)\b/i, 'keyword.control'],
                [/\b(with|and|to|in|returns|return|then|as|into)\b/i, 'keyword.operator'],
                // The 9 Vero selector keywords + 'name' modifier
                [/\b(role|text|label|placeholder|alt|title|testid|css|xpath|name)\b/i, 'type.selector'],
                [/\b(verify|screenshot|matches|strict|balanced|relaxed|threshold|max_diff_pixels|max_diff_ratio)\b/i, 'keyword.assertion'],
                [/\b(click|fill|open|check|uncheck|select|hover|press|scroll|wait|perform|do|refresh|clear|take|screenshot|log|switch|new|tab|close|other|tabs|accept|dismiss|dialog|frame|main|download|cookie|cookies|storage|set|get|navigation|network|idle)\b/i, 'function.action'],
                [/\b(is|not|visible|hidden|enabled|disabled|checked|contains|empty|has|value|count|nth|without|exact)\b/i, 'constant.condition'],
                [/\b(text|number|flag|list|seconds|milliseconds)\b/i, 'type'],
                [/\b(row|rows|data|from|by|where|order|asc|desc|limit|offset|first|last|random|default)\b/i, 'keyword.vdql'],
                [/\b(or|starts|ends|matches|null)\b/i, 'keyword.vdql.operator'],
                [/\b(count|sum|average|min|max|distinct|columns|headers)\b/i, 'function.vdql'],
                [/\b(trim|convert|uppercase|lowercase|extract|replace|split|join|length|pad)\b/i, 'function.utility.string'],
                [/\b(today|now|add|subtract|day|days|month|months|year|years|format)\b/i, 'function.utility.date'],
                [/\b(round|decimals|up|down|absolute|currency|percent)\b/i, 'function.utility.number'],
                [/\b(generate|uuid)\b/i, 'function.utility.generate'],
                [/==|!=|>=|<=|>|</, 'operator.vdql'],
                [/\bTestData\.[A-Z][a-zA-Z0-9]*/, 'variable.vdql.table'],
                [/\b[A-Z][a-zA-Z0-9]*\b/, 'type.identifier'],
                [/\b[a-z][a-zA-Z0-9]*\b/, 'identifier'],
            ],
        },
    });

    monaco.editor.defineTheme('vero-camel', {
        base: 'vs-dark',
        inherit: true,
        rules: DARK_THEME_RULES,
        colors: {
            'editor.background': '#121212',
            'editor.foreground': '#E0E0E0',
            'editor.lineHighlightBackground': '#1E1E1E',
            'editor.selectionBackground': '#BB86FC40',
            'editorCursor.foreground': '#BB86FC',
            'editorLineNumber.foreground': '#5C5C5C',
            'editorLineNumber.activeForeground': '#BB86FC',
        },
    });

    monaco.editor.defineTheme('vero-light', {
        base: 'vs',
        inherit: true,
        rules: LIGHT_THEME_RULES,
        colors: { 'editor.background': '#FFFFFF' },
    });
}

// =============================================================================
// Code Parsing
// =============================================================================

export interface VeroCodeItem {
    type: 'feature' | 'scenario';
    name: string;
    line: number;
}

export function parseVeroCode(code: string): VeroCodeItem[] {
    const items: VeroCodeItem[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const featureMatch = line.match(/^\s*(?:FEATURE|feature)\s+(\w+)\s*\{/);
        if (featureMatch) {
            items.push({ type: 'feature', name: featureMatch[1], line: i + 1 });
        }

        // Support both quoted and unquoted scenario names:
        // - SCENARIO "My Scenario Name" { ... }
        // - SCENARIO MyScenarioName @tag { ... }
        const quotedScenarioMatch = line.match(/^\s*(?:SCENARIO|scenario)\s+"([^"]+)"/);
        if (quotedScenarioMatch) {
            items.push({ type: 'scenario', name: quotedScenarioMatch[1], line: i + 1 });
        } else {
            // Unquoted: capture word until whitespace, @tag, or {
            const unquotedScenarioMatch = line.match(/^\s*(?:SCENARIO|scenario)\s+(\w+)(?:\s|@|\{)/);
            if (unquotedScenarioMatch) {
                items.push({ type: 'scenario', name: unquotedScenarioMatch[1], line: i + 1 });
            }
        }
    }
    return items;
}

export { parseVeroPages };
export type { VeroPageDefinition };

// =============================================================================
// Page & Test Data Registries (used by completion providers)
// =============================================================================

export interface TestDataSheetDefinition {
    name: string;
    columns: { name: string; type: string }[];
}

// Registries are populated externally when project files are loaded.
// Completion providers read from these to offer contextual suggestions.
const globalPageRegistry = new Map<string, VeroPageDefinition>();
const testDataRegistry = new Map<string, TestDataSheetDefinition>();

export function getRegisteredPages(): VeroPageDefinition[] {
    return Array.from(globalPageRegistry.values());
}

export function getRegisteredTestDataSheets(): TestDataSheetDefinition[] {
    return Array.from(testDataRegistry.values());
}

/**
 * Populate the test data registry with sheet definitions from the API.
 * Called by useTestDataRegistry when the project loads.
 */
export function registerTestDataSheets(sheets: TestDataSheetDefinition[]): void {
    testDataRegistry.clear();
    for (const sheet of sheets) {
        testDataRegistry.set(sheet.name, sheet);
    }
}

// =============================================================================
// Completion Provider Helpers
// =============================================================================

function toPascalCase(str: string): string {
    return str
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

interface CompletionSuggestion {
    label: string;
    kind: number;
    insertText: string;
    insertTextRules?: number;
    detail?: string;
    documentation?: string;
}

function createSnippet(
    monaco: Monaco,
    label: string,
    insertText: string,
    detail: string,
    documentation?: string
): CompletionSuggestion {
    return {
        label,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail,
        documentation,
    };
}

function createKeyword(monaco: Monaco, label: string, insertText: string, detail: string): CompletionSuggestion {
    return {
        label,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText,
        detail,
    };
}

function createConstant(monaco: Monaco, label: string, detail: string, documentation?: string): CompletionSuggestion {
    return {
        label,
        kind: monaco.languages.CompletionItemKind.Constant,
        insertText: label,
        detail,
        documentation,
    };
}

// =============================================================================
// Utility Completion Definitions
// =============================================================================

function getStringUtilitySuggestions(monaco: Monaco): CompletionSuggestion[] {
    return [
        createSnippet(monaco, 'TRIM', 'TRIM ${1:value}', 'Remove whitespace', 'TRIM $input - Remove leading and trailing whitespace'),
        createSnippet(monaco, 'CONVERT', 'CONVERT ${1:value} TO ${2|UPPERCASE,LOWERCASE,NUMBER,TEXT|}', 'Convert value type', 'CONVERT $name TO UPPERCASE'),
        createSnippet(monaco, 'EXTRACT', 'EXTRACT ${1:text} FROM ${2:0} TO ${3:5}', 'Extract substring', 'EXTRACT $text FROM 0 TO 5'),
        createSnippet(monaco, 'REPLACE', 'REPLACE ${1:text} "${2:search}" WITH "${3:replace}"', 'Replace text', 'REPLACE $url "http" WITH "https"'),
        createSnippet(monaco, 'SPLIT', 'SPLIT ${1:text} BY "${2:,}"', 'Split into list', 'SPLIT $csv BY ","'),
        createSnippet(monaco, 'JOIN', 'JOIN ${1:list} WITH "${2:, }"', 'Join list elements', 'JOIN $items WITH ", "'),
        createSnippet(monaco, 'LENGTH OF', 'LENGTH OF ${1:text}', 'Get string length', 'LENGTH OF $name'),
        createSnippet(monaco, 'PAD', 'PAD ${1:value} TO ${2:5} WITH "${3:0}"', 'Pad string', 'PAD $num TO 5 WITH "0"'),
    ];
}

function getDateUtilitySuggestions(monaco: Monaco): CompletionSuggestion[] {
    return [
        createConstant(monaco, 'TODAY', 'Current date', "Returns today's date in YYYY-MM-DD format"),
        createConstant(monaco, 'NOW', 'Current datetime', 'Returns current date and time'),
        createSnippet(monaco, 'ADD', 'ADD ${1:7} ${2|DAYS,MONTHS,YEARS|} TO ${3:TODAY}', 'Add to date', 'ADD 7 DAYS TO TODAY'),
        createSnippet(monaco, 'SUBTRACT', 'SUBTRACT ${1:30} ${2|DAYS,MONTHS,YEARS|} FROM ${3:TODAY}', 'Subtract from date', 'SUBTRACT 30 DAYS FROM TODAY'),
        createSnippet(monaco, 'FORMAT', 'FORMAT ${1:date} AS "${2:MM/DD/YYYY}"', 'Format date/number', 'FORMAT $date AS "MM/DD/YYYY"'),
        createSnippet(monaco, 'YEAR OF', 'YEAR OF ${1:date}', 'Get year', 'YEAR OF $birthDate'),
        createSnippet(monaco, 'MONTH OF', 'MONTH OF ${1:date}', 'Get month', 'MONTH OF $date'),
        createSnippet(monaco, 'DAY OF', 'DAY OF ${1:date}', 'Get day', 'DAY OF $date'),
    ];
}

function getNumberUtilitySuggestions(monaco: Monaco): CompletionSuggestion[] {
    return [
        createSnippet(monaco, 'ROUND', 'ROUND ${1:value} TO ${2:2} DECIMALS', 'Round number', 'ROUND $price TO 2 DECIMALS'),
        createSnippet(monaco, 'ROUND UP', 'ROUND ${1:value} UP', 'Round up (ceiling)', 'ROUND $items UP'),
        createSnippet(monaco, 'ROUND DOWN', 'ROUND ${1:value} DOWN', 'Round down (floor)', 'ROUND $items DOWN'),
        createSnippet(monaco, 'ABSOLUTE', 'ABSOLUTE ${1:value}', 'Absolute value', 'ABSOLUTE $change'),
        createSnippet(monaco, 'FORMAT AS CURRENCY', 'FORMAT ${1:amount} AS CURRENCY "${2:USD}"', 'Format as currency', 'FORMAT $total AS CURRENCY "USD"'),
        createSnippet(monaco, 'FORMAT AS PERCENT', 'FORMAT ${1:rate} AS PERCENT', 'Format as percentage', 'FORMAT $discount AS PERCENT'),
    ];
}

function getGenerateUtilitySuggestions(monaco: Monaco): CompletionSuggestion[] {
    return [
        createSnippet(monaco, 'GENERATE', 'GENERATE "${1:[A-Z0-9]{8}}"', 'Generate random string', 'GENERATE "[A-Z0-9]{8}" - Generates random string from pattern'),
        { label: 'GENERATE UUID', kind: monaco.languages.CompletionItemKind.Function, insertText: 'GENERATE UUID', detail: 'Generate UUID', documentation: 'GENERATE UUID - Generates a random UUID v4' },
        createSnippet(monaco, 'RANDOM NUMBER', 'RANDOM NUMBER FROM ${1:1} TO ${2:100}', 'Random number in range', 'RANDOM NUMBER FROM 1 TO 100'),
    ];
}

function getAllUtilitySuggestions(monaco: Monaco): CompletionSuggestion[] {
    return [
        ...getStringUtilitySuggestions(monaco),
        ...getDateUtilitySuggestions(monaco),
        ...getNumberUtilitySuggestions(monaco),
        ...getGenerateUtilitySuggestions(monaco),
    ];
}

function getVisualAssertionSuggestions(monaco: Monaco): CompletionSuggestion[] {
    return [
        createSnippet(
            monaco,
            'VERIFY SCREENSHOT',
            'VERIFY SCREENSHOT AS "${1:home}" WITH ${2|STRICT,BALANCED,RELAXED|}',
            'Visual baseline assertion (page)',
            'Compares the current page screenshot against the baseline image.'
        ),
        createSnippet(
            monaco,
            'VERIFY TARGET MATCHES SCREENSHOT',
            'VERIFY ${1:PageName}.${2:fieldName} MATCHES SCREENSHOT AS "${3:element}" WITH ${4|STRICT,BALANCED,RELAXED|}',
            'Visual baseline assertion (locator)',
            'Compares a locator screenshot against the baseline image.'
        ),
        createSnippet(
            monaco,
            'WITH THRESHOLDS',
            'WITH ${1|STRICT,BALANCED,RELAXED|} THRESHOLD ${2:0.2} MAX_DIFF_PIXELS ${3:0} MAX_DIFF_RATIO ${4:0}',
            'Visual tolerance options',
            'Optional strictness overrides for screenshot assertions.'
        ),
    ];
}

// =============================================================================
// Completion Providers
// =============================================================================

export function registerVeroCompletionProvider(monaco: Monaco): void {
    // Visual screenshot assertion completions.
    monaco.languages.registerCompletionItemProvider('vero', {
        triggerCharacters: [' ', '\n'],
        provideCompletionItems: (model: MonacoEditor.editor.ITextModel, position: MonacoEditor.Position) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1).trim();
            const suggestions: CompletionSuggestion[] = [];

            if (/^verify\s*$/i.test(textBeforeCursor)) {
                suggestions.push(...getVisualAssertionSuggestions(monaco));
            }

            if (/^verify\s+(?!screenshot\b)(?:[A-Z]\w*\.\w+|\w+|"[^"]*")\s*$/i.test(textBeforeCursor)) {
                suggestions.push(
                    createSnippet(
                        monaco,
                        'MATCHES SCREENSHOT',
                        'MATCHES SCREENSHOT AS "${1:element}" WITH ${2|STRICT,BALANCED,RELAXED|}',
                        'Compare locator to baseline screenshot'
                    )
                );
            }

            if (/^verify\s+screenshot(?:\s+as\s+"[^"]*")?\s+with\s*$/i.test(textBeforeCursor) ||
                /\bmatches\s+screenshot(?:\s+as\s+"[^"]*")?\s+with\s*$/i.test(textBeforeCursor)) {
                suggestions.push(
                    createKeyword(monaco, 'STRICT', 'STRICT', 'Lowest tolerance for visual diffs'),
                    createKeyword(monaco, 'BALANCED', 'BALANCED', 'Default visual tolerance'),
                    createKeyword(monaco, 'RELAXED', 'RELAXED', 'Higher tolerance for noisy rendering'),
                    createSnippet(monaco, 'THRESHOLD', 'THRESHOLD ${1:0.2}', 'Set pixel comparison threshold'),
                    createSnippet(monaco, 'MAX_DIFF_PIXELS', 'MAX_DIFF_PIXELS ${1:0}', 'Set max allowed differing pixels'),
                    createSnippet(monaco, 'MAX_DIFF_RATIO', 'MAX_DIFF_RATIO ${1:0.01}', 'Set max allowed differing pixel ratio'),
                );
            }

            return { suggestions };
        },
    });

    // Dot-triggered completion for page/TestData members
    monaco.languages.registerCompletionItemProvider('vero', {
        triggerCharacters: ['.'],
        provideCompletionItems: (model: MonacoEditor.editor.ITextModel, position: MonacoEditor.Position) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1);
            const suggestions: CompletionSuggestion[] = [];

            // TestData. - show available sheets
            if (textBeforeCursor.match(/\bTestData\.$/)) {
                getRegisteredTestDataSheets().forEach(sheet => {
                    const className = toPascalCase(sheet.name);
                    suggestions.push({
                        label: className,
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: className,
                        detail: `Test data sheet (${sheet.columns.length} columns)`,
                    });
                });
                return { suggestions };
            }

            // TestData.TableName. - show sheet methods
            const testDataSheetMatch = textBeforeCursor.match(/\bTestData\.(\w+)\.$/);
            if (testDataSheetMatch) {
                const sheet = getRegisteredTestDataSheets().find(s => toPascalCase(s.name) === testDataSheetMatch[1]);
                if (sheet) {
                    suggestions.push(
                        { label: 'fromScenarioId', kind: monaco.languages.CompletionItemKind.Method, insertText: "fromScenarioId('TC001')", detail: 'Get data by scenario ID' },
                        { label: 'getAll', kind: monaco.languages.CompletionItemKind.Method, insertText: 'getAll()', detail: 'Get all test data rows' },
                        { label: 'count', kind: monaco.languages.CompletionItemKind.Property, insertText: 'count', detail: 'Number of rows' },
                        { label: 'getTestIds', kind: monaco.languages.CompletionItemKind.Method, insertText: 'getTestIds()', detail: 'Get all test IDs' }
                    );
                    return { suggestions };
                }
            }

            // PageName. - show page fields and actions
            const pageRefMatch = textBeforeCursor.match(/\b([A-Z]\w*)\.$/);
            if (pageRefMatch && pageRefMatch[1] !== 'TestData') {
                const pageName = pageRefMatch[1];
                let page = getRegisteredPages().find((p: VeroPageDefinition) => p.name === pageName);
                if (!page) {
                    const localPages = parseVeroPages(model.getValue());
                    page = localPages.find((p: VeroPageDefinition) => p.name === pageName);
                }
                if (page) {
                    page.fields.forEach((field: string) => suggestions.push({
                        label: field,
                        kind: monaco.languages.CompletionItemKind.Field,
                        insertText: field,
                        detail: `field in ${pageName}`,
                    }));
                    page.actions.forEach((action: string) => suggestions.push({
                        label: action,
                        kind: monaco.languages.CompletionItemKind.Method,
                        insertText: action,
                        detail: `action in ${pageName}`,
                    }));
                }
            }
            return { suggestions };
        },
    });

    // Close-paren triggered completion for TestData method results
    monaco.languages.registerCompletionItemProvider('vero', {
        triggerCharacters: [')'],
        provideCompletionItems: (model: MonacoEditor.editor.ITextModel, position: MonacoEditor.Position) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1);
            const suggestions: CompletionSuggestion[] = [];

            const fromScenarioMatch = textBeforeCursor.match(/\bTestData\.(\w+)\.fromScenarioId\([^)]*\)\.?$/);
            if (fromScenarioMatch) {
                const sheet = getRegisteredTestDataSheets().find(s => toPascalCase(s.name) === fromScenarioMatch[1]);
                if (sheet) {
                    suggestions.push({ label: 'TestID', kind: monaco.languages.CompletionItemKind.Property, insertText: 'TestID', detail: 'string' });
                    sheet.columns.forEach(col => suggestions.push({
                        label: col.name,
                        kind: monaco.languages.CompletionItemKind.Property,
                        insertText: col.name,
                        detail: col.type,
                    }));
                }
            }
            return { suggestions };
        },
    });

    registerVDQLCompletionProvider(monaco);
    registerUtilityCompletionProvider(monaco);
    registerModifierCompletionProvider(monaco);
}

function registerUtilityCompletionProvider(monaco: Monaco): void {
    monaco.languages.registerCompletionItemProvider('vero', {
        triggerCharacters: [' ', '\n', '='],
        provideCompletionItems: (model: MonacoEditor.editor.ITextModel, position: MonacoEditor.Position) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1).trim();
            const suggestions: CompletionSuggestion[] = [];

            // After = sign for variable assignment: TEXT result =
            if (textBeforeCursor.match(/\b(TEXT|NUMBER|FLAG|LIST)\s+\w+\s*=\s*$/i)) {
                suggestions.push(...getAllUtilitySuggestions(monaco));
                return { suggestions };
            }

            // After THEN keyword for chaining
            if (textBeforeCursor.match(/\bTHEN\s*$/i)) {
                suggestions.push(
                    { label: 'TRIM', kind: monaco.languages.CompletionItemKind.Function, insertText: 'TRIM', detail: 'Remove whitespace' },
                    { label: 'CONVERT TO UPPERCASE', kind: monaco.languages.CompletionItemKind.Function, insertText: 'CONVERT TO UPPERCASE', detail: 'Convert to uppercase' },
                    { label: 'CONVERT TO LOWERCASE', kind: monaco.languages.CompletionItemKind.Function, insertText: 'CONVERT TO LOWERCASE', detail: 'Convert to lowercase' },
                    createSnippet(monaco, 'REPLACE', 'REPLACE "${1:search}" WITH "${2:replace}"', 'Replace text'),
                    createSnippet(monaco, 'FORMAT AS', 'FORMAT AS "${1:MM/DD/YYYY}"', 'Format value'),
                );
                return { suggestions };
            }

            // After FORMAT ... AS
            if (textBeforeCursor.match(/\bFORMAT\s+\S+\s+AS\s*$/i)) {
                suggestions.push(
                    createSnippet(monaco, 'CURRENCY', 'CURRENCY "${1:USD}"', 'Currency format'),
                    createKeyword(monaco, 'PERCENT', 'PERCENT', 'Percentage format'),
                    { label: '"MM/DD/YYYY"', kind: monaco.languages.CompletionItemKind.Text, insertText: '"MM/DD/YYYY"', detail: 'US date format' },
                    { label: '"DD/MM/YYYY"', kind: monaco.languages.CompletionItemKind.Text, insertText: '"DD/MM/YYYY"', detail: 'European date format' },
                    { label: '"YYYY-MM-DD"', kind: monaco.languages.CompletionItemKind.Text, insertText: '"YYYY-MM-DD"', detail: 'ISO date format' },
                );
                return { suggestions };
            }

            // After CONVERT ... TO
            if (textBeforeCursor.match(/\bCONVERT\s+\S+\s+TO\s*$/i)) {
                ['UPPERCASE', 'LOWERCASE', 'NUMBER', 'TEXT'].forEach(type => {
                    suggestions.push(createKeyword(monaco, type, type, `Convert to ${type.toLowerCase()}`));
                });
                return { suggestions };
            }

            // After ADD <number>
            if (textBeforeCursor.match(/\bADD\s+\d+\s*$/i)) {
                const units = ['DAY', 'DAYS', 'MONTH', 'MONTHS', 'YEAR', 'YEARS'];
                units.forEach(unit => {
                    suggestions.push(createKeyword(monaco, unit, `${unit} TO `, `Add ${unit.toLowerCase()}`));
                });
                return { suggestions };
            }

            // After SUBTRACT <number>
            if (textBeforeCursor.match(/\bSUBTRACT\s+\d+\s*$/i)) {
                const units = ['DAY', 'DAYS', 'MONTH', 'MONTHS', 'YEAR', 'YEARS'];
                units.forEach(unit => {
                    suggestions.push(createKeyword(monaco, unit, `${unit} FROM `, `Subtract ${unit.toLowerCase()}`));
                });
                return { suggestions };
            }

            // After ADD ... TO or ROUND ... TO <number>
            if (textBeforeCursor.match(/\b(ADD\s+\d+\s+(DAY|DAYS|MONTH|MONTHS|YEAR|YEARS)\s+TO|ROUND\s+\S+\s+TO\s+\d+)\s*$/i)) {
                if (textBeforeCursor.match(/\bADD\s+/i)) {
                    suggestions.push(
                        createConstant(monaco, 'TODAY', 'Current date'),
                        createConstant(monaco, 'NOW', 'Current datetime'),
                    );
                }
                if (textBeforeCursor.match(/\bROUND\s+/i)) {
                    suggestions.push(createKeyword(monaco, 'DECIMALS', 'DECIMALS', 'Decimal places'));
                }
                return { suggestions };
            }

            // After ROUND <value>
            if (textBeforeCursor.match(/\bROUND\s+\S+\s*$/i)) {
                suggestions.push(
                    createSnippet(monaco, 'TO', 'TO ${1:2} DECIMALS', 'Round to decimals'),
                    createKeyword(monaco, 'UP', 'UP', 'Round up (ceiling)'),
                    createKeyword(monaco, 'DOWN', 'DOWN', 'Round down (floor)'),
                );
                return { suggestions };
            }

            return { suggestions };
        },
    });
}

function registerVDQLCompletionProvider(monaco: Monaco): void {
    // Space/newline triggered VDQL completions
    monaco.languages.registerCompletionItemProvider('vero', {
        triggerCharacters: [' ', '\n'],
        provideCompletionItems: (model: MonacoEditor.editor.ITextModel, position: MonacoEditor.Position) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1).trim();
            const suggestions: CompletionSuggestion[] = [];

            // Start of line - runtime-safe query templates
            if (textBeforeCursor === '' || textBeforeCursor.match(/^\s*$/)) {
                suggestions.push(
                    createSnippet(monaco, 'row', 'ROW ${1:one} FROM ${2:Users} WHERE ${3:id} == ${4:\"U-1001\"}', 'Runtime-safe: single row query'),
                    createSnippet(monaco, 'rows', 'ROWS ${1:many} FROM ${2:Users} WHERE ${3:status} == ${4:\"active\"} ORDER BY ${5:id} ASC LIMIT ${6:25}', 'Runtime-safe: multi-row query'),
                    createSnippet(monaco, 'count', 'NUMBER ${1:total} = COUNT ${2:Users} WHERE ${3:status} == ${4:\"active\"}', 'Runtime-safe: count query')
                );
            }

            // After ROW/ROWS x = or ROW/ROWS x FROM (suggest table names)
            if (textBeforeCursor.match(/\b(?:ROW|ROWS)\s+\w+\s*(?:=|FROM)\s*$/i)) {
                getRegisteredTestDataSheets().forEach(sheet => {
                    suggestions.push({
                        label: sheet.name,
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: sheet.name + ' ',
                        detail: `Table (${sheet.columns.length} columns)`,
                    });
                });
            }

            // After COUNT (suggest table names)
            if (textBeforeCursor.match(/\bCOUNT\s*$/i)) {
                getRegisteredTestDataSheets().forEach(sheet => {
                    suggestions.push({
                        label: sheet.name,
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: sheet.name + ' ',
                        detail: `Table (${sheet.columns.length} columns)`,
                    });
                });
            }

            // After ROW/ROWS assignment table reference - query modifiers
            if (textBeforeCursor.match(/\b(?:ROW|ROWS)\s+\w+\s*(?:=|FROM)\s+\w+\s*$/i)) {
                suggestions.push(
                    createSnippet(monaco, 'where', 'WHERE ${1:column} ${2|==,!=,>,<,>=,<=,CONTAINS,STARTS WITH,ENDS WITH|} ${3:value}', 'Filter rows'),
                    createSnippet(monaco, 'order by', 'ORDER BY ${1:column} ${2|ASC,DESC|}', 'Sort results'),
                    createSnippet(monaco, 'limit', 'LIMIT ${1:10}', 'Limit results')
                );
            }

            // After WHERE - column names (table-specific if we can parse the table name)
            if (textBeforeCursor.match(/where\s+$/i)) {
                // Try to extract table name from `ROW/ROWS x = TableName WHERE`
                const tableMatch = textBeforeCursor.match(/\b(?:ROW|ROWS)\s+\w+\s*(?:=|FROM)\s+(\w+)\s+where\s*$/i);
                const targetSheets = tableMatch
                    ? getRegisteredTestDataSheets().filter(s => s.name.toLowerCase() === tableMatch[1].toLowerCase() || toPascalCase(s.name) === tableMatch[1])
                    : getRegisteredTestDataSheets();

                const seen = new Set<string>();
                targetSheets.forEach(sheet => {
                    sheet.columns.forEach(col => {
                        if (!seen.has(col.name)) {
                            seen.add(col.name);
                            suggestions.push({
                                label: col.name,
                                kind: monaco.languages.CompletionItemKind.Field,
                                insertText: col.name,
                                detail: `Column (${col.type})${tableMatch ? '' : ` in ${sheet.name}`}`,
                            });
                        }
                    });
                });
            }

            // After WHERE <column> - comparison operators
            if (textBeforeCursor.match(/where\s+\w+\s*$/i)) {
                const operators = ['==', '!=', '>', '<', '>=', '<=', 'CONTAINS', 'STARTS WITH', 'ENDS WITH', 'MATCHES', 'IS EMPTY', 'IS NOT EMPTY', 'IN'];
                operators.forEach(op => {
                    suggestions.push({
                        label: op,
                        kind: monaco.languages.CompletionItemKind.Operator,
                        insertText: op + ' ',
                    });
                });
            }

            // After NUMBER <var> = - aggregate functions
            if (textBeforeCursor.match(/number\s+\w+\s*=\s*$/i)) {
                const functions = ['COUNT', 'SUM', 'AVERAGE', 'MIN', 'MAX', 'ROWS IN', 'COLUMNS IN'];
                functions.forEach(fn => {
                    suggestions.push({
                        label: fn,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: fn + ' ',
                    });
                });
            }

            // After AND/OR - column names for additional conditions (table-aware)
            if (textBeforeCursor.match(/\b(and|or)\s*$/i)) {
                const andOrTableMatch = textBeforeCursor.match(/\b(?:ROW|ROWS)\s+\w+\s*(?:=|FROM)\s+(\w+)\s+/i);
                const andOrSheets = andOrTableMatch
                    ? getRegisteredTestDataSheets().filter(s => s.name.toLowerCase() === andOrTableMatch[1].toLowerCase() || toPascalCase(s.name) === andOrTableMatch[1])
                    : getRegisteredTestDataSheets();

                const seen = new Set<string>();
                andOrSheets.forEach(sheet => {
                    sheet.columns.forEach(col => {
                        if (!seen.has(col.name)) {
                            seen.add(col.name);
                            suggestions.push({
                                label: col.name,
                                kind: monaco.languages.CompletionItemKind.Field,
                                insertText: col.name,
                                detail: `Column (${col.type})`,
                            });
                        }
                    });
                });
            }

            // After closing quote in WHERE clause - logical connectors
            if (textBeforeCursor.match(/["']\s*$/) && textBeforeCursor.includes('where')) {
                suggestions.push(
                    createKeyword(monaco, 'and', 'and ', 'And condition'),
                    createKeyword(monaco, 'or', 'or ', 'Or condition'),
                    createKeyword(monaco, 'order by', 'order by ', 'Sort results'),
                    createKeyword(monaco, 'limit', 'limit ', 'Limit results')
                );
            }

            return { suggestions };
        },
    });

    // Dot-triggered VDQL completions for columns
    monaco.languages.registerCompletionItemProvider('vero', {
        triggerCharacters: ['.'],
        provideCompletionItems: (model: MonacoEditor.editor.ITextModel, position: MonacoEditor.Position) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1);
            const suggestions: CompletionSuggestion[] = [];

            const tableColumnMatch = textBeforeCursor.match(/\bTestData\.(\w+)\.$/);
            if (tableColumnMatch) {
                const sheet = getRegisteredTestDataSheets().find(s => toPascalCase(s.name) === tableColumnMatch[1]);
                if (sheet) {
                    sheet.columns.forEach(col => suggestions.push({
                        label: col.name,
                        kind: monaco.languages.CompletionItemKind.Field,
                        insertText: col.name,
                        detail: `Column (${col.type})`,
                    }));
                    suggestions.push({
                        label: '[index]',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '[${1:0}]',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        detail: 'Access row by index',
                    });
                }
            }
            return { suggestions };
        },
    });
}

function registerModifierCompletionProvider(monaco: Monaco): void {
    monaco.languages.registerCompletionItemProvider('vero', {
        triggerCharacters: [' ', '"'],
        provideCompletionItems: (model: MonacoEditor.editor.ITextModel, position: MonacoEditor.Position) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1).trim();
            const suggestions: CompletionSuggestion[] = [];

            // After a selector string (FIELD x = css ".foo" | role "button" name "Submit")
            // Suggest locator refinement modifiers
            if (textBeforeCursor.match(/\b(css|xpath|text|label|placeholder|alt|title|testid)\s+"[^"]*"\s*$/i) ||
                textBeforeCursor.match(/\brole\s+"[^"]*"\s+name\s+"[^"]*"\s*$/i) ||
                textBeforeCursor.match(/\brole\s+"[^"]*"\s*$/i)) {
                suggestions.push(
                    createKeyword(monaco, 'FIRST', 'FIRST', 'Select first matching element'),
                    createKeyword(monaco, 'LAST', 'LAST', 'Select last matching element'),
                    createSnippet(monaco, 'NTH', 'NTH ${1:0}', 'Select nth matching element', 'NTH 2 → .nth(2)'),
                    createSnippet(monaco, 'WITH TEXT', 'WITH TEXT "${1:text}"', 'Filter by text content', 'WITH TEXT "Person" → .filter({ hasText: \'Person\' })'),
                    createSnippet(monaco, 'WITHOUT TEXT', 'WITHOUT TEXT "${1:text}"', 'Filter by absence of text', 'WITHOUT TEXT "Out of stock" → .filter({ hasNotText: \'Out of stock\' })'),
                    createSnippet(monaco, 'HAS', 'HAS ${1|role,css,text|} "${2:value}"', 'Filter by child locator', 'HAS role "heading" name "Title"'),
                    createSnippet(monaco, 'HAS NOT', 'HAS NOT ${1|role,css,text|} "${2:value}"', 'Filter by absence of child', 'HAS NOT role "heading" name "Title"'),
                    createKeyword(monaco, 'EXACT', 'EXACT', 'Enable exact name matching (e.g., role "textbox" EXACT name "First Name")'),
                );
            }

            return { suggestions };
        },
    });
}

// =============================================================================
// LSP Providers
// =============================================================================

// =============================================================================
// VDQL Hover Preview (shows match count + sample rows on hover)
// =============================================================================

interface ParsedVDQLHover {
    tableName: string;
    filters: { column: string; operator: string; value: string }[];
}

function parseVDQLLineForHover(line: string): ParsedVDQLHover | null {
    // Match ROW/ROWS var =/FROM TableName [WHERE ...] or COUNT TableName [WHERE ...]
    const rowMatch = line.match(/\b(?:ROW|ROWS)\s+\w+\s*(?:=|FROM)\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
    const countMatch = line.match(/\bCOUNT\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
    const match = rowMatch || countMatch;
    if (!match) return null;

    const tableName = match[1];
    const whereClause = match[2];
    const filters: ParsedVDQLHover['filters'] = [];

    if (whereClause) {
        // Split on AND/OR and parse each condition
        const conditions = whereClause.split(/\s+(?:AND|OR)\s+/i);
        for (const cond of conditions) {
            const condMatch = cond.match(/(\w+)\s*(==|!=|>=|<=|>|<|CONTAINS|STARTS\s+WITH|ENDS\s+WITH)\s*"?([^"]*)"?/i);
            if (condMatch) {
                filters.push({
                    column: condMatch[1],
                    operator: condMatch[2].trim(),
                    value: condMatch[3],
                });
            }
        }
    }

    return { tableName, filters };
}

function registerVDQLHoverPreviewProvider(monaco: Monaco, options?: { getProjectId?: () => string | null }): void {
    monaco.languages.registerHoverProvider('vero', {
        provideHover: async (model: MonacoEditor.editor.ITextModel, position: MonacoEditor.Position) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const parsed = parseVDQLLineForHover(lineContent);
            if (!parsed) return null;

            const projectId = options?.getProjectId?.();
            if (!projectId) {
                return {
                    range: new monaco.Range(position.lineNumber, 1, position.lineNumber, lineContent.length + 1),
                    contents: [{ value: `**${parsed.tableName}** — no project context for preview` }],
                };
            }

            try {
                const response = await fetch('/api/test-data/preview-query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        tableName: parsed.tableName,
                        applicationId: projectId,
                        filters: parsed.filters,
                        limit: 3,
                    }),
                });

                if (!response.ok) return null;
                const data = await response.json();

                if (!data.success) {
                    return {
                        range: new monaco.Range(position.lineNumber, 1, position.lineNumber, lineContent.length + 1),
                        contents: [{ value: `**${parsed.tableName}** — ${data.error || 'preview unavailable'}` }],
                    };
                }

                const lines: string[] = [];
                lines.push(`**${parsed.tableName}** — ${data.matchCount} matching row${data.matchCount === 1 ? '' : 's'}`);

                if (data.preview && data.preview.length > 0) {
                    // Build a mini markdown table from the first few rows
                    const allKeys = new Set<string>();
                    for (const row of data.preview) {
                        Object.keys(row).forEach((k) => allKeys.add(k));
                    }
                    const keys = Array.from(allKeys).slice(0, 5); // limit columns

                    if (keys.length > 0) {
                        lines.push('');
                        lines.push('| ' + keys.join(' | ') + ' |');
                        lines.push('| ' + keys.map(() => '---').join(' | ') + ' |');
                        for (const row of data.preview) {
                            const cells = keys.map((k) => {
                                const v = String(row[k] ?? '');
                                return v.length > 20 ? v.substring(0, 20) + '...' : v;
                            });
                            lines.push('| ' + cells.join(' | ') + ' |');
                        }
                    }
                }

                return {
                    range: new monaco.Range(position.lineNumber, 1, position.lineNumber, lineContent.length + 1),
                    contents: [{ value: lines.join('\n') }],
                };
            } catch {
                return null;
            }
        },
    });
}

let lspProvidersRegistered = false;

export function registerVeroLSPProviders(monaco: Monaco, options?: { apiBase?: string; getProjectId?: () => string | null }): void {
    if (lspProvidersRegistered) return;
    lspProvidersRegistered = true;

    monaco.languages.registerDocumentSymbolProvider('vero', {
        provideDocumentSymbols: (model: MonacoEditor.editor.ITextModel) => provideDocumentSymbols(model.getValue()),
    });

    monaco.languages.registerHoverProvider('vero', {
        provideHover: (model: MonacoEditor.editor.ITextModel, position: MonacoEditor.Position) => {
            const wordAtPosition = model.getWordAtPosition(position);
            if (!wordAtPosition) return null;

            const ctx: HoverContext = {
                code: model.getValue(),
                lineNumber: position.lineNumber,
                column: position.column,
                wordAtPosition: wordAtPosition.word,
                lineContent: model.getLineContent(position.lineNumber),
                registeredPages: parseVeroPages(model.getValue()),
            };

            const result = provideHover(ctx);
            if (!result) return null;

            return {
                contents: result.contents.map((c: { value: string }) => ({ value: c.value })),
                range: result.range,
            };
        },
    });

    monaco.languages.registerFoldingRangeProvider('vero', {
        provideFoldingRanges: (model: MonacoEditor.editor.ITextModel) => provideFoldingRanges(model.getValue()),
    });

    monaco.languages.registerDefinitionProvider('vero', {
        provideDefinition: async (model: MonacoEditor.editor.ITextModel, position: MonacoEditor.Position) => {
            const wordAtPosition = model.getWordAtPosition(position);
            if (!wordAtPosition) return null;

            const lineContent = model.getLineContent(position.lineNumber);

            const ctx: DefinitionContext = {
                code: model.getValue(),
                filePath: model.uri.toString(),
                lineNumber: position.lineNumber,
                column: position.column,
                wordAtPosition: wordAtPosition.word,
                lineContent,
                registeredPages: parseVeroPages(model.getValue()),
            };

            // 1. Try local (same-file) definition lookup first — instant
            const localResult = provideDefinition(ctx);
            if (localResult.locations.length > 0) {
                return localResult.locations.map((loc: { uri: string; range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } }) => ({
                    uri: monaco.Uri.parse(loc.uri),
                    range: new monaco.Range(loc.range.startLineNumber, loc.range.startColumn, loc.range.endLineNumber, loc.range.endColumn),
                }));
            }

            // 2. Fall back to backend API for cross-file lookup
            const projectId = options?.getProjectId?.();
            if (!projectId) return null;

            try {
                // Build the "word" the backend expects:
                // - For "PageName.fieldName" references, send "PageName.fieldName"
                // - For page names in USE statements, send just the page name
                const word = wordAtPosition.word;
                let lookupWord = word;

                // Check if this word is part of a Page.member reference
                const memberMatch = lineContent.match(new RegExp(`(\\w+)\\.${word}\\b`));
                if (memberMatch) {
                    lookupWord = `${memberMatch[1]}.${word}`;
                }

                const apiBase = options?.apiBase || '';
                const response = await fetch(
                    `${apiBase}/api/vero/definition?projectId=${encodeURIComponent(projectId)}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            filePath: model.uri.toString(),
                            line: position.lineNumber,
                            column: position.column,
                            word: lookupWord,
                        }),
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.location) {
                        const loc = data.location;
                        return [{
                            uri: monaco.Uri.parse(`file://${loc.filePath}`),
                            range: new monaco.Range(
                                loc.line,
                                loc.column || 1,
                                loc.endLine || loc.line,
                                loc.endColumn || 100,
                            ),
                        }];
                    }
                }
            } catch (err) {
                console.warn('[Vero] Cross-file definition lookup failed:', err);
            }

            return null;
        },
    });

    monaco.languages.registerReferenceProvider('vero', {
        provideReferences: (model: MonacoEditor.editor.ITextModel, position: MonacoEditor.Position, context: MonacoEditor.languages.ReferenceContext) => {
            const wordAtPosition = model.getWordAtPosition(position);
            if (!wordAtPosition) return [];

            const ctx: ReferencesContext = {
                code: model.getValue(),
                filePath: model.uri.toString(),
                lineNumber: position.lineNumber,
                column: position.column,
                wordAtPosition: wordAtPosition.word,
                lineContent: model.getLineContent(position.lineNumber),
                includeDeclaration: context.includeDeclaration,
                registeredPages: parseVeroPages(model.getValue()),
            };

            return provideReferences(ctx).map((ref: { uri: string; range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } }) => ({
                uri: monaco.Uri.parse(ref.uri),
                range: new monaco.Range(ref.range.startLineNumber, ref.range.startColumn, ref.range.endLineNumber, ref.range.endColumn),
            }));
        },
    });

    // Rename Provider (F2) - Rename symbol across file
    monaco.languages.registerRenameProvider('vero', {
        provideRenameEdits: (
            model: MonacoEditor.editor.ITextModel,
            position: MonacoEditor.Position,
            newName: string
        ): MonacoEditor.languages.ProviderResult<MonacoEditor.languages.WorkspaceEdit> => {
            const wordAtPosition = model.getWordAtPosition(position);
            if (!wordAtPosition) return null;

            const oldName = wordAtPosition.word;

            // Find all references (including declaration)
            const ctx: ReferencesContext = {
                code: model.getValue(),
                filePath: model.uri.toString(),
                lineNumber: position.lineNumber,
                column: position.column,
                wordAtPosition: oldName,
                lineContent: model.getLineContent(position.lineNumber),
                includeDeclaration: true,
                registeredPages: parseVeroPages(model.getValue()),
            };

            const references = provideReferences(ctx);

            if (references.length === 0) {
                return null;
            }

            // Group edits by file URI
            const editsByUri = new Map<string, MonacoEditor.languages.IWorkspaceTextEdit[]>();

            for (const ref of references) {
                const uri = ref.uri;
                if (!editsByUri.has(uri)) {
                    editsByUri.set(uri, []);
                }

                editsByUri.get(uri)!.push({
                    resource: monaco.Uri.parse(uri),
                    versionId: undefined,
                    textEdit: {
                        range: new monaco.Range(
                            ref.range.startLineNumber,
                            ref.range.startColumn,
                            ref.range.endLineNumber,
                            ref.range.endColumn
                        ),
                        text: newName,
                    },
                });
            }

            // Convert to WorkspaceEdit format
            const edits: (MonacoEditor.languages.IWorkspaceTextEdit | MonacoEditor.languages.IWorkspaceFileEdit)[] = [];
            for (const [_uri, fileEdits] of editsByUri) {
                edits.push(...fileEdits);
            }

            return { edits };
        },

        resolveRenameLocation: (
            model: MonacoEditor.editor.ITextModel,
            position: MonacoEditor.Position
        ): MonacoEditor.languages.ProviderResult<MonacoEditor.languages.RenameLocation & MonacoEditor.languages.Rejection> => {
            const wordAtPosition = model.getWordAtPosition(position);
            if (!wordAtPosition) {
                return {
                    rejectReason: 'No symbol at cursor position',
                    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                    text: '',
                };
            }

            // Check if this is a renameable symbol (field name, page name, scenario name)
            const lineContent = model.getLineContent(position.lineNumber);
            const word = wordAtPosition.word;

            // Check patterns for renameable symbols
            const isFieldDefinition = lineContent.match(new RegExp(`\\b${word}\\s*=\\s*`));
            const isFieldReference = lineContent.match(new RegExp(`\\.(${word})\\b`));
            const isPageName = lineContent.match(new RegExp(`(page|use)\\s+"${word}"`));
            const isScenarioName = lineContent.match(new RegExp(`scenario\\s+"${word}"`));
            const isFeatureName = lineContent.match(new RegExp(`feature\\s+"${word}"`));

            if (isFieldDefinition || isFieldReference || isPageName || isScenarioName || isFeatureName) {
                return {
                    range: new monaco.Range(
                        position.lineNumber,
                        wordAtPosition.startColumn,
                        position.lineNumber,
                        wordAtPosition.endColumn
                    ),
                    text: word,
                };
            }

            return {
                rejectReason: 'Cannot rename this symbol',
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                text: '',
            };
        },
    });

    // Code Action Provider (Quick Fixes) - Shows lightbulb with fixes for errors
    monaco.languages.registerCodeActionProvider('vero', {
        provideCodeActions: (
            model: MonacoEditor.editor.ITextModel,
            _range: MonacoEditor.Range,
            context: MonacoEditor.languages.CodeActionContext,
            _token: MonacoEditor.CancellationToken
        ): MonacoEditor.languages.ProviderResult<MonacoEditor.languages.CodeActionList> => {
            const markers = context.markers;
            if (!markers || markers.length === 0) {
                return { actions: [], dispose: () => {} };
            }

            const actions: MonacoEditor.languages.CodeAction[] = [];

            // Get quick fixes for each marker (error/warning) in the selection
            for (const marker of markers) {
                const ctx: CodeActionContext = {
                    markers: [{
                        startLineNumber: marker.startLineNumber,
                        startColumn: marker.startColumn,
                        endLineNumber: marker.endLineNumber,
                        endColumn: marker.endColumn,
                        message: marker.message,
                        severity: marker.severity,
                        code: marker.code?.toString(),
                    }],
                    filePath: model.uri.toString(),
                    lineContent: model.getLineContent(marker.startLineNumber),
                    definedPages: parseVeroPages(model.getValue()).map(p => p.name),
                };

                const fixes = provideQuickFixes(ctx.markers[0], ctx);

                for (const fix of fixes) {
                    // Convert vero-lang CodeAction to Monaco CodeAction
                    const monacoAction: MonacoEditor.languages.CodeAction = {
                        title: fix.title,
                        kind: fix.kind,
                        diagnostics: [marker],
                        isPreferred: fix.isPreferred,
                    };

                    // Convert WorkspaceEdit to Monaco WorkspaceEdit
                    if (fix.edit) {
                        const edits: MonacoEditor.languages.IWorkspaceTextEdit[] = [];
                        for (const resourceEdit of fix.edit.edits) {
                            for (const textEdit of resourceEdit.edits) {
                                edits.push({
                                    resource: model.uri,
                                    versionId: undefined,
                                    textEdit: {
                                        range: new monaco.Range(
                                            textEdit.range.startLineNumber,
                                            textEdit.range.startColumn,
                                            textEdit.range.endLineNumber,
                                            textEdit.range.endColumn
                                        ),
                                        text: textEdit.text,
                                    },
                                });
                            }
                        }
                        monacoAction.edit = { edits };
                    }

                    actions.push(monacoAction);
                }
            }

            return {
                actions,
                dispose: () => {},
            };
        },
    });

    // VDQL Hover Preview (match count + sample rows)
    registerVDQLHoverPreviewProvider(monaco, options);

    // Document Formatting Provider (Ctrl+Shift+F or right-click -> Format Document)
    monaco.languages.registerDocumentFormattingEditProvider('vero', {
        provideDocumentFormattingEdits: (
            model: MonacoEditor.editor.ITextModel,
            options: MonacoEditor.languages.FormattingOptions,
            _token: MonacoEditor.CancellationToken
        ): MonacoEditor.languages.TextEdit[] => {
            const source = model.getValue();
            const formatOptions: FormattingOptions = {
                tabSize: options.tabSize,
                insertSpaces: options.insertSpaces,
            };

            const edits = formatDocument(source, formatOptions);

            return edits.map((edit: FormattingTextEdit) => ({
                range: new monaco.Range(
                    edit.range.startLineNumber,
                    edit.range.startColumn,
                    edit.range.endLineNumber,
                    edit.range.endColumn
                ),
                text: edit.text,
            }));
        },
    });
}

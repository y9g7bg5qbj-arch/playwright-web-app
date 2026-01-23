import type { Monaco } from '@monaco-editor/react';
import type * as MonacoEditor from 'monaco-editor';
import {
    provideDocumentSymbols,
    provideHover,
    provideFoldingRanges,
    provideDefinition,
    provideReferences,
    parseVeroPages,
    type VeroPageDefinition,
    type HoverContext,
    type DefinitionContext,
    type ReferencesContext,
} from 'vero-lang';

// =============================================================================
// Token Categories
// =============================================================================

const TOKEN_CATEGORIES = {
    keywords: ['page', 'feature', 'scenario', 'field', 'use', 'before', 'after', 'all', 'each', 'if', 'else', 'repeat', 'times', 'with', 'and', 'from', 'to', 'in', 'returns', 'return', 'then', 'as', 'by'],
    selectors: ['button', 'textbox', 'link', 'testId', 'role', 'label', 'placeholder'],
    actions: ['click', 'fill', 'open', 'check', 'uncheck', 'select', 'hover', 'press', 'scroll', 'wait', 'perform', 'refresh', 'clear', 'take', 'screenshot', 'log'],
    assertions: ['verify', 'is', 'not', 'visible', 'hidden', 'enabled', 'disabled', 'checked', 'contains', 'empty'],
    types: ['text', 'number', 'flag', 'list', 'seconds', 'milliseconds'],
    vdqlKeywords: ['data', 'where', 'order', 'by', 'asc', 'desc', 'limit', 'offset', 'first', 'last', 'random', 'default'],
    vdqlOperators: ['or', 'starts', 'ends', 'matches', 'null'],
    vdqlFunctions: ['count', 'sum', 'average', 'min', 'max', 'distinct', 'rows', 'columns', 'headers'],
    utilityString: ['trim', 'convert', 'uppercase', 'lowercase', 'extract', 'replace', 'split', 'join', 'length', 'pad'],
    utilityDate: ['today', 'now', 'add', 'subtract', 'day', 'days', 'month', 'months', 'year', 'years', 'format'],
    utilityNumber: ['round', 'decimals', 'up', 'down', 'absolute', 'currency', 'percent'],
    utilityGenerate: ['generate', 'uuid'],
} as const;

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
    { token: 'variable.name', foreground: 'E0E0E0' },
    { token: 'identifier', foreground: 'E0E0E0' },
    { token: 'keyword.vdql', foreground: '03DAC5', fontStyle: 'bold' },
    { token: 'keyword.vdql.operator', foreground: '03DAC5' },
    { token: 'function.vdql', foreground: 'CF6679', fontStyle: 'bold' },
    { token: 'operator.vdql', foreground: 'FF7043' },
    { token: 'variable.vdql.table', foreground: 'FFAB40', fontStyle: 'bold' },
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
    { token: 'variable.name', foreground: '001080' },
    { token: 'identifier', foreground: '000000' },
    { token: 'keyword.vdql', foreground: '0097A7', fontStyle: 'bold' },
    { token: 'keyword.vdql.operator', foreground: '0097A7' },
    { token: 'function.vdql', foreground: 'C2185B', fontStyle: 'bold' },
    { token: 'operator.vdql', foreground: 'E65100' },
    { token: 'variable.vdql.table', foreground: 'FF6F00', fontStyle: 'bold' },
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
        ...TOKEN_CATEGORIES,
        tokenizer: {
            root: [
                [/#.*$/, 'comment'],
                [/@[a-zA-Z][a-zA-Z0-9]*/, 'tag'],
                [/"([^"\\]|\\.)*"/, 'string'],
                [/\b\d+(\.\d+)?\b/, 'number'],
                [/\b[A-Z][a-zA-Z0-9]*\.[a-zA-Z][a-zA-Z0-9]*\b/, 'variable.name'],
                [/\b(page|feature|scenario|field|use)\b/, 'keyword.structure'],
                [/\b(before|after|all|each)\b/, 'keyword.hook'],
                [/\b(if|else|repeat|times)\b/, 'keyword.control'],
                [/\b(with|and|from|to|in|returns|return|then|as|by)\b/, 'keyword.operator'],
                [/\b(button|textbox|link|testId|role|label|placeholder)\b/, 'type.selector'],
                [/\b(click|fill|open|check|uncheck|select|hover|press|scroll|wait|do|refresh|clear|take|screenshot|log)\b/, 'function.action'],
                [/\b(verify)\b/, 'keyword.assertion'],
                [/\b(is|not|visible|hidden|enabled|disabled|checked|contains|empty)\b/, 'constant.condition'],
                [/\b(text|number|flag|list|seconds|milliseconds)\b/, 'type'],
                [/\b(data|where|order|by|asc|desc|limit|offset|first|last|random|default)\b/, 'keyword.vdql'],
                [/\b(or|starts|ends|matches|null)\b/, 'keyword.vdql.operator'],
                [/\b(count|sum|average|min|max|distinct|rows|columns|headers)\b/, 'function.vdql'],
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

        const scenarioMatch = line.match(/^\s*(?:SCENARIO|scenario)\s+"([^"]+)"/);
        if (scenarioMatch) {
            items.push({ type: 'scenario', name: scenarioMatch[1], line: i + 1 });
        }
    }
    return items;
}

export { parseVeroPages };
export type { VeroPageDefinition };

// =============================================================================
// Page Registry
// =============================================================================

const globalPageRegistry = new Map<string, VeroPageDefinition>();

export function updatePageRegistry(fileContent: string, _filePath?: string): VeroPageDefinition[] {
    const pages = parseVeroPages(fileContent);
    pages.forEach((page: VeroPageDefinition) => globalPageRegistry.set(page.name, page));
    return pages;
}

export function getRegisteredPages(): VeroPageDefinition[] {
    return Array.from(globalPageRegistry.values());
}

export function clearPageRegistry(): void {
    globalPageRegistry.clear();
}

// =============================================================================
// Test Data Registry
// =============================================================================

export interface TestDataSheetDefinition {
    name: string;
    columns: { name: string; type: string }[];
}

const testDataRegistry = new Map<string, TestDataSheetDefinition>();

export function updateTestDataRegistry(sheets: TestDataSheetDefinition[]): void {
    testDataRegistry.clear();
    sheets.forEach(sheet => testDataRegistry.set(sheet.name, sheet));
}

export function getRegisteredTestDataSheets(): TestDataSheetDefinition[] {
    return Array.from(testDataRegistry.values());
}

export function getTestDataSheet(name: string): TestDataSheetDefinition | undefined {
    return testDataRegistry.get(name);
}

export function clearTestDataRegistry(): void {
    testDataRegistry.clear();
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

// =============================================================================
// Completion Providers
// =============================================================================

export function registerVeroCompletionProvider(monaco: Monaco): void {
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

            // Start of line - data declaration keywords
            if (textBeforeCursor === '' || textBeforeCursor.match(/^\s*$/)) {
                suggestions.push(
                    createSnippet(monaco, 'data', 'data ${1:varName} = TestData.${2:TableName}', 'VDQL: Declare data variable'),
                    createSnippet(monaco, 'list', 'list ${1:varName} = TestData.${2:TableName}.${3:column}', 'VDQL: Declare list variable'),
                    createSnippet(monaco, 'number', 'number ${1:varName} = count TestData.${2:TableName}', 'VDQL: Declare number variable')
                );
            }

            // After TestData.TableName - query modifiers
            if (textBeforeCursor.match(/TestData\.\w+\s*$/)) {
                suggestions.push(
                    createSnippet(monaco, 'where', 'where ${1:column} ${2|==,!=,>,<,>=,<=,contains,starts with,ends with|} ${3:value}', 'Filter rows'),
                    createSnippet(monaco, 'order by', 'order by ${1:column} ${2|asc,desc|}', 'Sort results'),
                    createSnippet(monaco, 'limit', 'limit ${1:10}', 'Limit results')
                );
            }

            // After WHERE - column names
            if (textBeforeCursor.match(/where\s+$/i)) {
                getRegisteredTestDataSheets().forEach(sheet => {
                    sheet.columns.forEach(col => suggestions.push({
                        label: col.name,
                        kind: monaco.languages.CompletionItemKind.Field,
                        insertText: col.name,
                        detail: `Column (${col.type})`,
                    }));
                });
            }

            // After WHERE <column> - comparison operators
            if (textBeforeCursor.match(/where\s+\w+\s*$/i)) {
                const operators = ['==', '!=', '>', '<', '>=', '<=', 'contains', 'starts with', 'ends with', 'matches', 'is empty', 'is not empty', 'in'];
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
                const functions = ['count', 'sum', 'average', 'min', 'max', 'rows in', 'columns in'];
                functions.forEach(fn => {
                    suggestions.push({
                        label: fn,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: fn + ' TestData.',
                    });
                });
            }

            // After AND/OR - column names for additional conditions
            if (textBeforeCursor.match(/\b(and|or)\s*$/i)) {
                getRegisteredTestDataSheets().forEach(sheet => {
                    sheet.columns.forEach(col => suggestions.push({
                        label: col.name,
                        kind: monaco.languages.CompletionItemKind.Field,
                        insertText: col.name,
                        detail: `Column (${col.type})`,
                    }));
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

// =============================================================================
// LSP Providers
// =============================================================================

export function registerVeroLSPProviders(monaco: Monaco): void {
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
        provideDefinition: (model: MonacoEditor.editor.ITextModel, position: MonacoEditor.Position) => {
            const wordAtPosition = model.getWordAtPosition(position);
            if (!wordAtPosition) return null;

            const ctx: DefinitionContext = {
                code: model.getValue(),
                filePath: model.uri.toString(),
                lineNumber: position.lineNumber,
                column: position.column,
                wordAtPosition: wordAtPosition.word,
                lineContent: model.getLineContent(position.lineNumber),
                registeredPages: parseVeroPages(model.getValue()),
            };

            const result = provideDefinition(ctx);
            if (!result.locations.length) return null;

            return result.locations.map((loc: { uri: string; range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } }) => ({
                uri: monaco.Uri.parse(loc.uri),
                range: new monaco.Range(loc.range.startLineNumber, loc.range.startColumn, loc.range.endLineNumber, loc.range.endColumn),
            }));
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
}

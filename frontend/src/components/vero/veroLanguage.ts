import { Monaco } from '@monaco-editor/react';

/**
 * Register Vero DSL language with Monaco Editor
 */
export function registerVeroLanguage(monaco: Monaco) {
    // Register the language
    monaco.languages.register({ id: 'vero' });

    // Set language configuration (brackets, comments, etc.)
    monaco.languages.setLanguageConfiguration('vero', {
        comments: {
            lineComment: '#',
        },
        brackets: [
            ['{', '}'],
            ['(', ')'],
        ],
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

    // Define token provider (syntax highlighting)
    monaco.languages.setMonarchTokensProvider('vero', {
        ignoreCase: true,  // Enable case-insensitive matching

        keywords: [
            'page', 'feature', 'scenario', 'field', 'use',
            'before', 'after', 'all', 'each',
            'if', 'else', 'repeat', 'times',
            'with', 'and', 'from', 'to', 'in', 'returns', 'return'
        ],

        selectors: [
            'button', 'textbox', 'link', 'testId', 'role', 'label', 'placeholder'
        ],

        actions: [
            'click', 'fill', 'open', 'check', 'uncheck', 'select', 'hover',
            'press', 'scroll', 'wait', 'do', 'refresh', 'clear', 'take',
            'screenshot', 'log'
        ],

        assertions: [
            'verify', 'is', 'not', 'visible', 'hidden', 'enabled', 'disabled',
            'checked', 'contains', 'empty'
        ],

        types: [
            'text', 'number', 'flag', 'list', 'seconds', 'milliseconds'
        ],

        // VDQL (Data Query Language) keywords
        vdqlKeywords: [
            'data', 'where', 'order', 'by', 'asc', 'desc',
            'limit', 'offset', 'first', 'last', 'random', 'default'
        ],

        vdqlOperators: [
            'or', 'starts', 'ends', 'matches', 'null'
        ],

        vdqlFunctions: [
            'count', 'sum', 'average', 'min', 'max', 'distinct',
            'rows', 'columns', 'headers'
        ],

        tokenizer: {
            root: [
                // Comments
                [/#.*$/, 'comment'],

                // Tags
                [/@[a-zA-Z][a-zA-Z0-9]*/, 'tag'],

                // Strings
                [/"([^"\\]|\\.)*"/, 'string'],

                // Numbers
                [/\b\d+(\.\d+)?\b/, 'number'],

                // Page.method references
                [/\b[A-Z][a-zA-Z0-9]*\.[a-zA-Z][a-zA-Z0-9]*\b/, 'variable.name'],

                // Keywords
                [/\b(page|feature|scenario|field|use)\b/, 'keyword.structure'],
                [/\b(before|after|all|each)\b/, 'keyword.hook'],
                [/\b(if|else|repeat|times)\b/, 'keyword.control'],
                [/\b(with|and|from|to|in|returns|return)\b/, 'keyword.operator'],

                // Selectors
                [/\b(button|textbox|link|testId|role|label|placeholder)\b/, 'type.selector'],

                // Actions
                [/\b(click|fill|open|check|uncheck|select|hover|press|scroll|wait|do|refresh|clear|take|screenshot|log)\b/, 'function.action'],

                // Assertions
                [/\b(verify)\b/, 'keyword.assertion'],
                [/\b(is|not|visible|hidden|enabled|disabled|checked|contains|empty)\b/, 'constant.condition'],

                // Types
                [/\b(text|number|flag|list|seconds|milliseconds)\b/, 'type'],

                // VDQL keywords
                [/\b(data|where|order|by|asc|desc|limit|offset|first|last|random|default)\b/, 'keyword.vdql'],

                // VDQL logical/text operators
                [/\b(or|starts|ends|matches|null)\b/, 'keyword.vdql.operator'],

                // VDQL aggregation functions
                [/\b(count|sum|average|min|max|distinct|rows|columns|headers)\b/, 'function.vdql'],

                // VDQL comparison operators
                [/==|!=|>=|<=|>|</, 'operator.vdql'],

                // VDQL table reference: TestData.TableName
                [/\bTestData\.[A-Z][a-zA-Z0-9]*/, 'variable.vdql.table'],

                // Identifiers
                [/\b[A-Z][a-zA-Z0-9]*\b/, 'type.identifier'],
                [/\b[a-z][a-zA-Z0-9]*\b/, 'identifier'],
            ],
        },
    });

    // Define custom theme for Vero - Modern vibrant colors
    monaco.editor.defineTheme('vero-camel', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
            { token: 'tag', foreground: '00FF41', fontStyle: 'bold' },
            { token: 'string', foreground: 'A5D6A7' },  // Pale green for strings
            { token: 'number', foreground: '00FF41', fontStyle: 'bold' },
            { token: 'keyword.structure', foreground: 'BB86FC', fontStyle: 'bold' },  // PAGE, FEATURE, SCENARIO
            { token: 'keyword.hook', foreground: 'BB86FC', fontStyle: 'bold' },  // BEFORE, AFTER
            { token: 'keyword.control', foreground: '00FF41', fontStyle: 'bold' },  // IF, ELSE
            { token: 'keyword.operator', foreground: '00FF41', fontStyle: 'bold' },  // WITH, AND
            { token: 'type.selector', foreground: '00FF41', fontStyle: 'bold' },  // BUTTON, TEXTBOX
            { token: 'function.action', foreground: '00FF41', fontStyle: 'bold' },  // CLICK, FILL
            { token: 'keyword.assertion', foreground: '00FF41', fontStyle: 'bold' },  // VERIFY
            { token: 'constant.condition', foreground: '00FF41', fontStyle: 'bold' },  // IS, NOT
            { token: 'type', foreground: '00FF41', fontStyle: 'bold' },  // TEXT, NUMBER
            { token: 'type.identifier', foreground: 'E0E0E0' },  // White/Grey for PageNames
            { token: 'variable.name', foreground: 'E0E0E0' },  // White/Grey for Page.method
            { token: 'identifier', foreground: 'E0E0E0' },  // White/Grey for others
            // VDQL tokens
            { token: 'keyword.vdql', foreground: '03DAC5', fontStyle: 'bold' },  // Teal for VDQL keywords
            { token: 'keyword.vdql.operator', foreground: '03DAC5' },  // Teal for VDQL operators
            { token: 'function.vdql', foreground: 'CF6679', fontStyle: 'bold' },  // Pink for VDQL functions
            { token: 'operator.vdql', foreground: 'FF7043' },  // Orange for comparison operators
            { token: 'variable.vdql.table', foreground: 'FFAB40', fontStyle: 'bold' },  // Amber for TestData tables
        ],
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
        rules: [
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
            // VDQL tokens
            { token: 'keyword.vdql', foreground: '0097A7', fontStyle: 'bold' },  // Cyan for VDQL keywords
            { token: 'keyword.vdql.operator', foreground: '0097A7' },  // Cyan for VDQL operators
            { token: 'function.vdql', foreground: 'C2185B', fontStyle: 'bold' },  // Pink for VDQL functions
            { token: 'operator.vdql', foreground: 'E65100' },  // Orange for comparison operators
            { token: 'variable.vdql.table', foreground: 'FF6F00', fontStyle: 'bold' },  // Amber for TestData tables
        ],
        colors: {
            'editor.background': '#FFFFFF',
        },
    });
}

/**
 * Parse Vero code to find scenarios and features for CodeLens
 */
export interface VeroCodeItem {
    type: 'feature' | 'scenario';
    name: string;
    line: number;
}

export function parseVeroCode(code: string): VeroCodeItem[] {
    const items: VeroCodeItem[] = [];
    const lines = code.split('\n');

    const featureRegex = /^\s*(?:FEATURE|feature)\s+(\w+)\s*\{/;
    const scenarioRegex = /^\s*(?:SCENARIO|scenario)\s+"([^"]+)"/;

    lines.forEach((line, index) => {
        const featureMatch = line.match(featureRegex);
        if (featureMatch) {
            items.push({
                type: 'feature',
                name: featureMatch[1],
                line: index + 1,
            });
        }

        const scenarioMatch = line.match(scenarioRegex);
        if (scenarioMatch) {
            items.push({
                type: 'scenario',
                name: scenarioMatch[1],
                line: index + 1,
            });
        }
    });

    return items;
}

/**
 * Parse Vero code to extract page definitions with their fields and actions
 */
export interface VeroPageDefinition {
    name: string;
    fields: string[];
    actions: string[];
}

export function parseVeroPages(code: string): VeroPageDefinition[] {
    const pages: VeroPageDefinition[] = [];

    // Match page blocks: page PageName { ... }
    const pageRegex = /\bpage\s+(\w+)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gi;

    let match;
    while ((match = pageRegex.exec(code)) !== null) {
        const pageName = match[1];
        const pageBody = match[2];

        const fields: string[] = [];
        const actions: string[] = [];

        // Extract fields: field name = "selector"
        const fieldRegex = /\bfield\s+(\w+)\s*=/gi;
        let fieldMatch;
        while ((fieldMatch = fieldRegex.exec(pageBody)) !== null) {
            fields.push(fieldMatch[1]);
        }

        // Extract actions: actionName with params { ... } or actionName { ... }
        // Actions are identifiers followed by optional "with" params and a block
        const actionRegex = /^[ \t]*(\w+)(?:\s+with\s+[\w,\s]+)?\s*\{/gim;
        let actionMatch;
        while ((actionMatch = actionRegex.exec(pageBody)) !== null) {
            const actionName = actionMatch[1].toLowerCase();
            // Skip keywords that aren't actions
            if (!['field', 'text', 'number', 'flag', 'list'].includes(actionName)) {
                actions.push(actionMatch[1]);
            }
        }

        pages.push({ name: pageName, fields, actions });
    }

    return pages;
}

/**
 * Global registry of all page definitions across all loaded files.
 * This allows autocomplete to work across files.
 */
const globalPageRegistry: Map<string, VeroPageDefinition> = new Map();

/**
 * Update the global page registry with pages from a file.
 * Call this whenever a file is loaded or changed.
 */
export function updatePageRegistry(fileContent: string, filePath?: string) {
    const pages = parseVeroPages(fileContent);

    // Add or update pages in the registry
    pages.forEach(page => {
        globalPageRegistry.set(page.name, page);
    });

    return pages;
}

/**
 * Get all registered pages for autocomplete
 */
export function getRegisteredPages(): VeroPageDefinition[] {
    return Array.from(globalPageRegistry.values());
}

/**
 * Clear the page registry (useful when switching projects)
 */
export function clearPageRegistry() {
    globalPageRegistry.clear();
}

// ============================================
// TEST DATA REGISTRY FOR AUTOCOMPLETE
// ============================================

/**
 * Test data sheet definition for autocomplete
 */
export interface TestDataSheetDefinition {
    name: string;
    columns: { name: string; type: string }[];
}

/**
 * Global registry of test data sheets for autocomplete
 */
const testDataRegistry: Map<string, TestDataSheetDefinition> = new Map();

/**
 * Update the test data registry with sheets from the API
 * Call this when the project loads or test data changes
 */
export function updateTestDataRegistry(sheets: TestDataSheetDefinition[]) {
    testDataRegistry.clear();
    sheets.forEach(sheet => {
        testDataRegistry.set(sheet.name, sheet);
    });
}

/**
 * Get all registered test data sheets for autocomplete
 */
export function getRegisteredTestDataSheets(): TestDataSheetDefinition[] {
    return Array.from(testDataRegistry.values());
}

/**
 * Get a specific test data sheet by name
 */
export function getTestDataSheet(name: string): TestDataSheetDefinition | undefined {
    return testDataRegistry.get(name);
}

/**
 * Clear the test data registry (useful when switching projects)
 */
export function clearTestDataRegistry() {
    testDataRegistry.clear();
}

/**
 * Convert sheet name to PascalCase (matching DTO generator)
 */
function toPascalCase(str: string): string {
    return str
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

/**
 * Register completion provider for Vero page member suggestions and TestData
 */
export function registerVeroCompletionProvider(monaco: Monaco) {
    monaco.languages.registerCompletionItemProvider('vero', {
        triggerCharacters: ['.'],

        provideCompletionItems: (model: any, position: any) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1);

            // ========================================
            // CASE 1: TestData. - suggest sheet names
            // ========================================
            if (textBeforeCursor.match(/\bTestData\.$/)) {
                const sheets = getRegisteredTestDataSheets();
                const suggestions: any[] = [];

                sheets.forEach(sheet => {
                    const className = toPascalCase(sheet.name);
                    suggestions.push({
                        label: className,
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: className,
                        detail: `Test data sheet (${sheet.columns.length} columns)`,
                        documentation: `Test data sheet "${sheet.name}" with columns: ${sheet.columns.map(c => c.name).join(', ')}`,
                    });
                });

                return { suggestions };
            }

            // ========================================
            // CASE 2: TestData.SheetName. - suggest columns and methods
            // ========================================
            const testDataSheetMatch = textBeforeCursor.match(/\bTestData\.(\w+)\.$/);
            if (testDataSheetMatch) {
                const sheetClassName = testDataSheetMatch[1];
                const sheets = getRegisteredTestDataSheets();

                // Find sheet by PascalCase name
                const sheet = sheets.find(s => toPascalCase(s.name) === sheetClassName);

                if (sheet) {
                    const suggestions: any[] = [];

                    // Add static methods
                    suggestions.push({
                        label: 'fromScenarioId',
                        kind: monaco.languages.CompletionItemKind.Method,
                        insertText: "fromScenarioId('TC001')",
                        detail: 'Get data by scenario ID',
                        documentation: `Get test data for a specific scenario ID (e.g., 'TC001')`,
                    });

                    suggestions.push({
                        label: 'getAll',
                        kind: monaco.languages.CompletionItemKind.Method,
                        insertText: 'getAll()',
                        detail: 'Get all test data rows',
                        documentation: 'Returns an array of all enabled test data rows',
                    });

                    suggestions.push({
                        label: 'count',
                        kind: monaco.languages.CompletionItemKind.Property,
                        insertText: 'count',
                        detail: 'Number of rows',
                        documentation: 'Get count of enabled test data rows',
                    });

                    suggestions.push({
                        label: 'getTestIds',
                        kind: monaco.languages.CompletionItemKind.Method,
                        insertText: 'getTestIds()',
                        detail: 'Get all test IDs',
                        documentation: 'Get array of test IDs for data-driven testing',
                    });

                    return { suggestions };
                }
            }

            // ========================================
            // CASE 3: PageName. - suggest page fields and actions
            // ========================================
            const pageRefMatch = textBeforeCursor.match(/\b([A-Z]\w*)\.$/);

            if (!pageRefMatch) {
                return { suggestions: [] };
            }

            const pageName = pageRefMatch[1];

            // Skip if it's TestData (handled above)
            if (pageName === 'TestData') {
                return { suggestions: [] };
            }

            // First check global registry (for cross-file pages)
            let page = getRegisteredPages().find(p => p.name === pageName);

            // Also parse current file (for pages defined in this file)
            if (!page) {
                const fullText = model.getValue();
                const localPages = parseVeroPages(fullText);
                page = localPages.find(p => p.name === pageName);
            }

            if (!page) {
                return { suggestions: [] };
            }

            const suggestions: any[] = [];

            // Add field suggestions
            page.fields.forEach(field => {
                suggestions.push({
                    label: field,
                    kind: monaco.languages.CompletionItemKind.Field,
                    insertText: field,
                    detail: `field in ${pageName}`,
                    documentation: `Field locator defined in ${pageName}`,
                });
            });

            // Add action suggestions
            page.actions.forEach(action => {
                suggestions.push({
                    label: action,
                    kind: monaco.languages.CompletionItemKind.Method,
                    insertText: action,
                    detail: `action in ${pageName}`,
                    documentation: `Action method defined in ${pageName}`,
                });
            });

            return { suggestions };
        },
    });

    // ========================================
    // Register additional completion for column access after fromScenarioId()
    // e.g., TestData.LoginPage.fromScenarioId('TC001').email
    // ========================================
    monaco.languages.registerCompletionItemProvider('vero', {
        triggerCharacters: [')'],

        provideCompletionItems: (model: any, position: any) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1);

            // Match: TestData.SheetName.fromScenarioId('...')
            const fromScenarioMatch = textBeforeCursor.match(/\bTestData\.(\w+)\.fromScenarioId\([^)]*\)\.?$/);

            if (fromScenarioMatch) {
                const sheetClassName = fromScenarioMatch[1];
                const sheets = getRegisteredTestDataSheets();
                const sheet = sheets.find(s => toPascalCase(s.name) === sheetClassName);

                if (sheet) {
                    const suggestions: any[] = [];

                    // Add TestID property
                    suggestions.push({
                        label: 'TestID',
                        kind: monaco.languages.CompletionItemKind.Property,
                        insertText: 'TestID',
                        detail: 'string',
                        documentation: 'The scenario/test ID (e.g., TC001)',
                    });

                    // Add column properties
                    sheet.columns.forEach(col => {
                        suggestions.push({
                            label: col.name,
                            kind: monaco.languages.CompletionItemKind.Property,
                            insertText: col.name,
                            detail: col.type,
                            documentation: `Column "${col.name}" of type ${col.type}`,
                        });
                    });

                    return { suggestions };
                }
            }

            return { suggestions: [] };
        },
    });

    // ========================================
    // Register VDQL (Data Query) completions
    // ========================================
    registerVDQLCompletionProvider(monaco);
}

/**
 * Register VDQL-specific completion providers
 */
function registerVDQLCompletionProvider(monaco: Monaco) {
    // VDQL keyword completions
    monaco.languages.registerCompletionItemProvider('vero', {
        triggerCharacters: [' ', '\n'],

        provideCompletionItems: (model: any, position: any) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1).trim();
            const suggestions: any[] = [];

            // ========================================
            // CASE 1: Start of data query - suggest 'data', 'list', etc.
            // ========================================
            if (textBeforeCursor === '' || textBeforeCursor.match(/^\s*$/)) {
                // Suggest VDQL variable declarations
                suggestions.push({
                    label: 'data',
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: 'data ${1:varName} = TestData.${2:TableName}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'VDQL: Declare data variable',
                    documentation: 'Query test data into a variable\nExample: data admin = TestData.Users where role == "admin"',
                });

                suggestions.push({
                    label: 'list',
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: 'list ${1:varName} = TestData.${2:TableName}.${3:column}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'VDQL: Declare list variable',
                    documentation: 'Query column values into a list\nExample: list emails = TestData.Users.email',
                });

                suggestions.push({
                    label: 'number',
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: 'number ${1:varName} = count TestData.${2:TableName}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'VDQL: Declare number variable',
                    documentation: 'Query aggregated value into a number\nExample: number total = count TestData.Users',
                });
            }

            // ========================================
            // CASE 2: After TestData.TableName - suggest 'where', 'order by', columns
            // ========================================
            const afterTableMatch = textBeforeCursor.match(/TestData\.\w+\s*$/);
            if (afterTableMatch) {
                suggestions.push({
                    label: 'where',
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: 'where ${1:column} ${2|==,!=,>,<,>=,<=,contains,starts with,ends with|} ${3:value}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Filter rows',
                    documentation: 'Add a WHERE clause to filter data',
                });

                suggestions.push({
                    label: 'order by',
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: 'order by ${1:column} ${2|asc,desc|}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Sort results',
                    documentation: 'Sort results by a column',
                });

                suggestions.push({
                    label: 'limit',
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: 'limit ${1:10}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Limit results',
                    documentation: 'Limit the number of results returned',
                });
            }

            // ========================================
            // CASE 3: After 'where' - suggest column names and operators
            // ========================================
            const afterWhereMatch = textBeforeCursor.match(/where\s+$/i);
            if (afterWhereMatch) {
                // Get sheets and suggest their columns
                const sheets = getRegisteredTestDataSheets();
                sheets.forEach(sheet => {
                    sheet.columns.forEach(col => {
                        suggestions.push({
                            label: col.name,
                            kind: monaco.languages.CompletionItemKind.Field,
                            insertText: col.name,
                            detail: `Column (${col.type})`,
                            documentation: `Column "${col.name}" from ${sheet.name}`,
                        });
                    });
                });
            }

            // ========================================
            // CASE 4: After column name in where - suggest operators
            // ========================================
            const afterColumnMatch = textBeforeCursor.match(/where\s+\w+\s*$/i);
            if (afterColumnMatch) {
                const operators = [
                    { label: '==', detail: 'Equals' },
                    { label: '!=', detail: 'Not equals' },
                    { label: '>', detail: 'Greater than' },
                    { label: '<', detail: 'Less than' },
                    { label: '>=', detail: 'Greater than or equal' },
                    { label: '<=', detail: 'Less than or equal' },
                    { label: 'contains', detail: 'Text contains' },
                    { label: 'starts with', detail: 'Text starts with' },
                    { label: 'ends with', detail: 'Text ends with' },
                    { label: 'matches', detail: 'Regex match' },
                    { label: 'is empty', detail: 'Is empty or null' },
                    { label: 'is not empty', detail: 'Is not empty' },
                    { label: 'in', detail: 'Value in list' },
                ];

                operators.forEach(op => {
                    suggestions.push({
                        label: op.label,
                        kind: monaco.languages.CompletionItemKind.Operator,
                        insertText: op.label + ' ',
                        detail: op.detail,
                    });
                });
            }

            // ========================================
            // CASE 5: Aggregation functions after '='
            // ========================================
            const afterEqualsMatch = textBeforeCursor.match(/number\s+\w+\s*=\s*$/i);
            if (afterEqualsMatch) {
                const aggFunctions = [
                    { label: 'count', detail: 'Count rows', doc: 'Count total rows\nExample: count TestData.Users' },
                    { label: 'sum', detail: 'Sum values', doc: 'Sum column values\nExample: sum TestData.Orders.amount' },
                    { label: 'average', detail: 'Average values', doc: 'Calculate average\nExample: average TestData.Products.price' },
                    { label: 'min', detail: 'Minimum value', doc: 'Get minimum value\nExample: min TestData.Products.price' },
                    { label: 'max', detail: 'Maximum value', doc: 'Get maximum value\nExample: max TestData.Products.price' },
                    { label: 'rows in', detail: 'Row count', doc: 'Get row count\nExample: rows in TestData.Users' },
                    { label: 'columns in', detail: 'Column count', doc: 'Get column count\nExample: columns in TestData.Users' },
                ];

                aggFunctions.forEach(fn => {
                    suggestions.push({
                        label: fn.label,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: fn.label + ' TestData.',
                        detail: fn.detail,
                        documentation: fn.doc,
                    });
                });
            }

            // ========================================
            // CASE 6: After 'and' or 'or' in where clause
            // ========================================
            const afterLogicalMatch = textBeforeCursor.match(/\b(and|or)\s*$/i);
            if (afterLogicalMatch) {
                const sheets = getRegisteredTestDataSheets();
                sheets.forEach(sheet => {
                    sheet.columns.forEach(col => {
                        suggestions.push({
                            label: col.name,
                            kind: monaco.languages.CompletionItemKind.Field,
                            insertText: col.name,
                            detail: `Column (${col.type})`,
                        });
                    });
                });
            }

            // ========================================
            // CASE 7: After condition - suggest 'and', 'or', 'order by', 'limit'
            // ========================================
            const afterConditionMatch = textBeforeCursor.match(/["']\s*$/);
            if (afterConditionMatch && textBeforeCursor.includes('where')) {
                suggestions.push({
                    label: 'and',
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: 'and ',
                    detail: 'Add another condition',
                });

                suggestions.push({
                    label: 'or',
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: 'or ',
                    detail: 'Add alternative condition',
                });

                suggestions.push({
                    label: 'order by',
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: 'order by ',
                    detail: 'Sort results',
                });

                suggestions.push({
                    label: 'limit',
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: 'limit ',
                    detail: 'Limit results',
                });
            }

            return { suggestions };
        },
    });

    // ========================================
    // VDQL column completion after TestData.TableName.
    // ========================================
    monaco.languages.registerCompletionItemProvider('vero', {
        triggerCharacters: ['.'],

        provideCompletionItems: (model: any, position: any) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1);

            // Match TestData.TableName. for column suggestions
            const tableColumnMatch = textBeforeCursor.match(/\bTestData\.(\w+)\.$/);

            if (!tableColumnMatch) {
                return { suggestions: [] };
            }

            const sheetClassName = tableColumnMatch[1];
            const sheets = getRegisteredTestDataSheets();
            const sheet = sheets.find(s => toPascalCase(s.name) === sheetClassName);

            if (!sheet) {
                return { suggestions: [] };
            }

            const suggestions: any[] = [];

            // Add column suggestions for VDQL column access
            sheet.columns.forEach(col => {
                suggestions.push({
                    label: col.name,
                    kind: monaco.languages.CompletionItemKind.Field,
                    insertText: col.name,
                    detail: `Column (${col.type})`,
                    documentation: `Access column "${col.name}" values`,
                });
            });

            // Add indexed row access
            suggestions.push({
                label: '[index]',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: '[${1:0}]',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: 'Access row by index',
                documentation: 'Access a specific row by index\nExample: TestData.Users[0]',
            });

            return { suggestions };
        },
    });
}


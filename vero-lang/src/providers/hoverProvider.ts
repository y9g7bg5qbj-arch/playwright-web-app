import { parseVeroPages, VeroPageDefinition } from './symbolRegistry.js';

export interface HoverResult {
    contents: Array<{ value: string }>;
    range?: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
}

export interface HoverContext {
    code: string;
    lineNumber: number;
    column: number;
    wordAtPosition: string;
    lineContent: string;
    registeredPages?: VeroPageDefinition[];
}

export const KEYWORD_DOCS: Record<string, { syntax: string; description: string; example?: string }> = {
    page: { syntax: 'page PageName { ... }', description: 'Defines a Page Object containing fields and actions.', example: 'page LoginPage {\n  field username = "#username"\n}' },
    feature: { syntax: 'feature "Feature Name" { ... }', description: 'Groups related test scenarios together.' },
    scenario: { syntax: 'scenario "Scenario Name" { ... }', description: 'Defines a single test case.' },
    field: { syntax: 'FIELD fieldName = BUTTON "Submit"', description: 'Defines a locator for a UI element using a typed selector.', example: 'FIELD submitBtn = BUTTON "Submit"\nFIELD email = TEXTBOX "Email"\nFIELD nav = LINK "Home"\nFIELD cart = TESTID "cart-icon"\nFIELD search = PLACEHOLDER "Search..."\nFIELD legacy = "#css-selector"' },
    use: { syntax: 'use PageName', description: 'Imports a page object for use in the current feature.' },
    fixture: { syntax: 'fixture fixtureName { ... }', description: 'Defines reusable test data or setup.' },
    click: { syntax: 'click "element" | click Page.field', description: 'Clicks on an element.' },
    fill: { syntax: 'fill "field" with "value"', description: 'Enters text into an input field.' },
    open: { syntax: 'open "url"', description: 'Navigates to the specified URL.' },
    navigate: { syntax: 'navigate to "url"', description: 'Navigates to the specified URL.' },
    verify: { syntax: 'verify "element" is visible', description: 'Asserts a condition.' },
    wait: { syntax: 'wait N seconds', description: 'Pauses execution.' },
    hover: { syntax: 'hover "element"', description: 'Moves mouse over an element.' },
    press: { syntax: 'press "key"', description: 'Simulates pressing a keyboard key.' },
    check: { syntax: 'check "checkbox"', description: 'Checks a checkbox element.' },
    uncheck: { syntax: 'uncheck "checkbox"', description: 'Unchecks a checkbox element.' },
    select: { syntax: 'select "option" from "dropdown"', description: 'Selects an option from a dropdown.' },
    upload: { syntax: 'upload "filepath" to "element"', description: 'Uploads a file to a file input.' },
    do: { syntax: 'do Page.action', description: 'Calls a reusable action.' },
    refresh: { syntax: 'refresh', description: 'Refreshes the current page.' },
    log: { syntax: 'log "message"', description: 'Outputs a message to the test log.' },
    if: { syntax: 'if condition then ... else ... end', description: 'Conditional execution.' },
    'for each': { syntax: 'for each $item in collection ... end', description: 'Iterates over data.' },
    repeat: { syntax: 'repeat N times ... end', description: 'Repeats steps N times.' },
    load: { syntax: 'load $var from "table"', description: 'Loads data into a variable.' },
    before: { syntax: 'before each { ... }', description: 'Runs before each scenario.' },
    after: { syntax: 'after each { ... }', description: 'Runs after each scenario.' },
    data: { syntax: 'data $varName = TestData.TableName', description: 'VDQL: Declares a data variable.' },
    list: { syntax: 'list $varName = TestData.TableName.column', description: 'VDQL: Declares a list variable.' },
    number: { syntax: 'number $varName = aggregation TestData.TableName', description: 'VDQL: Declares a numeric variable.' },
};

function getKeywordHover(word: string): HoverResult | null {
    const doc = KEYWORD_DOCS[word.toLowerCase()];
    if (!doc) return null;

    const contents: Array<{ value: string }> = [
        { value: '```vero\n' + doc.syntax + '\n```' },
        { value: doc.description },
    ];
    if (doc.example) contents.push({ value: '**Example:**\n```vero\n' + doc.example + '\n```' });
    return { contents };
}

function getPageHover(pageName: string, pages: VeroPageDefinition[]): HoverResult | null {
    const page = pages.find(p => p.name === pageName);
    if (!page) return null;

    const contents: Array<{ value: string }> = [{ value: `**Page: ${page.name}**` }];
    const stats: string[] = [];
    if (page.fields.length > 0) stats.push(`${page.fields.length} field${page.fields.length !== 1 ? 's' : ''}`);
    if (page.actions.length > 0) stats.push(`${page.actions.length} action${page.actions.length !== 1 ? 's' : ''}`);
    if (stats.length > 0) contents.push({ value: stats.join(' | ') });

    return { contents };
}

function getPageMemberHover(pageName: string, memberName: string, pages: VeroPageDefinition[], code: string): HoverResult | null {
    const page = pages.find(p => p.name === pageName);
    if (!page) return null;

    if (page.fields.includes(memberName)) {
        const fieldMatch = code.match(new RegExp(`field\\s+${memberName}\\s*=\\s*"([^"]*)"`, 'i'));
        return {
            contents: [
                { value: `**Field: ${pageName}.${memberName}**` },
                { value: fieldMatch ? `\`\`\`css\n${fieldMatch[1]}\n\`\`\`` : 'Selector not found' },
            ],
        };
    }

    if (page.actions.includes(memberName)) {
        const actionMatch = code.match(new RegExp(`${memberName}\\s+with\\s+([\\w,\\s]+)\\s*\\{`, 'i'));
        return {
            contents: [
                { value: `**Action: ${pageName}.${memberName}**` },
                { value: actionMatch ? `Parameters: \`${actionMatch[1].trim()}\`` : 'No parameters' },
            ],
        };
    }

    return null;
}

function getVariableHover(varName: string, code: string): HoverResult | null {
    const loadMatch = code.match(new RegExp(`load\\s+\\$?${varName}\\s+from\\s+"([^"]*)"`, 'i'));
    if (loadMatch) {
        return { contents: [{ value: `**Variable: $${varName}**` }, { value: `Loaded from: \`${loadMatch[1]}\`` }] };
    }

    const vdqlMatch = code.match(new RegExp(`(data|list|number)\\s+\\$?${varName}\\s*=\\s*(.+)`, 'i'));
    if (vdqlMatch) {
        const varType = vdqlMatch[1].charAt(0).toUpperCase() + vdqlMatch[1].slice(1).toLowerCase();
        return { contents: [{ value: `**${varType} Variable: $${varName}**` }, { value: `\`\`\`vero\n${vdqlMatch[0]}\n\`\`\`` }] };
    }

    const forEachMatch = code.match(new RegExp(`for\\s+each\\s+\\$${varName}\\s+in\\s+(\\$?\\w+)`, 'i'));
    if (forEachMatch) {
        return { contents: [{ value: `**Loop Variable: $${varName}**` }, { value: `Iterating over: \`${forEachMatch[1]}\`` }] };
    }

    return null;
}

export function provideHover(ctx: HoverContext): HoverResult | null {
    const { code, lineContent, wordAtPosition, registeredPages } = ctx;
    if (!wordAtPosition) return null;

    const pages = registeredPages || parseVeroPages(code);

    const memberMatch = lineContent.match(new RegExp(`(\\w+)\\.${wordAtPosition}\\b`));
    if (memberMatch) {
        const hover = getPageMemberHover(memberMatch[1], wordAtPosition, pages, code);
        if (hover) return hover;
    }

    if (/^[A-Z][a-zA-Z0-9]*$/.test(wordAtPosition)) {
        const hover = getPageHover(wordAtPosition, pages);
        if (hover) return hover;
    }

    if (lineContent.includes('$' + wordAtPosition) || wordAtPosition.startsWith('$')) {
        const hover = getVariableHover(wordAtPosition.replace(/^\$/, ''), code);
        if (hover) return hover;
    }

    const keywordHover = getKeywordHover(wordAtPosition);
    if (keywordHover) return keywordHover;

    const lineWords = lineContent.toLowerCase().split(/\s+/);
    const wordIndex = lineWords.findIndex(w => w === wordAtPosition.toLowerCase());
    if (wordIndex >= 0 && wordIndex < lineWords.length - 1) {
        const twoWordHover = getKeywordHover(`${lineWords[wordIndex]} ${lineWords[wordIndex + 1]}`);
        if (twoWordHover) return twoWordHover;
    }

    return null;
}

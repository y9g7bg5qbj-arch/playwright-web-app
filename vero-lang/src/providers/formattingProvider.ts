/**
 * Vero Language Formatting Provider
 *
 * Provides document formatting for Vero DSL files.
 * Handles indentation, spacing, and structure normalization.
 */

export interface TextEdit {
    range: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
    };
    text: string;
}

export interface FormattingOptions {
    tabSize: number;
    insertSpaces: boolean;
}

/**
 * Block-opening keywords that increase indentation
 */
const BLOCK_OPENERS = [
    /^\s*(page|pageactions)\s+\w+/i,
    /^\s*feature\s+/i,
    /^\s*scenario\s+/i,
    /^\s*before\s+(each|all)\s*\{?/i,
    /^\s*after\s+(each|all)\s*\{?/i,
    /^\s*\w+\s+(with\s+[^{]+)?\{/i, // action definitions
    /^\s*if\s+.+\{/i,
    /^\s*repeat\s+\d+\s+times\s*\{/i,
];

/**
 * Block-closing patterns
 */
const BLOCK_CLOSERS = [
    /^\s*\}\s*$/,
    /^\s*end\s+(feature|scenario|page|pageactions)\s*$/i,
];


/**
 * Format a single line of Vero code
 */
function formatLine(line: string, indentLevel: number, indent: string): string {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (trimmed === '' || trimmed.startsWith('#')) {
        return trimmed;
    }

    // Apply indent
    const indentStr = indent.repeat(indentLevel);

    // Normalize spacing around operators and keywords
    let formatted = trimmed;

    // Normalize "with" keyword spacing: ensure single space before and after
    formatted = formatted.replace(/\s+with\s+/gi, ' with ');

    // Normalize "=" spacing in field definitions
    formatted = formatted.replace(/\s*=\s*/g, ' = ');

    // Normalize selector keyword spacing
    formatted = formatted.replace(/role\s+"([^"]+)"\s+name\s+"([^"]+)"/gi, 'role "$1" name "$2"');

    // Normalize "is" keyword in verify statements
    formatted = formatted.replace(/\s+is\s+/gi, ' is ');
    formatted = formatted.replace(/\s+is\s+not\s+/gi, ' is not ');

    return indentStr + formatted;
}

/**
 * Check if a line opens a new block
 */
function opensBlock(line: string): boolean {
    const trimmed = line.trim();

    // Explicit brace
    if (trimmed.endsWith('{')) {
        return true;
    }

    // Block-style keywords without braces (feature Name, scenario "Name")
    for (const pattern of BLOCK_OPENERS) {
        if (pattern.test(trimmed) && !trimmed.includes('{')) {
            // Only if the line doesn't already have a closing brace
            return !trimmed.endsWith('}');
        }
    }

    return false;
}

/**
 * Check if a line closes a block
 */
function closesBlock(line: string): boolean {
    const trimmed = line.trim();
    for (const pattern of BLOCK_CLOSERS) {
        if (pattern.test(trimmed)) {
            return true;
        }
    }
    return false;
}

/**
 * Check if line is an "else" clause (should dedent then indent)
 */
function isElseClause(line: string): boolean {
    const trimmed = line.trim();
    return /^\}\s*else\s*\{?$/i.test(trimmed) || /^else\s*\{?$/i.test(trimmed);
}

/**
 * Format the entire Vero document
 */
export function formatDocument(source: string, options: FormattingOptions = { tabSize: 4, insertSpaces: true }): TextEdit[] {
    const lines = source.split('\n');
    const indent = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
    const formattedLines: string[] = [];

    let indentLevel = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Handle empty lines - preserve them but remove trailing spaces
        if (trimmed === '') {
            formattedLines.push('');
            continue;
        }

        // Check if this line closes a block (dedent before formatting)
        const closes = closesBlock(trimmed);
        const isElse = isElseClause(trimmed);

        if (closes || isElse) {
            indentLevel = Math.max(0, indentLevel - 1);
        }

        // Format the line with current indent level
        const formatted = formatLine(line, indentLevel, indent);
        formattedLines.push(formatted);

        // Check if this line opens a block (indent after formatting)
        const opens = opensBlock(trimmed);

        if (opens) {
            indentLevel++;
        }

        // Handle else - re-indent for the else block
        if (isElse && trimmed.endsWith('{')) {
            indentLevel++;
        }

    }

    // Return a single edit that replaces the entire document
    const newText = formattedLines.join('\n');
    if (newText === source) {
        return []; // No changes needed
    }

    return [{
        range: {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: lines.length,
            endColumn: lines[lines.length - 1].length + 1,
        },
        text: newText,
    }];
}

/**
 * Format a selection of the document
 */
export function formatSelection(
    source: string,
    startLine: number,
    endLine: number,
    options: FormattingOptions = { tabSize: 4, insertSpaces: true }
): TextEdit[] {
    // For now, format the entire document
    // A more sophisticated implementation would calculate proper indent
    // based on the context before the selection
    return formatDocument(source, options);
}


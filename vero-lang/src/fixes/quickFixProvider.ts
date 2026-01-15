/**
 * Vero Language Quick Fix Provider
 *
 * Provides code actions (quick fixes) for common errors.
 * Integrates with Monaco editor's code action API.
 */

import type { MonacoMarkerData } from '../errors/monacoAdapter.js';

/**
 * Code action kinds matching Monaco's CodeActionKind
 */
export const CodeActionKind = {
    Empty: '',
    QuickFix: 'quickfix',
    Refactor: 'refactor',
    RefactorExtract: 'refactor.extract',
    RefactorInline: 'refactor.inline',
    RefactorRewrite: 'refactor.rewrite',
    Source: 'source',
    SourceOrganizeImports: 'source.organizeImports',
    SourceFixAll: 'source.fixAll',
} as const;

/**
 * Text edit for applying fixes
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

/**
 * Workspace edit (collection of text edits)
 */
export interface WorkspaceEdit {
    edits: Array<{
        resource: { path: string };
        edits: TextEdit[];
    }>;
}

/**
 * Code action interface matching Monaco's CodeAction
 */
export interface CodeAction {
    title: string;
    kind: string;
    diagnostics?: MonacoMarkerData[];
    edit?: WorkspaceEdit;
    isPreferred?: boolean;
    disabled?: { reason: string };
}

/**
 * Context for providing code actions
 */
export interface CodeActionContext {
    markers: MonacoMarkerData[];
    filePath: string;
    lineContent: string;
    definedPages?: string[];
}

/**
 * Common keyword typos and their corrections
 */
const KEYWORD_TYPOS: Record<string, string> = {
    'naivgate': 'navigate',
    'naviagte': 'navigate',
    'navigte': 'navigate',
    'clik': 'click',
    'clcik': 'click',
    'fil': 'fill',
    'verfiy': 'verify',
    'verifiy': 'verify',
    'veify': 'verify',
    'wiat': 'wait',
    'hovre': 'hover',
    'pres': 'press',
    'laod': 'load',
    'lod': 'load',
    'fo': 'for',
    'fr': 'for',
    'ech': 'each',
    'senario': 'scenario',
    'scenerio': 'scenario',
    'feeture': 'feature',
    'feture': 'feature',
    'pge': 'page',
    'feild': 'field',
    'actoin': 'action',
    'actin': 'action',
};

function createLineEdit(
    filePath: string,
    lineNumber: number,
    text: string,
    replaceEndColumn = 1
): WorkspaceEdit {
    return {
        edits: [{
            resource: { path: filePath },
            edits: [{
                range: {
                    startLineNumber: lineNumber,
                    startColumn: 1,
                    endLineNumber: lineNumber,
                    endColumn: replaceEndColumn,
                },
                text,
            }],
        }],
    };
}

function extractQuotedName(message: string): string | null {
    const match = message.match(/['"]([^'"]+)['"]/);
    return match ? match[1] : null;
}

function createRangeEdit(
    filePath: string,
    marker: MonacoMarkerData,
    text: string
): WorkspaceEdit {
    return {
        edits: [{
            resource: { path: filePath },
            edits: [{
                range: {
                    startLineNumber: marker.startLineNumber,
                    startColumn: marker.startColumn,
                    endLineNumber: marker.endLineNumber,
                    endColumn: marker.endColumn,
                },
                text,
            }],
        }],
    };
}

export function provideQuickFixes(
    marker: MonacoMarkerData,
    ctx: CodeActionContext
): CodeAction[] {
    const actions: CodeAction[] = [];
    const code = marker.code?.toString() || '';
    const message = marker.message.toLowerCase();

    // Fix: Undefined variable - suggest defining it
    if (code === 'VERO-203' || code === 'VERO-204' || message.includes('not defined')) {
        const varName = extractQuotedName(marker.message);
        if (varName) {
            actions.push({
                title: `Load ${varName} from table`,
                kind: CodeActionKind.QuickFix,
                edit: createLineEdit(ctx.filePath, marker.startLineNumber, `load ${varName} from "table_name"\n`),
                isPreferred: true,
            });
        }
    }

    // Fix: Page not in USE list
    if (code === 'VERO-201' || message.includes('not in use list')) {
        const pageName = extractQuotedName(marker.message);
        if (pageName) {
            actions.push({
                title: `Add 'use ${pageName}' at top`,
                kind: CodeActionKind.QuickFix,
                edit: createLineEdit(ctx.filePath, 2, `use ${pageName}\n`),
                isPreferred: true,
            });
        }
    }

    // Fix: Keyword typo
    for (const [typo, correction] of Object.entries(KEYWORD_TYPOS)) {
        if (ctx.lineContent.toLowerCase().includes(typo)) {
            const correctedLine = ctx.lineContent.replace(new RegExp(typo, 'gi'), correction);
            actions.push({
                title: `Change '${typo}' to '${correction}'`,
                kind: CodeActionKind.QuickFix,
                edit: createLineEdit(ctx.filePath, marker.startLineNumber, correctedLine, ctx.lineContent.length + 1),
                isPreferred: true,
            });
        }
    }

    // Fix: Missing closing brace/end
    if (message.includes('expected') && (message.includes('end') || message.includes('}'))) {
        actions.push({
            title: "Add closing 'end'",
            kind: CodeActionKind.QuickFix,
            edit: createLineEdit(ctx.filePath, marker.startLineNumber + 1, 'end\n'),
        });
    }

    // Fix: Missing quotes around string
    if (message.includes('expected') && message.includes('string')) {
        const wordMatch = ctx.lineContent.match(/(\w+)\s*$/);
        if (wordMatch) {
            const word = wordMatch[1];
            const quotedLine = ctx.lineContent.replace(word, `"${word}"`);
            actions.push({
                title: `Add quotes around '${word}'`,
                kind: CodeActionKind.QuickFix,
                edit: createLineEdit(ctx.filePath, marker.startLineNumber, quotedLine, ctx.lineContent.length + 1),
            });
        }
    }

    // Fix: Naming convention warnings
    if (code === 'VERO-310' || message.includes('naming convention') || message.includes('should be')) {
        const name = extractQuotedName(marker.message);
        if (name) {
            if (message.includes('pascalcase') || message.includes('page')) {
                const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
                actions.push({
                    title: `Rename to '${pascalName}'`,
                    kind: CodeActionKind.Refactor,
                    edit: createRangeEdit(ctx.filePath, marker, pascalName),
                });
            }

            if (message.includes('camelcase') || message.includes('field') || message.includes('action')) {
                const camelName = name.charAt(0).toLowerCase() + name.slice(1);
                actions.push({
                    title: `Rename to '${camelName}'`,
                    kind: CodeActionKind.Refactor,
                    edit: createRangeEdit(ctx.filePath, marker, camelName),
                });
            }
        }
    }

    return actions;
}

/**
 * Provide all quick fixes for multiple markers
 */
export function provideAllQuickFixes(ctx: CodeActionContext): CodeAction[] {
    const allActions: CodeAction[] = [];

    for (const marker of ctx.markers) {
        const actions = provideQuickFixes(marker, ctx);
        allActions.push(...actions);
    }

    return allActions;
}

/**
 * Check if a word is a known typo
 */
export function checkTypo(word: string): string | null {
    const lower = word.toLowerCase();
    return KEYWORD_TYPOS[lower] || null;
}

/**
 * Export for Monaco integration
 */
export default {
    provideQuickFixes,
    provideAllQuickFixes,
    checkTypo,
    CodeActionKind,
};

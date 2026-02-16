export * from './lexer/index.js';
export * from './parser/index.js';
export * from './transpiler/index.js';
export * from './validator/index.js';
export * from './completion/index.js';
export * from './fixes/index.js';
export * from './providers/index.js';
export * from './runtime/VeroUtils.js';
export * from './syntax/tabSyntax.js';
export * from './execution/index.js';

import { tokenize } from './lexer/index.js';
import { parse } from './parser/index.js';
import { transpile, TranspileOptions, TranspileResult } from './transpiler/index.js';
import { validate, ValidationResult } from './validator/index.js';
import {
    applyScenarioSelection,
    ScenarioSelectionError,
    type ScenarioSelectionDiagnostics,
    type ScenarioSelectionOptions,
} from './execution/index.js';

export interface CompileOptions extends TranspileOptions {
    selection?: ScenarioSelectionOptions;
}

export interface CompileResult {
    success: boolean;
    result?: TranspileResult;
    errors: Array<{ message: string; line?: number }>;
    selection?: ScenarioSelectionDiagnostics;
}

/**
 * Compile Vero source to Playwright TypeScript
 */
export function compile(source: string, options?: CompileOptions): CompileResult {
    const errors: Array<{ message: string; line?: number }> = [];

    // Tokenize
    const { tokens, errors: lexerErrors } = tokenize(source);
    if (lexerErrors.length > 0) {
        return { success: false, errors: lexerErrors };
    }

    // Parse
    const { ast, errors: parseErrors } = parse(tokens);
    if (parseErrors.length > 0) {
        return { success: false, errors: parseErrors };
    }

    let selectedAst = ast;
    let selectionDiagnostics: ScenarioSelectionDiagnostics | undefined;
    if (options?.selection) {
        try {
            const selected = applyScenarioSelection(ast, options.selection);
            selectedAst = selected.program;
            selectionDiagnostics = selected.diagnostics;
        } catch (error) {
            if (error instanceof ScenarioSelectionError) {
                return { success: false, errors: [{ message: error.message }] };
            }
            return { success: false, errors: [{ message: error instanceof Error ? error.message : String(error) }] };
        }
    }

    // Validate
    const validation = validate(selectedAst);
    if (!validation.valid) {
        return { success: false, errors: validation.errors };
    }

    // Transpile
    const result = transpile(selectedAst, options);

    return { success: true, result, errors: [], selection: selectionDiagnostics };
}

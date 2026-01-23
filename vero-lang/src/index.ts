export * from './lexer/index.js';
export * from './parser/index.js';
export * from './transpiler/index.js';
export * from './validator/index.js';
export * from './completion/index.js';
export * from './fixes/index.js';
export * from './providers/index.js';
export * from './runtime/VeroUtils.js';

import { tokenize } from './lexer/index.js';
import { parse } from './parser/index.js';
import { transpile, TranspileOptions, TranspileResult } from './transpiler/index.js';
import { validate, ValidationResult } from './validator/index.js';

/**
 * Compile Vero source to Playwright TypeScript
 */
export function compile(source: string, options?: TranspileOptions): {
    success: boolean;
    result?: TranspileResult;
    errors: Array<{ message: string; line?: number }>;
} {
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

    // Validate
    const validation = validate(ast);
    if (!validation.valid) {
        return { success: false, errors: validation.errors };
    }

    // Transpile
    const result = transpile(ast, options);

    return { success: true, result, errors: [] };
}

/**
 * Code Formatter
 * Pretty-prints generated code using Prettier
 */

import * as prettier from 'prettier';
import { logger } from '../utils/logger';

/**
 * Format TypeScript code using Prettier
 */
export async function formatCode(code: string): Promise<string> {
    try {
        const formatted = await prettier.format(code, {
            parser: 'typescript',
            semi: true,
            singleQuote: true,
            trailingComma: 'es5',
            printWidth: 100,
            tabWidth: 2,
            useTabs: false,
        });
        return formatted;
    } catch (error) {
        // If formatting fails, return the original code
        logger.warn('Code formatting failed:', error);
        return code;
    }
}

/**
 * Format multiple code files
 */
export async function formatCodeFiles(
    files: Record<string, string>
): Promise<Record<string, string>> {
    const formatted: Record<string, string> = {};

    for (const [name, code] of Object.entries(files)) {
        formatted[name] = await formatCode(code);
    }

    return formatted;
}

/**
 * Format generated code result
 */
export async function formatGeneratedCode(result: {
    testFile: string;
    fixturesFile?: string;
    configFile?: string;
    pageObjects?: Record<string, string>;
    dataFiles?: Record<string, string>;
}): Promise<typeof result> {
    const formatted = { ...result };

    // Format main test file
    formatted.testFile = await formatCode(result.testFile);

    // Format fixtures file
    if (result.fixturesFile) {
        formatted.fixturesFile = await formatCode(result.fixturesFile);
    }

    // Format config file
    if (result.configFile) {
        formatted.configFile = await formatCode(result.configFile);
    }

    // Format page objects
    if (result.pageObjects) {
        formatted.pageObjects = await formatCodeFiles(result.pageObjects);
    }

    // Format data files (JSON)
    if (result.dataFiles) {
        formatted.dataFiles = {};
        for (const [name, data] of Object.entries(result.dataFiles)) {
            try {
                formatted.dataFiles[name] = await prettier.format(data, {
                    parser: 'json',
                    tabWidth: 2,
                });
            } catch {
                formatted.dataFiles[name] = data;
            }
        }
    }

    return formatted;
}

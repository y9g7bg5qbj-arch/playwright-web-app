import { readFile } from 'fs/promises';
import { join } from 'path';
import { tokenize, parse, collectFeatureReferences } from 'vero-lang';

// Detect the project root directory from a file path by finding Features/Pages/PageActions boundary.
export function detectProjectRoot(filePath: string, defaultRoot: string): string {
    const pathParts = filePath.split('/');
    const isAbsolutePath = filePath.startsWith('/');
    for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i].toLowerCase();
        if (part === 'features' || part === 'pages' || part === 'pageactions') {
            const projectPathParts = pathParts.slice(0, i).join('/');
            return isAbsolutePath
                ? projectPathParts
                : (projectPathParts ? join(defaultRoot, projectPathParts) : defaultRoot);
        }
    }
    return defaultRoot;
}

// Load referenced page and pageAction files for a list of page names.
export async function loadReferencedPages(pageNames: string[], projectRoot: string): Promise<string> {
    let combinedContent = '';
    const loadedFilePaths = new Set<string>();

    const appendFileIfPresent = async (filePath: string, prepend = false): Promise<boolean> => {
        if (loadedFilePaths.has(filePath)) {
            return true;
        }

        try {
            const fileContent = await readFile(filePath, 'utf-8');
            loadedFilePaths.add(filePath);
            if (prepend) {
                combinedContent = `${fileContent}\n\n${combinedContent}`;
            } else {
                combinedContent += `${fileContent}\n\n`;
            }
            return true;
        } catch {
            return false;
        }
    };

    for (const pageName of pageNames) {
        const pageFilePath = join(projectRoot, 'Pages', `${pageName}.vero`);
        const pageActionsFilePath = join(projectRoot, 'PageActions', `${pageName}.vero`);

        const loadedPage = await appendFileIfPresent(pageFilePath);
        if (!loadedPage) {
            await appendFileIfPresent(pageActionsFilePath);
        }

        if (pageName.endsWith('PageActions')) {
            const baseName = pageName.replace('PageActions', '');
            const basePagePath = join(projectRoot, 'Pages', `${baseName}Page.vero`);
            await appendFileIfPresent(basePagePath, true);
        }
    }
    return combinedContent;
}

/**
 * Extract referenced page/pageActions names from Vero feature content using the AST.
 * Replaces the old `USE` regex extraction.
 */
export function extractReferencedPageNames(veroContent: string): string[] {
    try {
        const lexResult = tokenize(veroContent);
        if (lexResult.errors.length > 0) return [];
        const parseResult = parse(lexResult.tokens);
        const refs = new Set<string>();
        for (const feature of parseResult.ast.features) {
            for (const name of collectFeatureReferences(feature)) {
                refs.add(name);
            }
        }
        return [...refs];
    } catch {
        return [];
    }
}

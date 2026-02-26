/**
 * Vero Page Rename Refactoring Utilities
 *
 * When a PAGE file is renamed, this module scans all .vero files in the project
 * to find references to the old page name (e.g., `OldPage.field`) and produces
 * a preview of all replacements. The user can then confirm to apply the changes.
 */

import { readFile, writeFile } from 'fs/promises';
import { join, relative } from 'path';
import { findVeroFiles } from './veroPageFields.utils';

// ── Public types ─────────────────────────────────────────────────────

export interface LineChange {
    line: number;
    oldText: string;
    newText: string;
}

export interface AffectedFile {
    relativePath: string;
    occurrences: number;
    preview: LineChange[];
}

export interface RenamePreviewResult {
    oldPageName: string;
    newPageName: string;
    pageFile: {
        relativePath: string;
        oldContent: string;
        newContent: string;
    };
    affectedFiles: AffectedFile[];
    totalOccurrences: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Extract the PAGE name declared inside a .vero file.
 * Matches the first `PAGE <Name>` declaration.
 */
export function extractPageName(content: string): string | null {
    const match = content.match(/^PAGE\s+(\w+)/im);
    return match ? match[1] : null;
}

/**
 * Replace the PAGE declaration name and any PAGEACTIONS FOR references
 * inside the page file itself.
 */
export function buildPageFileReplacement(
    content: string,
    oldPageName: string,
    newPageName: string,
): string {
    let result = content;

    // Replace PAGE declaration: PAGE OldName → PAGE NewName
    result = result.replace(
        new RegExp(`^(PAGE\\s+)${escapeRegex(oldPageName)}\\b`, 'im'),
        `$1${newPageName}`,
    );

    // Replace PAGEACTIONS ... FOR OldName → PAGEACTIONS ... FOR NewName
    result = result.replace(
        new RegExp(`(PAGEACTIONS\\s+\\w+\\s+FOR\\s+)${escapeRegex(oldPageName)}\\b`, 'gim'),
        `$1${newPageName}`,
    );

    return result;
}

/**
 * Scan all .vero files in the project for references to oldPageName.
 * Returns affected files with line-level change previews.
 */
export async function scanForPageReferences(
    projectPath: string,
    oldPageName: string,
    newPageName: string,
    excludeFilePath: string,
): Promise<AffectedFile[]> {
    const allFiles = await findVeroFiles(projectPath);
    const affected: AffectedFile[] = [];

    // Word-boundary match for page references: OldPage.field, OldPage.action, etc.
    // Also matches standalone page name in PAGEACTIONS FOR declarations.
    const refPattern = new RegExp(`\\b${escapeRegex(oldPageName)}\\b`, 'g');

    for (const absPath of allFiles) {
        const relPath = relative(projectPath, absPath);

        // Skip the page file itself (handled separately)
        if (relPath === excludeFilePath || relPath.replace(/\\/g, '/') === excludeFilePath.replace(/\\/g, '/')) {
            continue;
        }

        try {
            const content = await readFile(absPath, 'utf-8');
            const lines = content.split('\n');
            const changes: LineChange[] = [];

            for (let i = 0; i < lines.length; i++) {
                if (refPattern.test(lines[i])) {
                    changes.push({
                        line: i + 1,
                        oldText: lines[i],
                        newText: lines[i].replace(
                            new RegExp(`\\b${escapeRegex(oldPageName)}\\b`, 'g'),
                            newPageName,
                        ),
                    });
                }
                // Reset lastIndex since we reuse the regex
                refPattern.lastIndex = 0;
            }

            if (changes.length > 0) {
                affected.push({
                    relativePath: relPath.replace(/\\/g, '/'),
                    occurrences: changes.length,
                    preview: changes,
                });
            }
        } catch {
            // Skip files that can't be read
        }
    }

    return affected;
}

/**
 * Build a full preview of all changes that would result from renaming
 * a page from its old name to a new name.
 */
export async function previewPageRename(
    projectPath: string,
    fileRelativePath: string,
    newPageName: string,
): Promise<RenamePreviewResult> {
    const absFilePath = join(projectPath, fileRelativePath);
    const content = await readFile(absFilePath, 'utf-8');
    const oldPageName = extractPageName(content);

    if (!oldPageName) {
        throw new Error(`No PAGE declaration found in ${fileRelativePath}`);
    }

    if (oldPageName === newPageName) {
        return {
            oldPageName,
            newPageName,
            pageFile: {
                relativePath: fileRelativePath,
                oldContent: content,
                newContent: content,
            },
            affectedFiles: [],
            totalOccurrences: 0,
        };
    }

    const newContent = buildPageFileReplacement(content, oldPageName, newPageName);
    const affectedFiles = await scanForPageReferences(
        projectPath,
        oldPageName,
        newPageName,
        fileRelativePath,
    );

    const totalOccurrences = affectedFiles.reduce((sum, f) => sum + f.occurrences, 0);

    return {
        oldPageName,
        newPageName,
        pageFile: {
            relativePath: fileRelativePath,
            oldContent: content,
            newContent: newContent,
        },
        affectedFiles,
        totalOccurrences,
    };
}

/**
 * Apply all changes from a preview result: update the page file and
 * all affected feature files.
 */
export async function applyPageRename(
    projectPath: string,
    preview: RenamePreviewResult,
): Promise<void> {
    // 1. Update the page file itself (PAGE declaration rename)
    if (preview.pageFile.oldContent !== preview.pageFile.newContent) {
        const absPagePath = join(projectPath, preview.pageFile.relativePath);
        await writeFile(absPagePath, preview.pageFile.newContent, 'utf-8');
    }

    // 2. Update all affected feature/page files
    const replacePattern = new RegExp(
        `\\b${escapeRegex(preview.oldPageName)}\\b`,
        'g',
    );

    for (const file of preview.affectedFiles) {
        const absPath = join(projectPath, file.relativePath);
        try {
            const content = await readFile(absPath, 'utf-8');
            const updated = content.replace(replacePattern, preview.newPageName);
            await writeFile(absPath, updated, 'utf-8');
        } catch {
            // Skip files that can't be written — will surface as partial apply
        }
    }
}

// ── Internal ─────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

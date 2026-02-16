import { Router, Response, NextFunction } from 'express';
import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { projectRepository } from '../db/repositories/mongo';
import { VERO_PROJECT_PATH, confineToBase } from './veroProjectPath.utils';
import { mongoTestDataService } from '../services/mongodb-test-data.service';
import { type VeroValidationError, getParserErrorCode, getParserErrorTitle, getParserErrorFix, getValidationErrorCode, getValidationErrorTitle, getValidationErrorFix } from './veroValidationMapping.utils';
import { collectDataRefsFromFeatures } from './veroDataReferenceExtraction.utils';
import { logger } from '../utils/logger';

// Helper function to recursively find all .vero files
async function findVeroFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
        const entries = await readdir(dir);

        for (const entry of entries) {
            const fullPath = join(dir, entry);
            const stats = await stat(fullPath);

            if (stats.isDirectory()) {
                const subFiles = await findVeroFiles(fullPath);
                files.push(...subFiles);
            } else if (entry.endsWith('.vero')) {
                files.push(fullPath);
            }
        }
    } catch (e) {
        // Directory doesn't exist or can't be read
    }

    return files;
}

/** Simple Levenshtein distance for typo suggestions */
function levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

const validationRouter = Router();

// Validate Vero code and return errors/warnings in VeroError format
validationRouter.post('/validate', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
        const { code, veroPath, filePath } = req.body;

        // Extract project path from filePath (parent of Features/Pages/PageActions)
        let effectiveVeroPath: string | null = null;
        let currentFileRelPath: string | null = null;
        if (filePath) {
            const pathParts = filePath.split('/');
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i].toLowerCase();
                if (part === 'features' || part === 'pages' || part === 'pageactions') {
                    effectiveVeroPath = pathParts.slice(0, i).join('/');
                    currentFileRelPath = pathParts.slice(i).join('/');
                    break;
                }
            }
        }

        // Fall back to veroPath if we couldn't extract from filePath
        if (!effectiveVeroPath && veroPath) {
            effectiveVeroPath = veroPath;
        }

        if (!code || typeof code !== 'string') {
            return res.json({
                success: true,
                errors: [],
                warnings: []
            });
        }

        // Import vero-lang parsing and validation functions
        const { tokenize, parse, validate } = await import('vero-lang');

        const veroErrors: VeroValidationError[] = [];
        const veroWarnings: VeroValidationError[] = [];

        try {
            // Load project context if veroPath is provided
            let combinedAst: any = { type: 'Program', pages: [], pageActions: [], features: [], fixtures: [] };

            if (effectiveVeroPath) {
                // Validate path stays within vero-projects root
                const projectPath = confineToBase(VERO_PROJECT_PATH, effectiveVeroPath);

                // Load all .vero files from Pages/, PageActions/ folders for context
                // Only check capitalized versions to avoid duplicates on case-insensitive filesystems
                const contextFolders = ['Pages', 'PageActions'];
                const processedFolders = new Set<string>();

                for (const folder of contextFolders) {
                    const folderPath = join(projectPath, folder);
                    const realFolderPath = existsSync(folderPath) ? require('fs').realpathSync(folderPath) : null;
                    if (realFolderPath && !processedFolders.has(realFolderPath)) {
                        processedFolders.add(realFolderPath);
                        try {
                            const files = await readdir(folderPath);
                            for (const file of files) {
                                if (!file.endsWith('.vero')) continue;

                                // Skip the file currently being validated to avoid duplicate definitions
                                const contextRelPath = `${folder}/${file}`;
                                if (currentFileRelPath && contextRelPath.toLowerCase() === currentFileRelPath.toLowerCase()) {
                                    continue;
                                }

                                const contextFilePath = join(folderPath, file);
                                const fileContent = await readFile(contextFilePath, 'utf-8');
                                const lexResult = tokenize(fileContent);
                                if (lexResult.errors.length === 0) {
                                    const parseResult = parse(lexResult.tokens);
                                    if (parseResult.errors.length === 0) {
                                        combinedAst.pages.push(...(parseResult.ast.pages || []));
                                        combinedAst.pageActions.push(...(parseResult.ast.pageActions || []));
                                    }
                                }
                            }
                        } catch {
                            // Folder may not exist or be unreadable
                        }
                    }
                }
            }

            // Step 1: Tokenize current file
            const lexResult = tokenize(code);

            // Convert lexer errors
            for (const err of lexResult.errors) {
                veroErrors.push({
                    code: 'VERO-101',
                    category: 'lexer',
                    severity: 'error',
                    location: {
                        line: err.line,
                        column: err.column
                    },
                    title: 'Syntax Error',
                    whatWentWrong: err.message,
                    howToFix: 'Check the syntax at this location. Make sure strings are properly quoted and keywords are spelled correctly.',
                    suggestions: [{ text: 'Review the Vero syntax guide' }]
                });
            }

            if (lexResult.errors.length > 0) {
                return res.json({
                    success: false,
                    errors: veroErrors,
                    warnings: veroWarnings
                });
            }

            // Step 2: Parse current file
            const parseResult = parse(lexResult.tokens);

            // Convert parser errors
            for (const err of parseResult.errors) {
                veroErrors.push({
                    code: getParserErrorCode(err.message),
                    category: 'parser',
                    severity: 'error',
                    location: {
                        line: err.line,
                        column: err.column
                    },
                    title: getParserErrorTitle(err.message),
                    whatWentWrong: err.message,
                    howToFix: getParserErrorFix(err.message),
                    suggestions: [{ text: 'Check the structure of your Vero code' }]
                });
            }

            if (parseResult.errors.length > 0) {
                return res.json({
                    success: false,
                    errors: veroErrors,
                    warnings: veroWarnings
                });
            }

            // Step 3: Combine with project context and validate
            combinedAst.pages.push(...(parseResult.ast.pages || []));
            combinedAst.pageActions.push(...(parseResult.ast.pageActions || []));
            combinedAst.features.push(...(parseResult.ast.features || []));
            combinedAst.fixtures.push(...(parseResult.ast.fixtures || []));

            const validationResult = validate(combinedAst);

            // Convert validation errors
            for (const err of validationResult.errors) {
                veroErrors.push({
                    code: getValidationErrorCode(err.message),
                    category: 'validation',
                    severity: 'error',
                    location: err.line ? { line: err.line } : undefined,
                    title: getValidationErrorTitle(err.message),
                    whatWentWrong: err.message,
                    howToFix: err.suggestion || getValidationErrorFix(err.message),
                    suggestions: err.suggestion ? [{ text: err.suggestion }] : []
                });
            }

            // Convert validation warnings
            for (const warn of validationResult.warnings) {
                veroWarnings.push({
                    code: 'VERO-350',
                    category: 'validation',
                    severity: 'warning',
                    location: warn.line ? { line: warn.line } : undefined,
                    title: 'Style Warning',
                    whatWentWrong: warn.message,
                    howToFix: warn.suggestion || 'Consider following Vero naming conventions.',
                    suggestions: warn.suggestion ? [{ text: warn.suggestion }] : []
                });
            }

            // ── Data reference validation ──
            // Collect data references from AST and check if tables/columns exist
            try {
                // Extract applicationId from the vero path (format: vero-projects/{appId}/{projectId}/...)
                let applicationId: string | null = null;
                if (effectiveVeroPath) {
                    const pathParts = effectiveVeroPath.replace(/\\/g, '/').split('/');
                    const vpIdx = pathParts.indexOf('vero-projects');
                    if (vpIdx >= 0 && pathParts.length > vpIdx + 1) {
                        applicationId = pathParts[vpIdx + 1];
                    }
                }

                if (applicationId) {
                    const tableRefs = collectDataRefsFromFeatures(parseResult.ast.features || []);

                    if (tableRefs.length > 0) {
                        // Load all sheets for this application
                        const sheets = await mongoTestDataService.getSheetsByApplicationId(applicationId);
                        const sheetMap = new Map(sheets.map(s => [s.name.toLowerCase(), s]));
                        const unknownTableWarningKeys = new Set<string>();
                        const unknownColumnWarningKeys = new Set<string>();

                        for (const ref of tableRefs) {
                            // Cross-project refs (Project.Table) are not validated in local app scope.
                            if (ref.projectName) {
                                continue;
                            }

                            const normalizedTableName = ref.tableName.trim();
                            if (!normalizedTableName) {
                                continue;
                            }

                            const sheet = sheetMap.get(normalizedTableName.toLowerCase());
                            if (!sheet) {
                                const warningKey = `${ref.line}:${normalizedTableName.toLowerCase()}`;
                                if (unknownTableWarningKeys.has(warningKey)) {
                                    continue;
                                }

                                veroWarnings.push({
                                    code: 'VERO-401',
                                    category: 'data',
                                    severity: 'warning',
                                    location: { line: ref.line },
                                    title: 'Unknown Data Table',
                                    whatWentWrong: `Table "${normalizedTableName}" is not defined in test data.`,
                                    howToFix: `Create a table named "${normalizedTableName}" in the Test Data view, or check the table name for typos.`,
                                    suggestions: [
                                        { text: `Create table "${normalizedTableName}"`, action: `createTable:${normalizedTableName}` },
                                        { text: 'Open Test Data view', action: 'openTestData' },
                                    ],
                                });

                                unknownTableWarningKeys.add(warningKey);
                            } else {
                                // Check column names
                                const sheetColumns = new Set(sheet.columns.map(c => c.name.toLowerCase()));
                                const uniqueColumns = [...new Set(ref.columns.map(col => col.trim()).filter(Boolean))];

                                for (const col of uniqueColumns) {
                                    const normalizedColumn = col.toLowerCase();
                                    const warningKey = `${ref.line}:${normalizedTableName.toLowerCase()}:${normalizedColumn}`;
                                    if (unknownColumnWarningKeys.has(warningKey)) {
                                        continue;
                                    }
                                    if (!sheetColumns.has(normalizedColumn)) {
                                        // Find closest match for suggestion
                                        const closest = sheet.columns
                                            .map(c => ({ name: c.name, dist: levenshteinDistance(col.toLowerCase(), c.name.toLowerCase()) }))
                                            .sort((a, b) => a.dist - b.dist)[0];

                                        const suggestions: { text: string; action?: string }[] = [];
                                        if (closest && closest.dist <= 3) {
                                            suggestions.push({ text: `Did you mean "${closest.name}"?` });
                                        }

                                        veroWarnings.push({
                                            code: 'VERO-402',
                                            category: 'data',
                                            severity: 'warning',
                                            location: { line: ref.line },
                                            title: 'Unknown Column',
                                            whatWentWrong: `Column "${col}" does not exist in table "${normalizedTableName}".`,
                                            howToFix: `Available columns: ${sheet.columns.map(c => c.name).join(', ')}`,
                                            suggestions,
                                        });
                                        unknownColumnWarningKeys.add(warningKey);
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (dataValidationError) {
                logger.warn('[Vero Validate] Data reference validation failed (non-fatal):', dataValidationError);
            }

            res.json({
                success: validationResult.valid,
                errors: veroErrors,
                warnings: veroWarnings
            });

        } catch (parseError) {
            // Catch any unexpected parsing errors
            logger.error('[Vero Validate] Parse error:', parseError);
            veroErrors.push({
                code: 'VERO-199',
                category: 'parser',
                severity: 'error',
                title: 'Parse Error',
                whatWentWrong: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
                howToFix: 'Check your Vero code syntax.',
                suggestions: []
            });

            res.json({
                success: false,
                errors: veroErrors,
                warnings: veroWarnings
            });
        }

    } catch (error) {
        logger.error('[Vero Validate] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate code'
        });
    }
});

// Go to Definition - Find symbol definition
validationRouter.post('/definition', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
        const { word } = req.body;

        if (!word) {
            return res.json({ success: true, location: null });
        }

        const projectId = req.query.projectId as string;
        if (!projectId) {
            return res.status(400).json({ success: false, error: 'Project ID is required' });
        }

        // Get the project path
        const project = await projectRepository.findById(projectId);

        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const projectPath = join(process.cwd(), 'vero-projects', project.applicationId, projectId);

        // Scan all .vero files in the project
        const files = await findVeroFiles(projectPath);

        // Search for symbol definition across all files
        for (const veroFile of files) {
            try {
                const content = await readFile(veroFile, 'utf-8');
                const lines = content.split('\n');

                // Look for page definition
                if (/^[A-Z][a-zA-Z0-9]*$/.test(word)) {
                    for (let i = 0; i < lines.length; i++) {
                        const ln = lines[i];
                        const pageMatch = ln.match(new RegExp(`^\\s*page\\s+(${word})\\s*\\{`, 'i'));
                        if (pageMatch) {
                            const col = ln.indexOf(pageMatch[1]) + 1;
                            return res.json({
                                success: true,
                                location: {
                                    filePath: veroFile,
                                    line: i + 1,
                                    column: col,
                                    endLine: i + 1,
                                    endColumn: col + word.length
                                }
                            });
                        }
                    }
                }

                // Look for field/action definition (word contains dot: Page.member)
                if (word.includes('.')) {
                    const [pageName, memberName] = word.split('.');
                    let inPage = false;

                    for (let i = 0; i < lines.length; i++) {
                        const ln = lines[i];

                        if (ln.match(new RegExp(`^\\s*page\\s+${pageName}\\s*\\{`, 'i'))) {
                            inPage = true;
                        }

                        if (inPage) {
                            // Field definition
                            const fieldMatch = ln.match(new RegExp(`^\\s*field\\s+(${memberName})\\s*=`, 'i'));
                            if (fieldMatch) {
                                const col = ln.indexOf(fieldMatch[1]) + 1;
                                return res.json({
                                    success: true,
                                    location: {
                                        filePath: veroFile,
                                        line: i + 1,
                                        column: col,
                                        endLine: i + 1,
                                        endColumn: col + memberName.length
                                    }
                                });
                            }

                            // Action definition
                            const actionMatch = ln.match(new RegExp(`^\\s*(${memberName})(?:\\s+with)?\\s*\\{`, 'i'));
                            if (actionMatch && !['field', 'if', 'for'].includes(actionMatch[1].toLowerCase())) {
                                const col = ln.indexOf(actionMatch[1]) + 1;
                                return res.json({
                                    success: true,
                                    location: {
                                        filePath: veroFile,
                                        line: i + 1,
                                        column: col,
                                        endLine: i + 1,
                                        endColumn: col + memberName.length
                                    }
                                });
                            }

                            if (ln.trim() === '}') inPage = false;
                        }
                    }
                }
            } catch (e) {
                // Skip files that can't be read
                continue;
            }
        }

        res.json({ success: true, location: null });

    } catch (error) {
        logger.error('[Vero Definition] Error:', error);
        res.status(500).json({ success: false, error: 'Failed to find definition' });
    }
});

// Find References - Find all usages of a symbol
validationRouter.post('/references', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
        const { word, includeDeclaration } = req.body;

        if (!word) {
            return res.json({ success: true, references: [] });
        }

        const projectId = req.query.projectId as string;
        if (!projectId) {
            return res.status(400).json({ success: false, error: 'Project ID is required' });
        }

        // Get the project path
        const project = await projectRepository.findById(projectId);

        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const projectPath = join(process.cwd(), 'vero-projects', project.applicationId, projectId);

        // Scan all .vero files in the project
        const files = await findVeroFiles(projectPath);
        const references: Array<{
            filePath: string;
            line: number;
            column: number;
            endLine: number;
            endColumn: number;
            kind: string;
            context: string;
        }> = [];

        // Search for references across all files
        for (const veroFile of files) {
            try {
                const content = await readFile(veroFile, 'utf-8');
                const lines = content.split('\n');

                for (let i = 0; i < lines.length; i++) {
                    const ln = lines[i];
                    const lineNum = i + 1;

                    // Page references
                    if (/^[A-Z][a-zA-Z0-9]*$/.test(word)) {
                        // Definition
                        if (includeDeclaration) {
                            const defMatch = ln.match(new RegExp(`^\\s*page\\s+(${word})\\s*\\{`, 'i'));
                            if (defMatch) {
                                references.push({
                                    filePath: veroFile,
                                    line: lineNum,
                                    column: ln.indexOf(defMatch[1]) + 1,
                                    endLine: lineNum,
                                    endColumn: ln.indexOf(defMatch[1]) + 1 + word.length,
                                    kind: 'definition',
                                    context: ln.trim()
                                });
                            }
                        }

                        // USE statement
                        const useMatch = ln.match(new RegExp(`\\buse\\s+(${word})\\b`, 'i'));
                        if (useMatch) {
                            references.push({
                                filePath: veroFile,
                                line: lineNum,
                                column: ln.indexOf(useMatch[1]) + 1,
                                endLine: lineNum,
                                endColumn: ln.indexOf(useMatch[1]) + 1 + word.length,
                                kind: 'use',
                                context: ln.trim()
                            });
                        }

                        // Page.member references
                        const memberRegex = new RegExp(`\\b(${word})\\.(\\w+)\\b`, 'gi');
                        let memberMatch;
                        while ((memberMatch = memberRegex.exec(ln)) !== null) {
                            references.push({
                                filePath: veroFile,
                                line: lineNum,
                                column: memberMatch.index + 1,
                                endLine: lineNum,
                                endColumn: memberMatch.index + 1 + word.length,
                                kind: 'reference',
                                context: ln.trim()
                            });
                        }
                    }
                }
            } catch (e) {
                // Skip files that can't be read
                continue;
            }
        }

        res.json({ success: true, references });

    } catch (error) {
        logger.error('[Vero References] Error:', error);
        res.status(500).json({ success: false, error: 'Failed to find references' });
    }
});

export { validationRouter as veroValidationRouter };

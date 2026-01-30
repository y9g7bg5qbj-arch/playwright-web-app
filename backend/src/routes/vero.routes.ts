import { Router, Request, Response, NextFunction } from 'express';
import { spawn, ChildProcess } from 'child_process';
import { readFile, writeFile, readdir, stat, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { existsSync } from 'fs';
import {
    projectRepository,
    workflowRepository,
    testFlowRepository,
    executionRepository,
    executionStepRepository,
    executionLogRepository
} from '../db/repositories/mongo';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Base path for Vero test project (configurable)
const VERO_PROJECT_PATH = process.env.VERO_PROJECT_PATH ||
    join(process.cwd(), '..', 'vero-lang', 'test-project');

// Active recording sessions with full state tracking
const activeRecordings = new Map<string, {
    process: ChildProcess;
    isPaused: boolean;
    sessionId: string;
    outputFile: string;
    currentCode: string;
    finalCode: string;
    isComplete: boolean;
    exitCode: number | null;
    error?: string;
    fileWatcher?: any;
}>();

// ============= FILE MANAGEMENT =============

// Example Vero script content for new projects
const EXAMPLE_PAGE_CONTENT = `# ExamplePage
# This page object defines reusable elements for your tests

page ExamplePage {
    # Define page elements using various locator strategies
    field searchInput = testId "search-input"
    field submitButton = testId "submit-btn"
    field resultsList = css ".results-list"
    field pageTitle = text "Welcome"

    # Define reusable actions
    search with $query {
        fill searchInput with $query
        click submitButton
        wait for resultsList to be visible
    }

    verifyPageLoaded {
        verify pageTitle is visible
    }
}
`;

const EXAMPLE_FEATURE_CONTENT = `# Example Feature
# This demonstrates how to write test scenarios in Vero

feature Example {
    use ExamplePage

    scenario "Verify page loads correctly" @smoke {
        # Navigate to the website
        open "https://example.com"

        # Verify the page loaded
        verify "Example Domain" is visible

        # Take a screenshot for documentation
        screenshot "homepage"
    }

    scenario "Search functionality" @regression {
        open "https://example.com"

        # Use page object action
        ExamplePage.search with "test query"

        # Verify results
        verify ExamplePage.resultsList is visible
    }
}
`;

// Helper function to create example files for a new project
// Uses capitalized folder names: Pages, Features, PageActions (3 folders)
async function createExampleFiles(projectPath: string): Promise<void> {
    const pagesDir = join(projectPath, 'Pages');
    const featuresDir = join(projectPath, 'Features');
    const pageActionsDir = join(projectPath, 'PageActions');

    // Create directories if they don't exist
    if (!existsSync(pagesDir)) {
        await mkdir(pagesDir, { recursive: true });
    }
    if (!existsSync(featuresDir)) {
        await mkdir(featuresDir, { recursive: true });
    }
    if (!existsSync(pageActionsDir)) {
        await mkdir(pageActionsDir, { recursive: true });
    }

    // Create example files if directories are empty
    const examplePagePath = join(pagesDir, 'ExamplePage.vero');
    const exampleFeaturePath = join(featuresDir, 'Example.vero');

    if (!existsSync(examplePagePath)) {
        await writeFile(examplePagePath, EXAMPLE_PAGE_CONTENT, 'utf-8');
    }
    if (!existsSync(exampleFeaturePath)) {
        await writeFile(exampleFeaturePath, EXAMPLE_FEATURE_CONTENT, 'utf-8');
    }
}

// Resolve project path from either a direct veroPath param or a projectId lookup
async function resolveProjectPath(veroPathParam: string | undefined, projectId: string | undefined): Promise<string> {
    if (veroPathParam) {
        return veroPathParam;
    }
    if (projectId) {
        const project = await projectRepository.findById(projectId);
        if (project?.veroPath) {
            return project.veroPath;
        }
    }
    return VERO_PROJECT_PATH;
}

// Detect the project root directory from a file path by finding Features/Pages/PageActions boundary
function detectProjectRoot(filePath: string, defaultRoot: string): string {
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

// Load referenced page and pageAction files for a list of page names
async function loadReferencedPages(pageNames: string[], projectRoot: string): Promise<string> {
    let combinedContent = '';
    for (const pageName of pageNames) {
        const pageFilePath = join(projectRoot, 'Pages', `${pageName}.vero`);
        const pageActionsFilePath = join(projectRoot, 'PageActions', `${pageName}.vero`);

        // Try Pages folder first, then PageActions
        let loaded = false;
        try {
            const pageContent = await readFile(pageFilePath, 'utf-8');
            combinedContent += pageContent + '\n\n';
            loaded = true;
        } catch {
            try {
                const pageContent = await readFile(pageActionsFilePath, 'utf-8');
                combinedContent += pageContent + '\n\n';
                loaded = true;
            } catch {
                // File not found for this page name
            }
        }

        // If a PageActions reference, also load the corresponding base Page
        if (pageName.endsWith('PageActions')) {
            const baseName = pageName.replace('PageActions', '');
            const basePagePath = join(projectRoot, 'Pages', `${baseName}Page.vero`);
            try {
                const basePageContent = await readFile(basePagePath, 'utf-8');
                if (!combinedContent.includes(basePageContent)) {
                    combinedContent = basePageContent + '\n\n' + combinedContent;
                }
            } catch {
                // Base page not found
            }
        }
    }
    return combinedContent;
}

// List all .vero files in the project
router.get('/files', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const projectId = req.query.projectId as string | undefined;
        const veroPathParam = req.query.veroPath as string | undefined;
        const projectPath = await resolveProjectPath(veroPathParam, projectId);
        const fullPath = projectPath.startsWith('/') ? projectPath : join(process.cwd(), projectPath);

        if (!existsSync(fullPath)) {
            return res.json({ success: true, files: [] });
        }

        const result = await scanDirectory(fullPath);
        res.json({ success: true, files: result });
    } catch (error) {
        console.error('Failed to list files:', error);
        res.status(500).json({ success: false, error: 'Failed to list files' });
    }
});

// Get file content
router.get('/files/:path(*)', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const filePath = req.params.path;
        const projectId = req.query.projectId as string | undefined;
        const veroPathParam = req.query.veroPath as string | undefined;
        const projectPath = await resolveProjectPath(veroPathParam, projectId);
        const fullPath = join(projectPath, filePath);

        // Security check: ensure path is within project
        if (!fullPath.startsWith(projectPath)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const content = await readFile(fullPath, 'utf-8');
        res.json({ success: true, content });
    } catch (error) {
        console.error('Failed to read file:', error);
        res.status(404).json({ success: false, error: 'File not found' });
    }
});

// Save file content
router.put('/files/:path(*)', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const filePath = req.params.path;
        const { content } = req.body;
        const projectId = req.query.projectId as string | undefined;
        const veroPathParam = req.query.veroPath as string | undefined;
        const projectPath = await resolveProjectPath(veroPathParam, projectId);
        const fullPath = join(projectPath, filePath);

        // Security check: ensure path is within project
        if (!fullPath.startsWith(projectPath)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // Ensure directory exists
        const dir = dirname(fullPath);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }

        await writeFile(fullPath, content, 'utf-8');
        res.json({ success: true, message: 'File saved' });
    } catch (error) {
        console.error('Failed to save file:', error);
        res.status(500).json({ success: false, error: 'Failed to save file' });
    }
});

// Rename file
router.post('/files/rename', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { oldPath, newPath } = req.body;

        if (!oldPath || !newPath) {
            return res.status(400).json({ success: false, error: 'Both oldPath and newPath are required' });
        }

        const fullOldPath = join(VERO_PROJECT_PATH, oldPath);
        const fullNewPath = join(VERO_PROJECT_PATH, newPath);

        // Security check: ensure paths are within project
        if (!fullOldPath.startsWith(VERO_PROJECT_PATH) || !fullNewPath.startsWith(VERO_PROJECT_PATH)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // Import rename from fs/promises
        const { rename } = await import('fs/promises');
        await rename(fullOldPath, fullNewPath);

        res.json({ success: true, message: 'File renamed', newPath });
    } catch (error) {
        console.error('Failed to rename file:', error);
        res.status(500).json({ success: false, error: 'Failed to rename file' });
    }
});

// Delete file
router.delete('/files/:path(*)', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const filePath = req.params.path;
        const projectId = req.query.projectId as string | undefined;
        const projectPath = await resolveProjectPath(undefined, projectId);
        const fullPath = join(projectPath, filePath);

        // Security check: ensure path is within project
        if (!fullPath.startsWith(projectPath)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const { unlink } = await import('fs/promises');
        await unlink(fullPath);

        res.json({ success: true, message: 'File deleted' });
    } catch (error) {
        console.error('Failed to delete file:', error);
        res.status(500).json({ success: false, error: 'Failed to delete file' });
    }
});

// ============= RECORDING =============

import { watch, FSWatcher } from 'fs';
import { tmpdir } from 'os';

// Helper to generate unique temp file path for Vero recording
function getVeroTempFilePath(sessionId: string): string {
    return join(tmpdir(), `vero-recording-${sessionId}.ts`);
}

// Start recording session with Playwright codegen
router.post('/recording/start', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { url = 'https://example.com' } = req.body;
        const sessionId = `vero-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const outputFile = getVeroTempFilePath(sessionId);

        // Spawn playwright codegen process with output file
        const command = `npx playwright codegen "${url}" --target=playwright-test -o "${outputFile}"`;

        const codegenProcess = spawn(command, [], {
            stdio: 'inherit', // Show browser window
            shell: true,
        });

        let currentCode = '';
        let fileWatcher: FSWatcher | undefined;

        // Watch the output file for changes
        const setupFileWatcher = () => {
            try {
                fileWatcher = watch(outputFile, async (eventType) => {
                    if (eventType === 'change' || eventType === 'rename') {
                        try {
                            const code = await readFile(outputFile, 'utf-8');
                            const session = activeRecordings.get(sessionId);
                            if (session) {
                                session.currentCode = code;
                            }
                        } catch (error) {
                            // File might not exist yet or is being written
                        }
                    }
                });
            } catch (error) {
                // File doesn't exist yet, retry later
                setTimeout(setupFileWatcher, 1000);
            }
        };

        // Try to set up watcher after a short delay
        setTimeout(setupFileWatcher, 2000);

        // Store the session with all required fields
        activeRecordings.set(sessionId, {
            process: codegenProcess,
            isPaused: false,
            sessionId,
            outputFile,
            currentCode: '',
            finalCode: '',
            isComplete: false,
            exitCode: null,
            fileWatcher,
        });

        codegenProcess.on('close', async (exitCode) => {

            // Stop watching the file
            const session = activeRecordings.get(sessionId);
            if (session?.fileWatcher) {
                session.fileWatcher.close();
            }

            // Wait a bit for the file to be fully written
            await new Promise(resolve => setTimeout(resolve, 500));

            // Read final code
            try {
                const finalCode = await readFile(outputFile, 'utf-8');

                if (session) {
                    session.finalCode = finalCode;
                    session.isComplete = true;
                    session.exitCode = exitCode;
                }
            } catch (error) {
                if (session) {
                    session.isComplete = true;
                    session.exitCode = exitCode;
                    session.error = error instanceof Error ? error.message : 'Unknown error';
                }
            }
            // Don't delete from activeRecordings - let stop/code endpoints handle it
        });

        codegenProcess.on('error', () => {
            const session = activeRecordings.get(sessionId);
            if (session?.fileWatcher) {
                session.fileWatcher.close();
            }
            activeRecordings.delete(sessionId);
        });

        res.json({
            success: true,
            sessionId,
            message: 'Recording started. Perform actions in the browser, then close it when done.'
        });
    } catch (error) {
        console.error('Failed to start recording:', error);
        res.status(500).json({ success: false, error: 'Failed to start recording' });
    }
});

// Get recording status and code
router.get('/recording/code/:sessionId', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { sessionId } = req.params;
        const session = activeRecordings.get(sessionId);

        if (!session) {
            return res.json({
                success: true,
                code: '',
                isRecording: false,
                isComplete: false
            });
        }

        const code = session.finalCode || session.currentCode || '';
        const isRecording = !session.process.killed && session.process.exitCode === null;
        const isComplete = session.isComplete;

        res.json({
            success: true,
            code,
            isRecording,
            isComplete,
            error: session.error
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get recording status' });
    }
});

// Pause/resume recording
router.post('/recording/pause', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { sessionId } = req.body;
        const session = activeRecordings.get(sessionId);

        if (!session) {
            return res.status(404).json({ success: false, error: 'Recording session not found' });
        }

        session.isPaused = !session.isPaused;
        res.json({ success: true, isPaused: session.isPaused });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to pause recording' });
    }
});

// Stop recording session and get the generated code
router.post('/recording/stop', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { sessionId } = req.body;
        const session = activeRecordings.get(sessionId);

        if (!session) {
            return res.json({ success: true, code: '', message: 'No active recording found' });
        }

        // Kill the process if still running
        if (!session.process.killed && session.process.exitCode === null) {
            session.process.kill('SIGTERM');
            // Wait for process to finish and file to be written
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        // Stop file watcher
        if (session.fileWatcher) {
            session.fileWatcher.close();
        }

        // Read the final code from file
        let code = '';
        try {
            code = await readFile(session.outputFile, 'utf-8');
        } catch {
            code = session.finalCode || session.currentCode || '';
        }

        // Clean up
        activeRecordings.delete(sessionId);

        // Delete temp file
        try {
            const { unlink } = await import('fs/promises');
            await unlink(session.outputFile);
        } catch (error) {
            // Ignore if file doesn't exist
        }

        // Convert Playwright code to Vero DSL
        const veroCode = convertPlaywrightToVero(code);

        res.json({
            success: true,
            code: veroCode,
            rawPlaywrightCode: code,
            message: 'Recording stopped'
        });
    } catch (error) {
        console.error('Failed to stop recording:', error);
        res.status(500).json({ success: false, error: 'Failed to stop recording' });
    }
});

// Helper function to convert Playwright code to Vero DSL
function convertPlaywrightToVero(playwrightCode: string): string {
    if (!playwrightCode) return '';

    const lines = playwrightCode.split('\n');
    const veroActions: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip non-action lines
        if (!trimmed.startsWith('await page.') && !trimmed.startsWith('await expect')) {
            continue;
        }

        // Parse different Playwright actions
        let veroLine = '';

        // goto
        const gotoMatch = trimmed.match(/await page\.goto\(['"](.+?)['"]\)/);
        if (gotoMatch) {
            veroLine = `open "${gotoMatch[1]}"`;
        }

        // click
        const clickMatch = trimmed.match(/await page\.(?:getByRole|getByText|locator)\((.+?)\)\.click\(\)/);
        if (clickMatch) {
            const selector = extractSelector(clickMatch[1]);
            veroLine = `click "${selector}"`;
        }

        // Simple click with locator
        const simpleClickMatch = trimmed.match(/await page\.click\(['"](.+?)['"]\)/);
        if (simpleClickMatch) {
            veroLine = `click "${simpleClickMatch[1]}"`;
        }

        // fill
        const fillMatch = trimmed.match(/await page\.(?:getByRole|getByLabel|getByPlaceholder|locator)\((.+?)\)\.fill\(['"](.+?)['"]\)/);
        if (fillMatch) {
            const selector = extractSelector(fillMatch[1]);
            veroLine = `fill "${selector}" with "${fillMatch[2]}"`;
        }

        // Simple fill with locator
        const simpleFillMatch = trimmed.match(/await page\.fill\(['"](.+?)['"],\s*['"](.+?)['"]\)/);
        if (simpleFillMatch) {
            veroLine = `fill "${simpleFillMatch[1]}" with "${simpleFillMatch[2]}"`;
        }

        // press
        const pressMatch = trimmed.match(/\.press\(['"](.+?)['"]\)/);
        if (pressMatch && !veroLine) {
            veroLine = `press "${pressMatch[1]}"`;
        }

        // check
        const checkMatch = trimmed.match(/await page\.(?:getByRole|locator)\((.+?)\)\.check\(\)/);
        if (checkMatch) {
            const selector = extractSelector(checkMatch[1]);
            veroLine = `check "${selector}"`;
        }

        // select
        const selectMatch = trimmed.match(/await page\.(?:getByRole|locator)\((.+?)\)\.selectOption\(['"](.+?)['"]\)/);
        if (selectMatch) {
            const selector = extractSelector(selectMatch[1]);
            veroLine = `select "${selectMatch[2]}" from "${selector}"`;
        }

        // expect assertions
        const expectVisibleMatch = trimmed.match(/await expect\(page\.(?:getByRole|getByText|locator)\((.+?)\)\)\.toBeVisible\(\)/);
        if (expectVisibleMatch) {
            const selector = extractSelector(expectVisibleMatch[1]);
            veroLine = `expect "${selector}" visible`;
        }

        const expectTextMatch = trimmed.match(/await expect\(page\.(?:getByRole|getByText|locator)\((.+?)\)\)\.toContainText\(['"](.+?)['"]\)/);
        if (expectTextMatch) {
            const selector = extractSelector(expectTextMatch[1]);
            veroLine = `expect "${selector}" contains "${expectTextMatch[2]}"`;
        }

        if (veroLine) {
            veroActions.push('  ' + veroLine);
        }
    }

    return veroActions.join('\n');
}

// Helper to extract readable selector from Playwright locator
function extractSelector(locatorString: string): string {
    // Remove quotes and extract meaningful part
    const cleaned = locatorString.replace(/['"]/g, '').trim();

    // Handle getByRole patterns
    const roleMatch = cleaned.match(/\{\s*name:\s*['"](.*?)['"]/);
    if (roleMatch) {
        return roleMatch[1];
    }

    return cleaned;
}

// ============= RUN TESTS =============

// Run Vero file - transpiles to Playwright and executes
router.post('/run', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { filePath, content, config, scenarioName } = req.body;
        const isHeadless = config?.browserMode === 'headless';
        const userId = (req as AuthRequest).userId!;

        // Get Vero content - either from request or read from file
        let veroContent = content;
        if (!veroContent && filePath) {
            // Handle both absolute and relative file paths
            const fullPath = filePath.startsWith('/') ? filePath : join(VERO_PROJECT_PATH, filePath);
            veroContent = await readFile(fullPath, 'utf-8');
        }

        if (!veroContent) {
            return res.status(400).json({ success: false, error: 'No content provided' });
        }

        // Get or create a test flow for this Vero file to track executions
        const flowName = filePath ? filePath.split('/').pop()?.replace('.vero', '') || 'Vero Test' : 'Vero Test';
        let testFlow = await getOrCreateVeroTestFlow(userId, filePath || 'inline', flowName, veroContent);

        // Create execution record with 'running' status
        const startTime = new Date();

        const execution = await executionRepository.create({
            testFlowId: testFlow.id,
            status: 'running',
            target: 'local',
            triggeredBy: 'manual',
            startedAt: startTime,
            configSnapshot: JSON.stringify({
                browserMode: config?.browserMode || 'headed',
                workers: config?.workers || 1,
            }),
        });
        const executionId = execution.id;

        // Extract USE statements and load referenced pages/pageActions
        const useMatches = veroContent.match(/USE\s+(\w+)/gi) || [];
        const pageNames = useMatches.map((m: string) => m.replace(/USE\s+/i, '').trim());
        const projectRoot = filePath ? detectProjectRoot(filePath, VERO_PROJECT_PATH) : VERO_PROJECT_PATH;
        const referencedContent = await loadReferencedPages(pageNames, projectRoot);
        const combinedContent = referencedContent + veroContent;

        // Validate the combined Vero code before transpiling
        const { tokenize, parse, validate } = await import('vero-lang');

        const lexResult = tokenize(combinedContent);
        if (lexResult.errors.length > 0) {
            await executionRepository.update(executionId, { status: 'failed', finishedAt: new Date() });
            const errorMessages = lexResult.errors.map((e: any) => `Line ${e.line}: ${e.message}`).join('\n');
            return res.status(400).json({
                success: false, status: 'failed', executionId,
                error: `Syntax errors prevent execution:\n${errorMessages}`,
                errors: lexResult.errors,
            });
        }

        const parseResult = parse(lexResult.tokens);
        if (parseResult.errors.length > 0) {
            await executionRepository.update(executionId, { status: 'failed', finishedAt: new Date() });
            const errorMessages = parseResult.errors.map((e: any) => `Line ${e.line}: ${e.message}`).join('\n');
            return res.status(400).json({
                success: false, status: 'failed', executionId,
                error: `Parse errors prevent execution:\n${errorMessages}`,
                errors: parseResult.errors,
            });
        }

        const validationResult = validate(parseResult.ast);
        if (!validationResult.valid && validationResult.errors.length > 0) {
            await executionRepository.update(executionId, { status: 'failed', finishedAt: new Date() });
            const errorMessages = validationResult.errors.map((e: any) =>
                `${e.line ? `Line ${e.line}: ` : ''}${e.message}${e.suggestion ? ` (${e.suggestion})` : ''}`
            ).join('\n');
            return res.status(400).json({
                success: false, status: 'failed', executionId,
                error: `Validation errors prevent execution:\n${errorMessages}`,
                errors: validationResult.errors,
            });
        }

        // Transpile Vero to Playwright
        const { transpileVero } = await import('../services/veroTranspiler');
        const playwrightCode = transpileVero(combinedContent);

        // Write to temp test file in backend directory (which has @playwright/test in node_modules)
        const backendDir = process.cwd();
        const tempTestFile = join(backendDir, '.vero-temp-test.spec.ts');
        await writeFile(tempTestFile, playwrightCode, 'utf-8');

        // Run Playwright - use headless or headed based on config
        const headedFlag = isHeadless ? '' : '--headed';
        // Filter to specific scenario if scenarioName is provided
        const grepFlag = scenarioName ? `--grep "${scenarioName}"` : '';
        // Workers for parallel execution (local machine)
        const workers = config?.workers || 1;
        const workersFlag = workers > 1 ? `--workers=${workers}` : '';
        // Retries for failed tests
        const retries = config?.retries || 0;
        const retriesFlag = retries > 0 ? `--retries=${retries}` : '';

        const command = `npx playwright test .vero-temp-test.spec.ts ${headedFlag} ${workersFlag} ${retriesFlag} ${grepFlag} --timeout=60000`.trim().replace(/\s+/g, ' ');

        // Prepare environment with VERO_ENV_VARS for {{variableName}} resolution
        const processEnv: Record<string, string> = { ...process.env } as Record<string, string>;
        if (config?.envVars && Object.keys(config.envVars).length > 0) {
            processEnv.VERO_ENV_VARS = JSON.stringify(config.envVars);
        }

        const testProcess = spawn(command, [], {
            cwd: backendDir,
            shell: true,
            stdio: 'pipe',
            env: processEnv,
        });

        let stdout = '';
        let stderr = '';

        testProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        testProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        // Wait for process to complete (with timeout)
        const result = await new Promise<{ status: string; output: string; error?: string; generatedCode?: string }>((resolve) => {
            const timeout = setTimeout(() => {
                testProcess.kill();
                resolve({
                    status: 'timeout',
                    output: stdout,
                    error: 'Test execution timed out after 2 minutes',
                    generatedCode: playwrightCode
                });
            }, 120000);

            testProcess.on('close', (code) => {
                clearTimeout(timeout);
                resolve({
                    status: code === 0 ? 'passed' : 'failed',
                    output: stdout || 'Test completed',
                    error: code !== 0 ? stderr : undefined,
                    generatedCode: playwrightCode
                });
            });
        });

        // Update execution record with final status
        const finishTime = new Date();

        // Parse JSON test results to get scenario/step data
        let passedCount = 0;
        let failedCount = 0;
        let skippedCount = 0;
        const resultsJsonPath = join(VERO_PROJECT_PATH, 'test-results', 'results.json');

        try {
            if (existsSync(resultsJsonPath)) {
                const resultsJson = await readFile(resultsJsonPath, 'utf-8');
                const results = JSON.parse(resultsJson);

                // Recursively process suites to handle nested describe blocks
                let stepNumber = 0;
                const processSuite = async (suite: any, parentTitle = '') => {
                    const suiteName = parentTitle ? `${parentTitle} > ${suite.title}` : suite.title;

                    // Process specs in this suite
                    for (const spec of suite.specs || []) {
                        for (const test of spec.tests || []) {
                            stepNumber++;
                            // Playwright JSON: results[0].status is 'passed', 'failed', 'skipped', etc.
                            const resultStatus = test.results?.[0]?.status || 'failed';
                            const testStatus = resultStatus === 'passed' ? 'passed' :
                                resultStatus === 'skipped' ? 'skipped' : 'failed';

                            if (testStatus === 'passed') passedCount++;
                            else if (testStatus === 'failed') failedCount++;
                            else if (testStatus === 'skipped') skippedCount++;

                            // Get duration, error, and steps from results
                            const testResult = test.results?.[0];
                            const duration = testResult?.duration || 0;
                            const error = testResult?.error?.message;

                            // Extract sub-steps from the test result
                            const subSteps = (testResult?.steps || []).map((step: any, idx: number) => ({
                                id: `step-${stepNumber}-${idx}`,
                                stepNumber: idx + 1,
                                action: step.title || `Step ${idx + 1}`,
                                description: step.title,
                                status: step.error ? 'failed' : 'passed',
                                duration: step.duration || 0,
                                error: step.error?.message || null,
                            }));

                            // Create ExecutionStep for each test/scenario with sub-steps
                            await executionStepRepository.create({
                                executionId,
                                stepNumber,
                                action: 'scenario',
                                description: spec.title || `Test ${stepNumber}`,
                                status: testStatus as any,
                                duration,
                                error: error || undefined,
                                stepsJson: JSON.stringify(subSteps),
                            });
                        }
                    }

                    // Recursively process nested suites (describe blocks)
                    for (const nestedSuite of suite.suites || []) {
                        await processSuite(nestedSuite, suiteName);
                    }
                };

                // Process all top-level suites
                for (const suite of results.suites || []) {
                    await processSuite(suite);
                }

            }
        } catch {
            // Test results JSON not available or not parseable
        }

        await executionRepository.update(executionId, {
            status: result.status as any,
            exitCode: result.status === 'passed' ? 0 : 1,
            finishedAt: finishTime,
        });

        // Add execution log
        if (result.error) {
            await executionLogRepository.create({
                executionId,
                message: result.error,
                level: 'error',
                timestamp: new Date(),
            });
        }

        // Cleanup temp file
        try {
            await import('fs/promises').then(fs => fs.unlink(tempTestFile));
        } catch {
            // Ignore cleanup errors
        }

        res.json({ success: true, ...result, executionId });
    } catch (error) {
        console.error('Failed to run tests:', error);
        res.status(500).json({ success: false, error: `Failed to run tests: ${error}` });
    }
});

// Debug mode execution - transpiles with debug markers, returns executionId for WebSocket
router.post('/debug', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { filePath, content, breakpoints = [] } = req.body;
        const userId = (req as AuthRequest).userId!;

        // Get Vero content - either from request or read from file
        let veroContent = content;
        if (!veroContent && filePath) {
            const fullPath = join(VERO_PROJECT_PATH, filePath);
            veroContent = await readFile(fullPath, 'utf-8');
        }

        if (!veroContent) {
            return res.status(400).json({ success: false, error: 'No content provided' });
        }

        // Get or create a test flow for this Vero file to track executions
        const flowName = filePath ? filePath.split('/').pop()?.replace('.vero', '') || 'Vero Test' : 'Vero Test';
        let testFlow = await getOrCreateVeroTestFlow(userId, filePath || 'inline', flowName, veroContent);

        // Create execution record with 'pending' status (will be 'running' when WebSocket connects)
        const execution = await executionRepository.create({
            testFlowId: testFlow.id,
            status: 'pending',
            target: 'local',
            triggeredBy: 'debug',
            configSnapshot: JSON.stringify({
                debugMode: true,
                breakpoints,
            }),
        });
        const executionId = execution.id;

        // Extract USE statements and load referenced pages/pageActions
        const useMatches = veroContent.match(/USE\s+(\w+)/gi) || [];
        const pageNames = useMatches.map((m: string) => m.replace(/USE\s+/i, '').trim());
        const projectRoot = filePath ? detectProjectRoot(filePath, VERO_PROJECT_PATH) : VERO_PROJECT_PATH;
        const referencedContent = await loadReferencedPages(pageNames, projectRoot);
        const combinedContent = referencedContent + veroContent;

        // Transpile Vero to Playwright with debug mode
        const { transpileVero } = await import('../services/veroTranspiler');
        const playwrightCode = transpileVero(combinedContent, { debugMode: true });

        // Return executionId and generated code - frontend will connect via WebSocket
        res.json({
            success: true,
            executionId,
            testFlowId: testFlow.id,
            generatedCode: playwrightCode,
            breakpoints,
            message: 'Debug session prepared. Connect via WebSocket to start execution.',
        });
    } catch (error) {
        console.error('Failed to prepare debug session:', error);
        res.status(500).json({ success: false, error: `Failed to prepare debug: ${error}` });
    }
});

// Helper function to get or create a test flow for Vero files
async function getOrCreateVeroTestFlow(userId: string, filePath: string, flowName: string, content: string) {
    // First, get or create a "Vero Tests" workflow for this user
    let workflow = await workflowRepository.findByUserIdAndName(userId, 'Vero Tests');

    if (!workflow) {
        workflow = await workflowRepository.create({
            name: 'Vero Tests',
            userId,
        });
    }

    let testFlow = await testFlowRepository.findByWorkflowIdAndName(workflow.id, flowName);

    if (!testFlow) {
        testFlow = await testFlowRepository.create({
            workflowId: workflow.id,
            name: flowName,
            code: content,
            language: 'vero',
            tags: [],
        });
    } else {
        // Update the code content if it changed
        await testFlowRepository.update(testFlow.id, { code: content });
    }

    return testFlow;
}

// ============= DOCKER EXECUTION =============

// Run Vero file in Docker with VNC for live viewing
router.post('/run-docker', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { filePath, content, config, executionId } = req.body;
        const shardCount = config?.dockerShards || 1;

        // Get Vero content - either from request or read from file
        let veroContent = content;
        if (!veroContent && filePath) {
            const fullPath = join(VERO_PROJECT_PATH, filePath);
            veroContent = await readFile(fullPath, 'utf-8');
        }

        if (!veroContent) {
            return res.status(400).json({ success: false, error: 'No content provided' });
        }

        const { transpileVero } = await import('../services/veroTranspiler');
        const playwrightCode = transpileVero(veroContent);

        // Write test file to sharding-demo folder for Docker to pick up
        const dockerTestDir = join(process.cwd(), '..', 'docker', 'sharding-demo', 'tests');
        const testFileName = `generated-${executionId}.spec.ts`;
        const testFilePath = join(dockerTestDir, testFileName);

        // Ensure directory exists
        if (!existsSync(dockerTestDir)) {
            await mkdir(dockerTestDir, { recursive: true });
        }

        await writeFile(testFilePath, playwrightCode, 'utf-8');

        // Start Docker containers using docker compose
        const dockerComposePath = join(process.cwd(), '..', 'docker', 'worker-vnc', 'docker-compose.yml');
        const services = Array.from({ length: shardCount }, (_, i) => `shard-${i + 1}`).join(' ');

        // Use spawn to run docker compose
        const dockerProcess = spawn(
            '/Applications/Docker.app/Contents/Resources/bin/docker',
            ['compose', '-f', dockerComposePath, 'up', ...services.split(' '), '-d', '--build'],
            {
                cwd: join(process.cwd(), '..'),
                shell: true,
                stdio: 'pipe',
            }
        );

        let dockerOutput = '';
        dockerProcess.stdout?.on('data', (data) => {
            dockerOutput += data.toString();
        });

        dockerProcess.stderr?.on('data', (data) => {
            dockerOutput += data.toString();
        });

        // Wait for docker to start (don't wait for tests to complete)
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                resolve(); // Resolve anyway after timeout
            }, 30000);

            dockerProcess.on('close', (code) => {
                clearTimeout(timeout);
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Docker compose failed with code ${code}`));
                }
            });

            dockerProcess.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });

        res.json({
            success: true,
            executionId,
            shardCount,
            message: `Started ${shardCount} Docker shards`,
            vncPorts: Array.from({ length: shardCount }, (_, i) => 6081 + i),
            generatedCode: playwrightCode
        });

    } catch (error) {
        console.error('[Vero Docker] Failed to start Docker execution:', error);
        res.status(500).json({
            success: false,
            error: `Failed to start Docker execution: ${error}`
        });
    }
});

// Stop Docker execution
router.post('/stop-docker', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { executionId } = req.body;
        const dockerComposePath = join(process.cwd(), '..', 'docker', 'worker-vnc', 'docker-compose.yml');

        const dockerProcess = spawn(
            '/Applications/Docker.app/Contents/Resources/bin/docker',
            ['compose', '-f', dockerComposePath, 'down'],
            {
                cwd: join(process.cwd(), '..'),
                shell: true,
                stdio: 'pipe',
            }
        );

        await new Promise<void>((resolve) => {
            dockerProcess.on('close', () => resolve());
        });

        res.json({ success: true, message: 'Docker execution stopped' });

    } catch (error) {
        console.error('[Vero Docker] Failed to stop Docker execution:', error);
        res.status(500).json({ success: false, error: `Failed to stop: ${error}` });
    }
});

// ============= AI AGENT =============

// Vero Agent Python service URL
const VERO_AGENT_URL = process.env.VERO_AGENT_URL || 'http://localhost:5001';

// Type definitions for agent API responses
interface AgentGenerateResponse {
    vero_code: string;
    new_pages?: Record<string, string>;
    message?: string;
    detail?: string;
}

interface AgentRunResponse {
    success: boolean;
    final_code: string;
    attempts: number;
    message?: string;
    detail?: string;
}

interface AgentHealthResponse {
    status: string;
    llm_provider: string;
    existing_pages: number;
}

interface AgentPagesResponse {
    pages: Record<string, any>;
}

// Generate Vero code from plain English steps
router.post('/agent/generate', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { steps, url, featureName, scenarioName, useAi = true } = req.body;

        if (!steps) {
            return res.status(400).json({ success: false, error: 'Steps are required' });
        }

        // Call the vero-agent Python service
        const response = await fetch(`${VERO_AGENT_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                steps,
                url,
                feature_name: featureName || 'GeneratedFeature',
                scenario_name: scenarioName || 'Generated Scenario',
                use_ai: useAi
            })
        });

        const data = await response.json() as AgentGenerateResponse;

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                error: data.detail || 'Agent generation failed'
            });
        }

        res.json({
            success: true,
            veroCode: data.vero_code,
            newPages: data.new_pages || {},
            message: data.message
        });
    } catch (error) {
        console.error('Failed to generate with agent:', error);
        res.status(500).json({
            success: false,
            error: `Vero Agent not available. Is it running on ${VERO_AGENT_URL}?`
        });
    }
});

// Run Vero code with self-healing (retries up to 20 times)
router.post('/agent/run', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { veroCode, maxRetries } = req.body;

        if (!veroCode) {
            return res.status(400).json({ success: false, error: 'Vero code is required' });
        }

        const response = await fetch(`${VERO_AGENT_URL}/api/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vero_code: veroCode,
                max_retries: maxRetries || 20
            })
        });

        const data = await response.json() as AgentRunResponse;

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                error: data.detail || 'Agent run failed'
            });
        }

        res.json({
            success: data.success,
            finalCode: data.final_code,
            attempts: data.attempts,
            message: data.message
        });
    } catch (error) {
        console.error('Failed to run with agent:', error);
        res.status(500).json({
            success: false,
            error: `Vero Agent not available. Is it running on ${VERO_AGENT_URL}?`
        });
    }
});

// Generate and run in one call
router.post('/agent/generate-and-run', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { steps, url, featureName, scenarioName, maxRetries } = req.body;

        if (!steps) {
            return res.status(400).json({ success: false, error: 'Steps are required' });
        }

        const response = await fetch(`${VERO_AGENT_URL}/api/generate-and-run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                steps,
                url,
                feature_name: featureName || 'GeneratedFeature',
                scenario_name: scenarioName || 'Generated Scenario',
                max_retries: maxRetries || 20
            })
        });

        const data = await response.json() as AgentRunResponse;

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                error: data.detail || 'Agent generate-and-run failed'
            });
        }

        res.json({
            success: data.success,
            finalCode: data.final_code,
            attempts: data.attempts,
            message: data.message
        });
    } catch (error) {
        console.error('Failed to generate-and-run with agent:', error);
        res.status(500).json({
            success: false,
            error: `Vero Agent not available. Is it running on ${VERO_AGENT_URL}?`
        });
    }
});

// Check agent health
router.get('/agent/health', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const response = await fetch(`${VERO_AGENT_URL}/health`);
        const data = await response.json() as AgentHealthResponse;

        res.json({
            success: true,
            agentStatus: data.status,
            llmProvider: data.llm_provider,
            existingPages: data.existing_pages
        });
    } catch (error) {
        res.json({
            success: false,
            agentStatus: 'offline',
            message: `Vero Agent not running on ${VERO_AGENT_URL}`
        });
    }
});

// Get existing page objects from agent
router.get('/agent/pages', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const response = await fetch(`${VERO_AGENT_URL}/api/pages`);
        const data = await response.json() as AgentPagesResponse;
        res.json({ success: true, pages: data.pages });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch pages from agent'
        });
    }
});

// Streaming generation endpoint using Server-Sent Events
router.post('/agent/generate-stream', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { steps, url, featureName, scenarioName, useAi = true } = req.body;

    if (!steps) {
        return res.status(400).json({ success: false, error: 'Steps are required' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const sendEvent = (event: string, data: any) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        sendEvent('start', { message: 'Starting generation...', timestamp: Date.now() });

        // Step 1: Parse English steps
        sendEvent('progress', { step: 'parsing', message: 'Parsing English steps...' });

        // Step 2: Build context from existing pages
        sendEvent('progress', { step: 'context', message: 'Loading existing page objects...' });

        // Step 3: Call the Python agent
        sendEvent('progress', { step: 'generating', message: 'Generating Vero code with AI...' });

        const response = await fetch(`${VERO_AGENT_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                steps,
                url,
                feature_name: featureName || 'GeneratedFeature',
                scenario_name: scenarioName || 'Generated Scenario',
                use_ai: useAi
            })
        });

        const data = await response.json() as AgentGenerateResponse;

        if (!response.ok) {
            sendEvent('error', { error: data.detail || 'Generation failed' });
            res.end();
            return;
        }

        // Step 4: Send the result
        sendEvent('progress', { step: 'complete', message: 'Generation complete!' });
        sendEvent('result', {
            success: true,
            veroCode: data.vero_code,
            newPages: data.new_pages || {},
            message: data.message
        });

        sendEvent('end', { timestamp: Date.now() });
        res.end();
    } catch (error) {
        console.error('Streaming generation error:', error);
        sendEvent('error', {
            error: `Vero Agent not available. Is it running on ${VERO_AGENT_URL}?`
        });
        res.end();
    }
});

// ============= GENERATION HISTORY =============

// In-memory history storage (could be moved to database)
const generationHistory = new Map<string, {
    id: string;
    userId: string;
    steps: string;
    generatedCode: string;
    featureName: string;
    scenarioName: string;
    createdAt: Date;
}[]>();

// Save generation to history
router.post('/agent/history', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }

        const { steps, generatedCode, featureName, scenarioName } = req.body;

        const entry = {
            id: uuidv4(),
            userId,
            steps,
            generatedCode,
            featureName: featureName || 'GeneratedFeature',
            scenarioName: scenarioName || 'Generated Scenario',
            createdAt: new Date()
        };

        const userHistory = generationHistory.get(userId) || [];
        userHistory.unshift(entry); // Add to front (newest first)

        // Keep only last 50 entries per user
        if (userHistory.length > 50) {
            userHistory.pop();
        }

        generationHistory.set(userId, userHistory);

        res.json({ success: true, entry });
    } catch (error) {
        console.error('Failed to save history:', error);
        res.status(500).json({ success: false, error: 'Failed to save history' });
    }
});

// Get generation history
router.get('/agent/history', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }

        const userHistory = generationHistory.get(userId) || [];
        res.json({ success: true, history: userHistory });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
});

// Delete history entry
router.delete('/agent/history/:entryId', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }

        const { entryId } = req.params;
        const userHistory = generationHistory.get(userId) || [];
        const filtered = userHistory.filter(e => e.id !== entryId);
        generationHistory.set(userId, filtered);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete history entry' });
    }
});

// ============= SCENARIO DASHBOARD =============

// Types for scenario index
interface TagSummary {
    name: string;
    count: number;
}

interface ScenarioMeta {
    name: string;
    tags: string[];
    line: number;
    featureName: string;
    filePath: string;
}

interface FeatureWithScenarios {
    name: string;
    filePath: string;
    scenarios: ScenarioMeta[];
}

interface ScenarioIndex {
    totalScenarios: number;
    totalFeatures: number;
    tags: TagSummary[];
    features: FeatureWithScenarios[];
}

// Parse a single .vero file and extract scenarios with metadata
function extractScenariosFromVero(content: string, filePath: string): FeatureWithScenarios | null {
    const lines = content.split('\n');

    // Find feature name
    const featureMatch = content.match(/^feature\s+(\w+)\s*{/im);
    if (!featureMatch) {
        return null;
    }

    const featureName = featureMatch[1];
    const scenarios: ScenarioMeta[] = [];

    // Find all scenarios with tags
    // Pattern: scenario "Name" @tag1 @tag2 {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const scenarioMatch = line.match(/^\s*scenario\s+"([^"]+)"\s*((?:@\w+\s*)*)\s*{/i);

        if (scenarioMatch) {
            const scenarioName = scenarioMatch[1];
            const tagsStr = scenarioMatch[2] || '';
            const tags = (tagsStr.match(/@(\w+)/g) || []).map(t => t.substring(1)); // Remove @ prefix

            scenarios.push({
                name: scenarioName,
                tags,
                line: i + 1, // 1-indexed line number
                featureName,
                filePath
            });
        }
    }

    if (scenarios.length === 0) {
        return null;
    }

    return {
        name: featureName,
        filePath,
        scenarios
    };
}

// Recursively scan for .vero files and extract scenarios
async function scanForScenarios(dirPath: string, relativePath = ''): Promise<FeatureWithScenarios[]> {
    const results: FeatureWithScenarios[] = [];

    try {
        const entries = await readdir(dirPath);

        for (const entry of entries) {
            const fullPath = join(dirPath, entry);
            const relPath = relativePath ? `${relativePath}/${entry}` : entry;
            const stats = await stat(fullPath);

            if (stats.isDirectory()) {
                // Recursively scan subdirectories (especially 'features')
                const subResults = await scanForScenarios(fullPath, relPath);
                results.push(...subResults);
            } else if (entry.endsWith('.vero')) {
                try {
                    const content = await readFile(fullPath, 'utf-8');
                    const feature = extractScenariosFromVero(content, relPath);
                    if (feature) {
                        results.push(feature);
                    }
                } catch (err) {
                    console.warn(`[Vero Scenarios] Failed to read ${relPath}:`, err);
                }
            }
        }
    } catch (err) {
        console.warn(`[Vero Scenarios] Failed to scan ${dirPath}:`, err);
    }

    return results;
}

// GET /api/vero/scenarios - Get all scenarios with tags for the dashboard
router.get('/scenarios', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const projectId = req.query.projectId as string | undefined;
        const veroPathParam = req.query.veroPath as string | undefined;

        const projectPath = await resolveProjectPath(veroPathParam, projectId);

        const fullPath = projectPath.startsWith('/') ? projectPath : join(process.cwd(), projectPath);

        // Check if directory exists
        if (!existsSync(fullPath)) {
            return res.json({
                success: true,
                data: {
                    totalScenarios: 0,
                    totalFeatures: 0,
                    tags: [],
                    features: []
                } as ScenarioIndex
            });
        }

        // Scan all .vero files for scenarios
        const features = await scanForScenarios(fullPath);

        // Build tag summary
        const tagCounts = new Map<string, number>();
        let totalScenarios = 0;

        for (const feature of features) {
            for (const scenario of feature.scenarios) {
                totalScenarios++;
                for (const tag of scenario.tags) {
                    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                }
            }
        }

        // Convert tag counts to sorted array
        const tags: TagSummary[] = Array.from(tagCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count); // Sort by count descending

        const result: ScenarioIndex = {
            totalScenarios,
            totalFeatures: features.length,
            tags,
            features
        };

        console.log(`[Vero Scenarios] Found ${totalScenarios} scenarios in ${features.length} features with ${tags.length} unique tags`);

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[Vero Scenarios] Failed to get scenarios:', error);
        res.status(500).json({ success: false, error: 'Failed to get scenarios' });
    }
});

// ============= VALIDATION =============

// Validate Vero code and return errors/warnings in VeroError format
router.post('/validate', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
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
                // Use the path directly if it's absolute, otherwise resolve relative to vero-projects
                const projectPath = effectiveVeroPath.startsWith('/')
                    ? effectiveVeroPath
                    : join(process.cwd(), 'vero-projects', effectiveVeroPath);

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

            res.json({
                success: validationResult.valid,
                errors: veroErrors,
                warnings: veroWarnings
            });

        } catch (parseError) {
            // Catch any unexpected parsing errors
            console.error('[Vero Validate] Parse error:', parseError);
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
        console.error('[Vero Validate] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate code'
        });
    }
});

// VeroError types for validation endpoint
interface VeroValidationError {
    code: string;
    category: string;
    severity: 'error' | 'warning' | 'info' | 'hint';
    location?: {
        line: number;
        column?: number;
        endLine?: number;
        endColumn?: number;
    };
    title: string;
    whatWentWrong: string;
    howToFix: string;
    suggestions: Array<{ text: string; action?: string }>;
    veroStatement?: string;
    selector?: string;
}

// Helper functions for error code mapping
function getParserErrorCode(message: string): string {
    if (message.includes('Expected') && message.includes('{')) return 'VERO-202';
    if (message.includes('Expected') && message.includes('}')) return 'VERO-202';
    if (message.includes('Expected') && message.includes('string')) return 'VERO-204';
    if (message.includes('Expected') && message.includes('name')) return 'VERO-205';
    if (message.includes('Unexpected token')) return 'VERO-206';
    if (message.includes('Missing')) return 'VERO-201';
    return 'VERO-203';
}

function getParserErrorTitle(message: string): string {
    if (message.includes('Expected') && message.includes('{')) return 'Missing Opening Brace';
    if (message.includes('Expected') && message.includes('}')) return 'Missing Closing Brace';
    if (message.includes('Expected') && message.includes('string')) return 'Missing String';
    if (message.includes('Expected') && message.includes('name')) return 'Missing Name';
    if (message.includes('Unexpected token')) return 'Unexpected Token';
    if (message.includes('Missing')) return 'Missing Keyword';
    return 'Invalid Statement';
}

function getParserErrorFix(message: string): string {
    if (message.includes('{')) return 'Add an opening brace "{" after the declaration.';
    if (message.includes('}')) return 'Add a closing brace "}" to end the block.';
    if (message.includes('string')) return 'Add a quoted string (e.g., "example").';
    if (message.includes('name')) return 'Provide a name for this element.';
    return 'Check the syntax at this location.';
}

function getValidationErrorCode(message: string): string {
    if (message.includes('Duplicate page')) return 'VERO-303';
    if (message.includes('Duplicate field')) return 'VERO-303';
    if (message.includes('not defined')) return 'VERO-301';
    if (message.includes('not in USE list')) return 'VERO-304';
    return 'VERO-302';
}

function getValidationErrorTitle(message: string): string {
    if (message.includes('Duplicate page')) return 'Duplicate Page Definition';
    if (message.includes('Duplicate field')) return 'Duplicate Field Definition';
    if (message.includes('not defined')) return 'Undefined Reference';
    if (message.includes('not in USE list')) return 'Missing Import';
    return 'Validation Error';
}

function getValidationErrorFix(message: string): string {
    if (message.includes('Duplicate')) return 'Remove or rename the duplicate definition.';
    if (message.includes('not defined')) return 'Define this element before using it, or check the spelling.';
    if (message.includes('not in USE list')) return 'Add a USE statement at the top of the feature.';
    return 'Fix the validation issue.';
}

// ============= LSP ENDPOINTS =============

// Go to Definition - Find symbol definition
router.post('/definition', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { filePath, line, column, word } = req.body;

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
        console.error('[Vero Definition] Error:', error);
        res.status(500).json({ success: false, error: 'Failed to find definition' });
    }
});

// Find References - Find all usages of a symbol
router.post('/references', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { filePath, line, column, word, includeDeclaration } = req.body;

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
        console.error('[Vero References] Error:', error);
        res.status(500).json({ success: false, error: 'Failed to find references' });
    }
});

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

// ============= HELPERS =============

interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileNode[];
}

async function scanDirectory(dirPath: string, relativePath = ''): Promise<FileNode[]> {
    const entries = await readdir(dirPath);
    const result: FileNode[] = [];

    for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const relPath = relativePath ? `${relativePath}/${entry}` : entry;
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
            // Scan environment folders (master, dev, sandboxes) and content folders (pages, features, pageactions)
            const lowerEntry = entry.toLowerCase();
            const isEnvironmentFolder = lowerEntry === 'master' || lowerEntry === 'dev' || lowerEntry === 'sandboxes';
            const isContentFolder = lowerEntry === 'pages' || lowerEntry === 'features' || lowerEntry === 'pageactions';
            const isSandboxFolder = relativePath.startsWith('sandboxes/') || relativePath === 'sandboxes';

            if (isEnvironmentFolder || isContentFolder || relativePath) {
                const children = await scanDirectory(fullPath, relPath);
                result.push({
                    name: entry,
                    path: relPath,
                    type: 'directory',
                    children,
                });
            }
        } else if (entry.endsWith('.vero')) {
            result.push({
                name: entry,
                path: relPath,
                type: 'file',
            });
        }
    }

    return result;
}

export default router;

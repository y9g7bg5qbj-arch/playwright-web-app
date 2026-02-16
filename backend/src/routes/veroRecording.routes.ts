import { Router, Response, NextFunction } from 'express';
import { ChildProcess, spawn } from 'child_process';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { watch, FSWatcher } from 'fs';
import { tmpdir } from 'os';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

// Active recording sessions with full state tracking
export const activeRecordings = new Map<string, {
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

// Helper to generate unique temp file path for Vero recording
function getVeroTempFilePath(sessionId: string): string {
    return join(tmpdir(), `vero-recording-${sessionId}.ts`);
}

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

const recordingRouter = Router();

// Start recording session with Playwright codegen
recordingRouter.post('/recording/start', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
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
        logger.error('Failed to start recording:', error);
        res.status(500).json({ success: false, error: 'Failed to start recording' });
    }
});

// Get recording status and code
recordingRouter.get('/recording/code/:sessionId', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
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
recordingRouter.post('/recording/pause', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
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
recordingRouter.post('/recording/stop', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
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
        logger.error('Failed to stop recording:', error);
        res.status(500).json({ success: false, error: 'Failed to stop recording' });
    }
});

export { recordingRouter as veroRecordingRouter };

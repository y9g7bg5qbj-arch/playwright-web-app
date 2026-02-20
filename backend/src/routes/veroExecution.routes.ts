import { Router, Response } from 'express';
import { spawn } from 'child_process';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { VERO_PROJECT_PATH, confineToBase, resolveProjectPath } from './veroProjectPath.utils';
import { shouldWriteLegacyDockerSpec } from './veroRunExecution.utils';
import { applicationRepository, executionRepository, projectRepository } from '../db/repositories/mongo';
import { getOrCreateVeroTestFlow } from '../services/testFlow.utils';
import { detectProjectRoot, loadReferencedPages } from './veroExecution.utils';
import { logger } from '../utils/logger';
import { executeVeroRun, VeroRunValidationError, VeroRunSelectionError, type VeroRunInput } from '../services/veroRunService';

const executionRouter = Router();

function normalizeScopeId(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

async function resolveExecutionScope(rawApplicationId: unknown, rawProjectId: unknown): Promise<{
    applicationId?: string;
    projectId?: string;
    runtimeProjectId?: string;
}> {
    let applicationId = normalizeScopeId(rawApplicationId);
    let projectId = normalizeScopeId(rawProjectId);

    if (projectId) {
        const nestedProject = await projectRepository.findById(projectId);
        if (nestedProject) {
            projectId = nestedProject.id;
            if (!applicationId || applicationId !== nestedProject.applicationId) {
                applicationId = nestedProject.applicationId;
            }
        } else {
            const application = await applicationRepository.findById(projectId);
            if (application) {
                if (!applicationId) {
                    applicationId = application.id;
                }
                projectId = undefined;
            }
        }
    }

    // Legacy payloads sent applicationId as "projectId".
    if (!applicationId && projectId) {
        applicationId = projectId;
        projectId = undefined;
    }

    return {
        applicationId,
        projectId,
        // Preserve historical runtime behavior where project context defaulted
        // to the selected application when no nested project was provided.
        runtimeProjectId: projectId || applicationId,
    };
}

// Run Vero file - transpiles to Playwright and executes
executionRouter.post('/run', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const { filePath, content, config, scenarioName, projectId, applicationId } = req.body;
        const userId = (req as AuthRequest).userId!;
        const executionScope = await resolveExecutionScope(applicationId, projectId);

        // Get or create a test flow for this Vero file to track executions
        const flowName = filePath ? filePath.split('/').pop()?.replace('.vero', '') || 'Vero Test' : 'Vero Test';
        const veroContent = content || (filePath
            ? await readFile(confineToBase(VERO_PROJECT_PATH, filePath), 'utf-8')
            : null);
        if (!veroContent) {
            return res.status(400).json({ success: false, error: 'No content provided' });
        }
        const testFlow = await getOrCreateVeroTestFlow(
            userId,
            filePath || 'inline',
            flowName,
            veroContent,
            'Vero Tests',
            executionScope.applicationId
        );

        // Create execution record with 'running' status
        const execution = await executionRepository.create({
            testFlowId: testFlow.id,
            applicationId: executionScope.applicationId,
            projectId: executionScope.projectId,
            status: 'running',
            target: 'local',
            triggeredBy: 'manual',
            startedAt: new Date(),
            configSnapshot: JSON.stringify({
                browserMode: config?.browserMode || 'headed',
                workers: config?.workers || 1,
            }),
        });
        const executionId = execution.id;

        // Extract auth token from request headers
        const authHeader = req.headers.authorization;
        const authToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

        // Build service input — the frontend sends envVars inside config,
        // which maps to customEnvVars in the merged env var model
        const runInput: VeroRunInput = {
            filePath,
            content,
            executionId,
            userId,
            projectId: executionScope.runtimeProjectId,
            applicationId: executionScope.applicationId,
            triggeredBy: 'manual',
            config,
            scenarioName,
            selection: config,
            customEnvVars: config?.envVars,
            authToken,
        };

        const result = await executeVeroRun(runInput);

        res.json({
            success: true,
            ...result,
            executionId,
            selection: result.selectionDiagnostics,
        });
    } catch (error) {
        if (error instanceof VeroRunValidationError) {
            return res.status(400).json({
                success: false,
                status: 'failed',
                error: error.message,
                errors: error.errors,
            });
        }
        if (error instanceof VeroRunSelectionError) {
            const normalizedMessage = error.message.toLowerCase();
            const errorCode = normalizedMessage.includes('no scenarios matched')
                ? 'VERO-SELECTION-NO-MATCH'
                : normalizedMessage.includes('invalid tag expression') ||
                  normalizedMessage.includes("expected ')'") ||
                  normalizedMessage.includes('unexpected character')
                    ? 'VERO-SELECTION-INVALID-EXPRESSION'
                    : 'VERO-SELECTION-FAILED';
            return res.status(400).json({
                success: false,
                status: 'failed',
                errorCode,
                diagnostics: {
                    phase: 'selection',
                    selection: error.selection,
                    detail: error.message,
                    selectionSummary: error.diagnostics,
                },
                error: `Scenario selection prevented execution:\n${error.message}`,
            });
        }
        logger.error('Failed to run tests:', error);
        res.status(500).json({ success: false, error: `Failed to run tests: ${error}` });
    }
});

// Debug mode execution - transpiles with debug markers, returns executionId for WebSocket
executionRouter.post('/debug', authenticateToken, async (req: AuthRequest, res: Response) => {
    let executionId: string | undefined;
    try {
        const { filePath, content, breakpoints = [], projectId, applicationId } = req.body;
        const userId = (req as AuthRequest).userId!;
        const executionScope = await resolveExecutionScope(applicationId, projectId);

        // Resolve project-aware base path early — needed for both file reads
        // and USE-statement resolution. Falls back to VERO_PROJECT_PATH when
        // no projectId is available, with a warning for diagnostics.
        let resolvedBase: string;
        if (executionScope.projectId || executionScope.applicationId) {
            resolvedBase = await resolveProjectPath(undefined, executionScope.runtimeProjectId);
        } else {
            logger.warn('[debug:prepare] No projectId in request — falling back to VERO_PROJECT_PATH');
            resolvedBase = VERO_PROJECT_PATH;
        }

        // Get Vero content - either from request or read from file
        let veroContent = content;
        if (!veroContent && filePath) {
            veroContent = await readFile(confineToBase(resolvedBase, filePath), 'utf-8');
        }

        if (!veroContent) {
            return res.status(400).json({ success: false, error: 'No content provided' });
        }

        // Get or create a test flow for this Vero file to track executions
        const flowName = filePath ? filePath.split('/').pop()?.replace('.vero', '') || 'Vero Test' : 'Vero Test';
        let testFlow = await getOrCreateVeroTestFlow(
            userId,
            filePath || 'inline',
            flowName,
            veroContent,
            'Vero Tests',
            executionScope.applicationId
        );

        // Create execution record with 'pending' status (will be 'running' when WebSocket connects)
        const execution = await executionRepository.create({
            testFlowId: testFlow.id,
            applicationId: executionScope.applicationId,
            projectId: executionScope.projectId,
            status: 'pending',
            target: 'local',
            triggeredBy: 'debug',
            configSnapshot: JSON.stringify({
                debugMode: true,
                breakpoints,
            }),
        });
        executionId = execution.id;

        // Extract USE statements and load referenced pages/pageActions
        const useMatches = veroContent.match(/USE\s+(\w+)/gi) || [];
        const pageNames = useMatches.map((m: string) => m.replace(/USE\s+/i, '').trim());
        const confinedFilePath = filePath ? confineToBase(resolvedBase, filePath) : undefined;
        const projectRoot = confinedFilePath ? detectProjectRoot(confinedFilePath, resolvedBase) : resolvedBase;
        const referencedContent = await loadReferencedPages(pageNames, projectRoot);

        // IMPORTANT: active file goes first so its AST line numbers match
        // the editor's breakpoint line numbers (no offset from prepended content).
        const combinedContent = referencedContent
            ? veroContent + '\n\n' + referencedContent
            : veroContent;

        const normalizedBreakpoints = Array.isArray(breakpoints) ? breakpoints : [];
        logger.info('[debug:prepare]', { filePath, breakpointCount: normalizedBreakpoints.length, hasRefs: referencedContent.length > 0 });

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
        // Mark the execution as failed if one was already created, to avoid
        // orphaned 'pending' records that never transition to a terminal state.
        if (typeof executionId === 'string') {
            try {
                await executionRepository.update(executionId, { status: 'failed', finishedAt: new Date() });
            } catch { /* best-effort cleanup */ }
        }
        logger.error('Failed to prepare debug session:', error);
        res.status(500).json({ success: false, error: `Failed to prepare debug: ${error}` });
    }
});

// Run Vero file in Docker with VNC for live viewing
executionRouter.post('/run-docker', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const { filePath, content, config, executionId: rawExecutionId } = req.body;
        // Validate executionId format to prevent injection in filenames and shell args
        const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
        if (typeof rawExecutionId !== 'string' || !UUID_RE.test(rawExecutionId)) {
            return res.status(400).json({ success: false, error: 'Invalid executionId format' });
        }
        const executionId = rawExecutionId;
        const rawShards = typeof config?.dockerShards === 'number' ? config.dockerShards : 1;
        const shardCount = Math.min(Math.max(Math.floor(rawShards), 1), 20);

        // Get Vero content - either from request or read from file
        let veroContent = content;
        if (!veroContent && filePath) {
            veroContent = await readFile(confineToBase(VERO_PROJECT_PATH, filePath), 'utf-8');
        }

        if (!veroContent) {
            return res.status(400).json({ success: false, error: 'No content provided' });
        }

        const { transpileVero } = await import('../services/veroTranspiler');
        const playwrightCode = transpileVero(veroContent);

        // Write test file to sharding-demo folder for Docker to pick up
        const dockerRootDir = join(process.cwd(), '..', 'docker', 'sharding-demo');
        const dockerTestDir = join(dockerRootDir, 'tests');
        const testFileName = `generated-${executionId}.spec.mts`;
        const testFilePath = join(dockerTestDir, testFileName);
        const dockerPlaywrightConfigPath = join(dockerRootDir, 'playwright.config.ts');

        // Ensure directory exists
        if (!existsSync(dockerTestDir)) {
            await mkdir(dockerTestDir, { recursive: true });
        }

        await writeFile(testFilePath, playwrightCode, 'utf-8');
        const writeLegacyDockerSpec = await shouldWriteLegacyDockerSpec(dockerPlaywrightConfigPath);
        if (writeLegacyDockerSpec) {
            const legacyTestFilePath = join(dockerTestDir, `generated-${executionId}.spec.ts`);
            await writeFile(legacyTestFilePath, playwrightCode, 'utf-8');
        }

        // Start Docker containers using docker compose
        const dockerComposePath = join(process.cwd(), '..', 'docker', 'worker-vnc', 'docker-compose.yml');
        const services = Array.from({ length: shardCount }, (_, i) => `shard-${i + 1}`).join(' ');

        // Use spawn to run docker compose
        const dockerProcess = spawn(
            'docker',
            ['compose', '-f', dockerComposePath, 'up', ...services.split(' '), '-d', '--build'],
            {
                cwd: join(process.cwd(), '..'),
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
        logger.error('[Vero Docker] Failed to start Docker execution:', error);
        res.status(500).json({
            success: false,
            error: `Failed to start Docker execution: ${error}`
        });
    }
});

// Stop Docker execution
executionRouter.post('/stop-docker', authenticateToken, async (_req: AuthRequest, res: Response) => {
    try {
        const dockerComposePath = join(process.cwd(), '..', 'docker', 'worker-vnc', 'docker-compose.yml');

        const dockerProcess = spawn(
            'docker',
            ['compose', '-f', dockerComposePath, 'down'],
            {
                cwd: join(process.cwd(), '..'),
                stdio: 'pipe',
            }
        );

        await new Promise<void>((resolve) => {
            dockerProcess.on('close', () => resolve());
        });

        res.json({ success: true, message: 'Docker execution stopped' });

    } catch (error) {
        logger.error('[Vero Docker] Failed to stop Docker execution:', error);
        res.status(500).json({ success: false, error: `Failed to stop: ${error}` });
    }
});

export { executionRouter as veroExecutionRouter };

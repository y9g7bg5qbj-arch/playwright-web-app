/**
 * Execution Engine API Routes
 * Extended routes for the Vero test automation execution engine
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { executionEngine, ExecutionOptions, DEFAULT_EXECUTION_OPTIONS } from '../services/execution';
import { artifactManager } from '../services/artifacts';
import { resultManager } from '../services/results';
import { traceServer, traceAnalyzer } from '../services/traceViewer';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';

const router = Router();

// CORS preflight for trace files
router.options('/artifacts/*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
});

// ========================================
// Test Execution Routes
// ========================================

/**
 * POST /api/execution/run
 * Start test execution
 */
router.post(
    '/run',
    authenticateToken,
    validate([
        body('tests').isArray().withMessage('Tests must be an array'),
        body('options').optional().isObject().withMessage('Options must be an object'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { tests, options } = req.body;

            // Merge with default options
            const executionOptions: ExecutionOptions = {
                ...DEFAULT_EXECUTION_OPTIONS,
                ...options,
            };

            // Initialize engine if needed
            await executionEngine.initialize();

            // Generate run ID
            const runId = require('uuid').v4();

            // Start execution in background
            if (tests.length === 1) {
                // Single test
                executionEngine.runTest(tests[0], executionOptions)
                    .then(result => {
                        resultManager.saveResult(result);
                    })
                    .catch(err => {
                        logger.error('Test execution failed:', err);
                    });
            } else {
                // Multiple tests - use async generator
                (async () => {
                    for await (const result of executionEngine.runSuite(tests, executionOptions)) {
                        await resultManager.saveResult(result);
                    }
                })().catch(err => {
                    logger.error('Suite execution failed:', err);
                });
            }

            res.json({
                success: true,
                data: {
                    runId,
                    status: 'started',
                    testCount: tests.length,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/execution/:runId/status
 * Get execution status
 */
router.get(
    '/:runId/status',
    authenticateToken,
    validate([
        param('runId').isUUID().withMessage('Invalid run ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { runId } = req.params;
            const status = executionEngine.getExecutionStatus(runId);

            if (!status) {
                // Try to get from result manager
                const summary = await resultManager.getRunSummary(runId);
                if (summary) {
                    res.json({
                        success: true,
                        data: {
                            runId,
                            status: 'completed',
                            summary,
                        },
                    });
                    return;
                }

                res.status(404).json({
                    success: false,
                    error: 'Execution not found',
                });
                return;
            }

            res.json({
                success: true,
                data: status,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/execution/:runId/cancel
 * Cancel running execution
 */
router.post(
    '/:runId/cancel',
    authenticateToken,
    validate([
        param('runId').isUUID().withMessage('Invalid run ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { runId } = req.params;
            await executionEngine.cancelExecution(runId);

            res.json({
                success: true,
                message: 'Execution cancelled',
            });
        } catch (error) {
            next(error);
        }
    }
);

// ========================================
// Results Routes
// ========================================

/**
 * GET /api/execution/results/:runId
 * Get all results for a run
 */
router.get(
    '/results/:runId',
    authenticateToken,
    validate([
        param('runId').isUUID().withMessage('Invalid run ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { runId } = req.params;
            const results = await resultManager.getResultsForRun(runId);

            res.json({
                success: true,
                data: results,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/execution/results/:runId/:testId
 * Get specific test result
 */
router.get(
    '/results/:runId/:testId',
    authenticateToken,
    validate([
        param('runId').isUUID().withMessage('Invalid run ID'),
        param('testId').isUUID().withMessage('Invalid test ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { testId } = req.params;
            const result = await resultManager.getResult(testId);

            if (!result) {
                res.status(404).json({
                    success: false,
                    error: 'Result not found',
                });
                return;
            }

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/execution/results/history/:testFile
 * Get test history
 */
router.get(
    '/results/history/:testFile(*)',
    authenticateToken,
    validate([
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const testFile = req.params.testFile;
            const limit = parseInt(req.query.limit as string) || 50;

            const history = await resultManager.getHistory(testFile, limit);

            res.json({
                success: true,
                data: history,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/execution/results/:runId/failures
 * Get failures for a run
 */
router.get(
    '/results/:runId/failures',
    authenticateToken,
    validate([
        param('runId').isUUID().withMessage('Invalid run ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { runId } = req.params;
            const failures = await resultManager.getFailures(runId);

            res.json({
                success: true,
                data: failures,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/execution/flaky
 * Get flaky tests
 */
router.get(
    '/flaky',
    authenticateToken,
    validate([
        query('from').optional().isISO8601().withMessage('Invalid from date'),
        query('to').optional().isISO8601().withMessage('Invalid to date'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const from = req.query.from
                ? new Date(req.query.from as string)
                : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);  // Default: last 30 days
            const to = req.query.to
                ? new Date(req.query.to as string)
                : new Date();

            const flakyTests = await resultManager.getFlaky({ from, to });

            res.json({
                success: true,
                data: flakyTests,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/execution/trends/:testFile
 * Get test trends
 */
router.get(
    '/trends/:testFile(*)',
    authenticateToken,
    validate([
        query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be 1-365'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const testFile = req.params.testFile;
            const days = parseInt(req.query.days as string) || 30;

            const trends = await resultManager.getTrends(testFile, days);

            res.json({
                success: true,
                data: trends,
            });
        } catch (error) {
            next(error);
        }
    }
);

// ========================================
// Artifacts Routes
// ========================================

/**
 * GET /api/execution/artifacts/:artifactId
 * Download artifact
 */
router.get(
    '/artifacts/:artifactId',
    validate([
        param('artifactId').isUUID().withMessage('Invalid artifact ID'),
    ]),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { artifactId } = req.params;
            const artifactRef = artifactManager.getArtifactRefById(artifactId);

            if (!artifactRef) {
                res.status(404).json({
                    success: false,
                    error: 'Artifact not found',
                });
                return;
            }

            const data = await artifactManager.getArtifact(artifactRef);

            res.setHeader('Content-Type', artifactRef.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${artifactRef.name}"`);
            res.setHeader('Content-Length', data.length);
            res.send(data);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/execution/artifacts/:artifactId/stream
 * Stream artifact (for videos)
 */
router.get(
    '/artifacts/:artifactId/stream',
    validate([
        param('artifactId').isUUID().withMessage('Invalid artifact ID'),
    ]),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { artifactId } = req.params;
            const artifactRef = artifactManager.getArtifactRefById(artifactId);

            if (!artifactRef) {
                res.status(404).json({
                    success: false,
                    error: 'Artifact not found',
                });
                return;
            }

            res.setHeader('Content-Type', artifactRef.mimeType);
            res.setHeader('Accept-Ranges', 'bytes');

            const stream = artifactManager.getArtifactStream(artifactRef);
            stream.pipe(res);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/execution/artifacts/test/:testId
 * Get all artifacts for a test
 */
router.get(
    '/artifacts/test/:testId',
    authenticateToken,
    validate([
        param('testId').isUUID().withMessage('Invalid test ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { testId } = req.params;
            const artifacts = await artifactManager.getArtifactsForTest(testId);

            res.json({
                success: true,
                data: artifacts,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * DELETE /api/execution/artifacts/:artifactId
 * Delete an artifact
 */
router.delete(
    '/artifacts/:artifactId',
    authenticateToken,
    validate([
        param('artifactId').isUUID().withMessage('Invalid artifact ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { artifactId } = req.params;
            const artifactRef = artifactManager.getArtifactRefById(artifactId);

            if (!artifactRef) {
                res.status(404).json({
                    success: false,
                    error: 'Artifact not found',
                });
                return;
            }

            await artifactManager.deleteArtifact(artifactRef);

            res.json({
                success: true,
                message: 'Artifact deleted',
            });
        } catch (error) {
            next(error);
        }
    }
);

// ========================================
// Trace Viewer Routes
// ========================================

/**
 * GET /api/execution/trace/:traceId/view
 * Get trace viewer URL
 */
router.get(
    '/trace/:traceId/view',
    validate([
        param('traceId').isUUID().withMessage('Invalid trace ID'),
    ]),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { traceId } = req.params;
            const artifactRef = artifactManager.getArtifactRefById(traceId);

            if (!artifactRef || artifactRef.type !== 'trace') {
                res.status(404).json({
                    success: false,
                    error: 'Trace not found',
                });
                return;
            }

            const viewerUrl = traceServer.getTraceViewerUrl(artifactRef);

            res.json({
                success: true,
                data: {
                    viewerUrl,
                    traceId,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/execution/trace/:traceId/launch
 * Launch local trace viewer
 */
router.post(
    '/trace/:traceId/launch',
    authenticateToken,
    validate([
        param('traceId').isUUID().withMessage('Invalid trace ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { traceId } = req.params;
            const artifactRef = artifactManager.getArtifactRefById(traceId);

            if (!artifactRef || artifactRef.type !== 'trace') {
                res.status(404).json({
                    success: false,
                    error: 'Trace not found',
                });
                return;
            }

            const result = await traceServer.launchLocalViewer(artifactRef);

            res.json({
                success: result.success,
                message: result.message,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/execution/trace/:traceId/analyze
 * Analyze a trace
 */
router.get(
    '/trace/:traceId/analyze',
    authenticateToken,
    validate([
        param('traceId').isUUID().withMessage('Invalid trace ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { traceId } = req.params;
            const artifactRef = artifactManager.getArtifactRefById(traceId);

            if (!artifactRef || artifactRef.type !== 'trace') {
                res.status(404).json({
                    success: false,
                    error: 'Trace not found',
                });
                return;
            }

            // Get trace data
            const traceBuffer = await artifactManager.getArtifact(artifactRef);
            const traceData = await traceServer.parseTrace(traceBuffer);

            // Analyze
            const failureInfo = traceAnalyzer.getFailurePoint(traceData);
            const slowActions = traceAnalyzer.getSlowActions(traceData);
            const networkStats = traceAnalyzer.getNetworkStats(traceData);
            const performanceSummary = traceAnalyzer.getPerformanceSummary(traceData);
            const consoleSummary = traceAnalyzer.getConsoleSummary(traceData);

            res.json({
                success: true,
                data: {
                    traceId,
                    failure: failureInfo,
                    slowActions,
                    networkStats,
                    performance: performanceSummary,
                    console: consoleSummary,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

// ========================================
// Reports Routes
// ========================================

/**
 * GET /api/execution/reports/:runId/junit
 * Export JUnit XML report
 */
router.get(
    '/reports/:runId/junit',
    authenticateToken,
    validate([
        param('runId').isUUID().withMessage('Invalid run ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { runId } = req.params;
            const xml = await resultManager.exportToJUnit(runId);

            res.setHeader('Content-Type', 'application/xml');
            res.setHeader('Content-Disposition', `attachment; filename="junit-report-${runId}.xml"`);
            res.send(xml);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/execution/reports/:runId/html
 * Export HTML report
 */
router.get(
    '/reports/:runId/html',
    authenticateToken,
    validate([
        param('runId').isUUID().withMessage('Invalid run ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { runId } = req.params;
            const html = await resultManager.exportToHTML(runId);

            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/execution/reports/:runId/summary
 * Get run summary
 */
router.get(
    '/reports/:runId/summary',
    authenticateToken,
    validate([
        param('runId').isUUID().withMessage('Invalid run ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { runId } = req.params;
            const summary = await resultManager.getRunSummary(runId);

            if (!summary) {
                res.status(404).json({
                    success: false,
                    error: 'Run not found',
                });
                return;
            }

            res.json({
                success: true,
                data: summary,
            });
        } catch (error) {
            next(error);
        }
    }
);

// ========================================
// Health & Admin Routes
// ========================================

/**
 * GET /api/execution/health
 * Get execution engine health
 */
router.get('/health', async (req: Request, res: Response) => {
    const artifactStats = await artifactManager.getStorageStats();
    const cacheStats = resultManager.getCacheStats();
    const traceStats = traceServer.getStats();

    res.json({
        success: true,
        data: {
            status: 'healthy',
            artifacts: artifactStats,
            cache: cacheStats,
            traces: traceStats,
        },
    });
});

/**
 * POST /api/execution/cleanup
 * Clean up old artifacts
 */
router.post(
    '/cleanup',
    authenticateToken,
    validate([
        body('olderThanDays').isInt({ min: 1 }).withMessage('olderThanDays must be a positive integer'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { olderThanDays } = req.body;
            const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

            const deletedCount = await artifactManager.cleanup(cutoffDate);

            res.json({
                success: true,
                data: {
                    deletedCount,
                    cutoffDate,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

export { router as executionEngineRoutes };

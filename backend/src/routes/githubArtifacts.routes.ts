/**
 * GitHub Artifacts & Reports Routes
 * Endpoints for listing/downloading artifacts, opening traces,
 * and fetching parsed test reports from workflow runs.
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { githubService } from '../services/github.service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================
// ARTIFACTS
// ============================================

/**
 * GET /api/github/runs/:runId/artifacts
 * List artifacts for a workflow run
 */
router.get(
  '/runs/:runId/artifacts',
  authenticateToken,
  validate([
    param('runId').isInt().withMessage('Run ID must be an integer'),
    query('owner').isString().notEmpty().withMessage('Owner is required'),
    query('repo').isString().notEmpty().withMessage('Repo is required'),
  ]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { runId } = req.params;
    const { owner, repo } = req.query;

    const artifacts = await githubService.listArtifacts(
      req.userId!,
      owner as string,
      repo as string,
      parseInt(runId, 10)
    );

    res.json({
      success: true,
      data: artifacts.map((artifact) => ({
        id: artifact.id,
        name: artifact.name,
        sizeInBytes: artifact.size_in_bytes,
        expired: artifact.expired,
        createdAt: artifact.created_at,
        expiresAt: artifact.expires_at,
      })),
    });
  })
);

/**
 * GET /api/github/artifacts/:artifactId/download
 * Download an artifact
 */
router.get(
  '/artifacts/:artifactId/download',
  authenticateToken,
  validate([
    param('artifactId').isInt().withMessage('Artifact ID must be an integer'),
    query('owner').isString().notEmpty().withMessage('Owner is required'),
    query('repo').isString().notEmpty().withMessage('Repo is required'),
  ]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { artifactId } = req.params;
    const { owner, repo } = req.query;

    const buffer = await githubService.downloadArtifact(
      req.userId!,
      owner as string,
      repo as string,
      parseInt(artifactId, 10)
    );

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=artifact-${artifactId}.zip`);
    res.send(buffer);
  })
);

/**
 * POST /api/github/runs/:runId/trace/open
 * Download trace artifact and launch Playwright Trace Viewer
 */
router.post(
  '/runs/:runId/trace/open',
  authenticateToken,
  validate([
    param('runId').isInt().withMessage('Run ID must be an integer'),
    body('owner').isString().notEmpty().withMessage('Owner is required'),
    body('repo').isString().notEmpty().withMessage('Repo is required'),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { runId } = req.params;
      const { owner, repo } = req.body;
      const AdmZip = require('adm-zip');
      const { spawn } = require('child_process');
      const path = require('path');
      const fs = require('fs');
      const os = require('os');

      logger.info(`[TraceViewer] Opening trace for run ${runId}, owner=${owner}, repo=${repo}`);

      // Get artifacts for this run
      const artifacts = await githubService.listArtifacts(
        req.userId!,
        owner as string,
        repo as string,
        parseInt(runId, 10)
      );

      // Find trace artifact (usually named 'playwright-trace' or contains 'trace')
      const traceArtifact = artifacts.find((a) =>
        a.name.includes('trace') ||
        a.name.includes('playwright-trace') ||
        a.name.includes('test-results')
      );

      if (!traceArtifact) {
        res.status(404).json({
          success: false,
          error: 'No trace artifact found for this run',
        });
        return;
      }

      logger.info(`[TraceViewer] Found trace artifact: ${traceArtifact.name} (${traceArtifact.id})`);

      // Download the artifact
      const buffer = await githubService.downloadArtifact(
        req.userId!,
        owner as string,
        repo as string,
        traceArtifact.id
      );

      // Create temp directory for traces
      const tempDir = path.join(os.tmpdir(), 'vero-traces', `run-${runId}`);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Extract the artifact
      const zip = new AdmZip(buffer);
      zip.extractAllTo(tempDir, true);

      logger.info(`[TraceViewer] Extracted traces to ${tempDir}`);

      // Find .zip trace files (Playwright traces are .zip files within the artifact)
      const findTraceFiles = (dir: string): string[] => {
        const files: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            files.push(...findTraceFiles(fullPath));
          } else if (entry.name.endsWith('.zip') && entry.name.includes('trace')) {
            files.push(fullPath);
          }
        }
        return files;
      };

      const traceFiles = findTraceFiles(tempDir);

      if (traceFiles.length === 0) {
        // Check for trace.zip specifically (may not have 'trace' in parent dir name)
        const directTrace = path.join(tempDir, 'trace.zip');
        if (fs.existsSync(directTrace)) {
          traceFiles.push(directTrace);
        }
      }

      if (traceFiles.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No trace files found in artifact. Ensure tracing is enabled in your run configuration.',
        });
        return;
      }

      const traceFile = traceFiles[0];

      logger.info(`[TraceViewer] Launching trace viewer for: ${traceFile}`);

      // Launch Playwright Trace Viewer
      const child = spawn('npx', ['playwright', 'show-trace', traceFile], {
        detached: true,
        stdio: 'ignore',
        cwd: process.cwd(),
      });

      // Detach the child process so it runs independently
      child.unref();

      res.json({
        success: true,
        message: 'Trace Viewer launched',
        data: {
          tracePath: traceFile,
          traceFiles: traceFiles,
        },
      });
    } catch (error) {
      logger.error(`[TraceViewer] Error: ${error}`);
      next(error);
    }
  }
);

/**
 * GET /api/github/runs/:runId/report
 * Get parsed test report from a workflow run's artifacts
 */
router.get(
  '/runs/:runId/report',
  authenticateToken,
  validate([
    param('runId').isInt().withMessage('Run ID must be an integer'),
    query('owner').isString().notEmpty().withMessage('Owner is required'),
    query('repo').isString().notEmpty().withMessage('Repo is required'),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { runId } = req.params;
      const { owner, repo } = req.query;
      const AdmZip = require('adm-zip');

      logger.info(`[GitHub Report] Fetching report for run ${runId}, owner=${owner}, repo=${repo}`);

      // Get artifacts for this run
      const artifacts = await githubService.listArtifacts(
        req.userId!,
        owner as string,
        repo as string,
        parseInt(runId, 10)
      );

      // Find the JSON results artifact first, then fall back to HTML report
      // Prioritize test-results (contains JSON) over playwright-report (HTML only)
      const reportArtifact = artifacts.find((a) => a.name.includes('test-results-shard'))
        || artifacts.find((a) => a.name.includes('test-results'))
        || artifacts.find((a) => a.name.includes('playwright-report'));

      logger.info(`[GitHub Report] Found artifacts: ${artifacts.map((a: any) => a.name).join(', ')}`);
      logger.info(`[GitHub Report] Selected artifact: ${reportArtifact?.name || 'none'}`);

      if (!reportArtifact) {
        res.json({
          success: true,
          data: null,
          message: 'No report artifact found',
        });
        return;
      }

      // Download the artifact
      logger.info(`[GitHub Report] Downloading artifact ${reportArtifact.id}: ${reportArtifact.name}`);
      const buffer = await githubService.downloadArtifact(
        req.userId!,
        owner as string,
        repo as string,
        reportArtifact.id
      );
      logger.info(`[GitHub Report] Downloaded ${buffer.length} bytes`);

      // Extract and parse the report
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();
      logger.info(`[GitHub Report] ZIP has ${entries.length} entries: ${entries.map((e: any) => e.entryName).join(', ')}`);

      // Look for JSON report files
      let reportData: any = null;
      let scenarios: any[] = [];

      for (const entry of entries) {
        const entryName = entry.entryName.toLowerCase();

        // Playwright JSON report
        if (entryName.endsWith('.json') && !entry.isDirectory) {
          try {
            logger.info(`[GitHub Report] Parsing JSON file: ${entry.entryName}`);
            const content = entry.getData().toString('utf8');
            const jsonData = JSON.parse(content);

            // Check if this is a Playwright report
            if (jsonData.suites || jsonData.stats) {
              reportData = jsonData;
              logger.info(`[GitHub Report] Found Playwright report with ${jsonData.suites?.length || 0} suites`);

              // Parse Playwright report format
              if (jsonData.suites) {
                scenarios = parsePlaywrightSuites(jsonData.suites);
              }
              break;
            }
          } catch (parseError) {
            logger.warn(`[GitHub Report] Failed to parse ${entry.entryName}: ${parseError}`);
          }
        }
      }

      // Calculate summary stats
      const summary = {
        total: scenarios.length,
        passed: scenarios.filter((s) => s.status === 'passed').length,
        failed: scenarios.filter((s) => s.status === 'failed').length,
        skipped: scenarios.filter((s) => s.status === 'skipped').length,
        duration: scenarios.reduce((sum, s) => sum + (s.duration || 0), 0),
      };

      logger.info(`[GitHub Report] Parsed ${scenarios.length} scenarios: ${summary.passed} passed, ${summary.failed} failed`);

      res.json({
        success: true,
        data: {
          summary,
          scenarios,
          raw: reportData,
        },
      });
    } catch (error) {
      logger.error(`[GitHub Report] Error: ${error}`);
      next(error);
    }
  }
);

/**
 * Parse Playwright test suites into our scenario format
 */
function parsePlaywrightSuites(suites: any[], parentName = ''): any[] {
  const scenarios: any[] = [];

  for (const suite of suites) {
    const suiteName = parentName ? `${parentName} > ${suite.title}` : suite.title;

    // Parse specs (test cases)
    if (suite.specs) {
      for (const spec of suite.specs) {
        const scenario: any = {
          id: spec.id || `spec-${Math.random().toString(36).substr(2, 9)}`,
          name: `${suiteName} > ${spec.title}`,
          status: 'passed',
          duration: 0,
          steps: [],
          error: undefined,
          screenshot: undefined,  // Evidence or failure screenshot
          traceUrl: undefined,
        };

        // Get results from tests
        if (spec.tests) {
          for (const test of spec.tests) {
            // Get the first result (or retry results)
            const results = test.results || [];
            for (const result of results) {
              scenario.duration += result.duration || 0;

              // Set status based on result
              if (result.status === 'failed' || result.status === 'timedOut') {
                scenario.status = 'failed';
                if (result.error) {
                  scenario.error = result.error.message || result.error.snippet || String(result.error);
                }
              } else if (result.status === 'skipped') {
                if (scenario.status !== 'failed') {
                  scenario.status = 'skipped';
                }
              }

              // Parse steps with screenshot extraction
              if (result.steps) {
                scenario.steps = result.steps.map((step: any, index: number) => {
                  const stepData: any = {
                    id: `step-${index}`,
                    stepNumber: index + 1,
                    action: step.category || 'action',
                    description: step.title,
                    status: step.error ? 'failed' : 'passed',
                    duration: step.duration || 0,
                    error: step.error?.message,
                  };

                  // Check if this step has attachments (screenshots)
                  if (step.attachments) {
                    const screenshotAtt = step.attachments.find(
                      (a: any) => a.contentType?.includes('image') || a.name?.includes('screenshot')
                    );
                    if (screenshotAtt) {
                      // Convert path to base64 data URL if body is available
                      if (screenshotAtt.body) {
                        stepData.screenshot = `data:image/png;base64,${screenshotAtt.body}`;
                      } else if (screenshotAtt.path) {
                        stepData.screenshot = screenshotAtt.path;
                      }
                    }
                  }

                  return stepData;
                });
              }

              // Get attachments (screenshots, traces) at result level
              if (result.attachments) {
                scenario.attachments = result.attachments.map((att: any) => ({
                  name: att.name,
                  path: att.path,
                  contentType: att.contentType,
                  body: att.body, // Base64 encoded body if available
                }));

                // Extract screenshot - prioritize evidence-screenshot, then any screenshot
                const evidenceScreenshot = result.attachments.find(
                  (a: any) => a.name === 'evidence-screenshot' || a.name?.includes('evidence')
                );
                const failureScreenshot = result.attachments.find(
                  (a: any) => a.name === 'screenshot' || a.name?.includes('failure') || a.name?.includes('screenshot')
                );
                const anyScreenshot = result.attachments.find(
                  (a: any) => a.contentType?.includes('image')
                );

                const screenshotAtt = evidenceScreenshot || failureScreenshot || anyScreenshot;
                if (screenshotAtt) {
                  // Convert to base64 data URL if body is available
                  if (screenshotAtt.body) {
                    scenario.screenshot = `data:image/png;base64,${screenshotAtt.body}`;
                  } else if (screenshotAtt.path) {
                    scenario.screenshot = screenshotAtt.path;
                  }
                }

                // Check for trace
                const traceAtt = result.attachments.find(
                  (a: any) => a.name === 'trace' || a.contentType?.includes('trace')
                );
                if (traceAtt) {
                  scenario.traceUrl = traceAtt.path;
                }
              }
            }
          }
        }

        scenarios.push(scenario);
      }
    }

    // Recursively parse nested suites
    if (suite.suites) {
      scenarios.push(...parsePlaywrightSuites(suite.suites, suiteName));
    }
  }

  return scenarios;
}

export { router as githubArtifactsRouter };

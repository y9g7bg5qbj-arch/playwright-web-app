/**
 * GitHub Integration Routes
 * Barrel file that mounts sub-routers for GitHub API endpoints.
 */

import { Router } from 'express';
import { githubIntegrationRouter } from './githubIntegration.routes';
import { githubWorkflowsRouter } from './githubWorkflows.routes';
import { githubRunsRouter } from './githubRuns.routes';
import { githubArtifactsRouter } from './githubArtifacts.routes';
import { githubAllureRouter } from './githubAllure.routes';
import { githubWebhooksRouter } from './githubWebhooks.routes';

const router = Router();

// Mount sub-routers -- each handles a focused group of endpoints.
// All sub-routers define their own path prefixes so they are mounted
// at '/' to preserve the existing URL structure.
router.use('/', githubIntegrationRouter);
router.use('/', githubWorkflowsRouter);
router.use('/', githubRunsRouter);
router.use('/', githubArtifactsRouter);
router.use('/', githubAllureRouter);
router.use('/', githubWebhooksRouter);

export { router as githubRoutes };

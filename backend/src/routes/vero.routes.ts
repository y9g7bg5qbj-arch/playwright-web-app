import { Router } from 'express';
import { veroFilesRouter } from './veroFiles.routes';
import { veroRecordingRouter } from './veroRecording.routes';
import { veroExecutionRouter } from './veroExecution.routes';
import { veroAgentRouter } from './veroAgent.routes';
import { veroScenarioRouter } from './veroScenario.routes';
import { veroValidationRouter } from './veroValidation.routes';

const router = Router();

// Mount sub-routers — each handles a focused group of endpoints.
// All sub-routers define their own path prefixes (e.g. '/files', '/recording/start', etc.)
// so they are mounted at '/' to preserve the existing URL structure.
router.use('/', veroFilesRouter);
router.use('/', veroRecordingRouter);
router.use('/', veroExecutionRouter);
router.use('/', veroAgentRouter);
router.use('/', veroScenarioRouter);
router.use('/', veroValidationRouter);

export default router;

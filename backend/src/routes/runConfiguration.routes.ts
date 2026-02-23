import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { RunConfigurationService } from '../services/runConfiguration.service';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const service = new RunConfigurationService();
const ARTIFACT_MODES = ['on', 'off', 'on-failure', 'on-first-retry', 'retain-on-failure'] as const;

// All routes require authentication
router.use(authenticateToken);

// ============================================
// RUN CONFIGURATIONS
// ============================================

// GET /api/workflows/:workflowId/run-configurations
router.get(
  '/workflows/:workflowId/run-configurations',
  validate([
    param('workflowId').isUUID().withMessage('Invalid workflow ID'),
    query('projectId').optional().isUUID().withMessage('Invalid project ID'),
  ]),
  asyncHandler(async (req: AuthRequest, res) => {
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
    const configs = await service.findAllConfigurations(req.userId!, req.params.workflowId, projectId, req.userRole);
    res.json({ success: true, data: configs });
  })
);

// GET /api/run-configurations/:id
router.get(
  '/run-configurations/:id',
  validate([param('id').isUUID().withMessage('Invalid configuration ID')]),
  asyncHandler(async (req: AuthRequest, res) => {
    const config = await service.findConfigurationById(req.userId!, req.params.id, req.userRole);
    res.json({ success: true, data: config });
  })
);

// POST /api/workflows/:workflowId/run-configurations
router.post(
  '/workflows/:workflowId/run-configurations',
  validate([
    param('workflowId').isUUID().withMessage('Invalid workflow ID'),
    body('projectId').optional().isUUID().withMessage('Invalid project ID'),
    body('name').isString().trim().notEmpty().withMessage('Name is required'),
    body('description').optional().isString(),
    body('isDefault').optional().isBoolean(),
    body('tags').optional().isArray(),
    body('tagMode').optional().isIn(['any', 'all']),
    body('excludeTags').optional().isArray(),
    body('testFlowIds').optional().isArray(),
    body('environmentId').optional().isUUID(),
    body('target').optional().isIn(['local', 'docker', 'github-actions']),
    body('remoteRunnerId').optional().isUUID(),
    body('browser').optional().isIn(['chromium', 'firefox', 'webkit']),
    body('headless').optional().isBoolean(),
    body('viewport').optional().isObject(),
    body('workers').optional().isInt({ min: 1, max: 32 }),
    body('shardCount').optional().isInt({ min: 1, max: 16 }),
    body('retries').optional().isInt({ min: 0, max: 10 }),
    body('timeout').optional().isInt({ min: 1000, max: 600000 }),
    body('tracing').optional().isIn(ARTIFACT_MODES),
    body('screenshot').optional().isIn(ARTIFACT_MODES),
    body('video').optional().isIn(ARTIFACT_MODES),
  ]),
  asyncHandler(async (req: AuthRequest, res) => {
    const config = await service.createConfiguration(
      req.userId!,
      req.params.workflowId,
      req.body,
      req.body.projectId,
      req.userRole
    );
    res.status(201).json({ success: true, data: config });
  })
);

// PUT /api/run-configurations/:id
router.put(
  '/run-configurations/:id',
  validate([
    param('id').isUUID().withMessage('Invalid configuration ID'),
    body('name').optional().isString().trim().notEmpty(),
    body('description').optional().isString(),
    body('isDefault').optional().isBoolean(),
    body('tags').optional().isArray(),
    body('tagMode').optional().isIn(['any', 'all']),
    body('excludeTags').optional().isArray(),
    body('testFlowIds').optional().isArray(),
    body('environmentId').optional({ values: 'null' }).isUUID(),
    body('target').optional().isIn(['local', 'docker', 'github-actions']),
    body('remoteRunnerId').optional({ values: 'null' }).isUUID(),
    body('browser').optional().isIn(['chromium', 'firefox', 'webkit']),
    body('headless').optional().isBoolean(),
    body('viewport').optional().isObject(),
    body('workers').optional().isInt({ min: 1, max: 32 }),
    body('shardCount').optional().isInt({ min: 1, max: 16 }),
    body('retries').optional().isInt({ min: 0, max: 10 }),
    body('timeout').optional().isInt({ min: 1000, max: 600000 }),
    body('tracing').optional().isIn(ARTIFACT_MODES),
    body('screenshot').optional().isIn(ARTIFACT_MODES),
    body('video').optional().isIn(ARTIFACT_MODES),
  ]),
  asyncHandler(async (req: AuthRequest, res) => {
    const config = await service.updateConfiguration(req.userId!, req.params.id, req.body, req.userRole);
    res.json({ success: true, data: config });
  })
);

// DELETE /api/run-configurations/:id
router.delete(
  '/run-configurations/:id',
  validate([param('id').isUUID().withMessage('Invalid configuration ID')]),
  asyncHandler(async (req: AuthRequest, res) => {
    await service.deleteConfiguration(req.userId!, req.params.id, req.userRole);
    res.json({ success: true, data: null });
  })
);

// POST /api/run-configurations/:id/duplicate
router.post(
  '/run-configurations/:id/duplicate',
  validate([
    param('id').isUUID().withMessage('Invalid configuration ID'),
    body('name').isString().trim().notEmpty().withMessage('Name is required'),
  ]),
  asyncHandler(async (req: AuthRequest, res) => {
    const config = await service.duplicateConfiguration(
      req.userId!,
      req.params.id,
      req.body.name,
      req.userRole
    );
    res.status(201).json({ success: true, data: config });
  })
);

// ============================================
// EXECUTION ENVIRONMENTS
// ============================================

// GET /api/workflows/:workflowId/environments
router.get(
  '/workflows/:workflowId/environments',
  validate([param('workflowId').isUUID().withMessage('Invalid workflow ID')]),
  asyncHandler(async (req: AuthRequest, res) => {
    const envs = await service.findAllEnvironments(req.userId!, req.params.workflowId, req.userRole);
    res.json({ success: true, data: envs });
  })
);

// GET /api/environments/:id
router.get(
  '/environments/:id',
  validate([param('id').isUUID().withMessage('Invalid environment ID')]),
  asyncHandler(async (req: AuthRequest, res) => {
    const env = await service.findEnvironmentById(req.userId!, req.params.id, req.userRole);
    res.json({ success: true, data: env });
  })
);

// POST /api/workflows/:workflowId/environments
router.post(
  '/workflows/:workflowId/environments',
  validate([
    param('workflowId').isUUID().withMessage('Invalid workflow ID'),
    body('name').isString().trim().notEmpty().withMessage('Name is required'),
    body('slug').isString().trim().notEmpty().withMessage('Slug is required'),
    body('baseUrl').isURL().withMessage('Valid base URL is required'),
    body('description').optional().isString(),
    body('variables').optional().isObject(),
    body('isDefault').optional().isBoolean(),
  ]),
  asyncHandler(async (req: AuthRequest, res) => {
    const env = await service.createEnvironment(req.userId!, req.params.workflowId, req.body, req.userRole);
    res.status(201).json({ success: true, data: env });
  })
);

// PUT /api/environments/:id
router.put(
  '/environments/:id',
  validate([
    param('id').isUUID().withMessage('Invalid environment ID'),
    body('name').optional().isString().trim().notEmpty(),
    body('slug').optional().isString().trim().notEmpty(),
    body('baseUrl').optional().isURL(),
    body('description').optional().isString(),
    body('variables').optional().isObject(),
    body('isDefault').optional().isBoolean(),
  ]),
  asyncHandler(async (req: AuthRequest, res) => {
    const env = await service.updateEnvironment(req.userId!, req.params.id, req.body, req.userRole);
    res.json({ success: true, data: env });
  })
);

// DELETE /api/environments/:id
router.delete(
  '/environments/:id',
  validate([param('id').isUUID().withMessage('Invalid environment ID')]),
  asyncHandler(async (req: AuthRequest, res) => {
    await service.deleteEnvironment(req.userId!, req.params.id, req.userRole);
    res.json({ success: true, data: null });
  })
);

// ============================================
// REMOTE RUNNERS
// ============================================

// GET /api/workflows/:workflowId/runners
router.get(
  '/workflows/:workflowId/runners',
  validate([param('workflowId').isUUID().withMessage('Invalid workflow ID')]),
  asyncHandler(async (req: AuthRequest, res) => {
    const runners = await service.findAllRunners(req.userId!, req.params.workflowId, req.userRole);
    res.json({ success: true, data: runners });
  })
);

// GET /api/runners/:id
router.get(
  '/runners/:id',
  validate([param('id').isUUID().withMessage('Invalid runner ID')]),
  asyncHandler(async (req: AuthRequest, res) => {
    const runner = await service.findRunnerById(req.userId!, req.params.id, req.userRole);
    res.json({ success: true, data: runner });
  })
);

// POST /api/workflows/:workflowId/runners
router.post(
  '/workflows/:workflowId/runners',
  validate([
    param('workflowId').isUUID().withMessage('Invalid workflow ID'),
    body('name').isString().trim().notEmpty().withMessage('Name is required'),
    body('host').isString().trim().notEmpty().withMessage('Host is required'),
    body('port').optional().isInt({ min: 1, max: 65535 }),
    body('authType').optional().isIn(['ssh-key', 'token', 'basic']),
    body('credentialId').optional().isUUID(),
    body('dockerImage').optional().isString(),
    body('maxWorkers').optional().isInt({ min: 1, max: 32 }),
  ]),
  asyncHandler(async (req: AuthRequest, res) => {
    const runner = await service.createRunner(req.userId!, req.params.workflowId, req.body, req.userRole);
    res.status(201).json({ success: true, data: runner });
  })
);

// PUT /api/runners/:id
router.put(
  '/runners/:id',
  validate([
    param('id').isUUID().withMessage('Invalid runner ID'),
    body('name').optional().isString().trim().notEmpty(),
    body('host').optional().isString().trim().notEmpty(),
    body('port').optional().isInt({ min: 1, max: 65535 }),
    body('authType').optional().isIn(['ssh-key', 'token', 'basic']),
    body('credentialId').optional({ values: 'null' }).isUUID(),
    body('dockerImage').optional().isString(),
    body('maxWorkers').optional().isInt({ min: 1, max: 32 }),
  ]),
  asyncHandler(async (req: AuthRequest, res) => {
    const runner = await service.updateRunner(req.userId!, req.params.id, req.body, req.userRole);
    res.json({ success: true, data: runner });
  })
);

// DELETE /api/runners/:id
router.delete(
  '/runners/:id',
  validate([param('id').isUUID().withMessage('Invalid runner ID')]),
  asyncHandler(async (req: AuthRequest, res) => {
    await service.deleteRunner(req.userId!, req.params.id, req.userRole);
    res.json({ success: true, data: null });
  })
);

// POST /api/runners/:id/ping
router.post(
  '/runners/:id/ping',
  validate([param('id').isUUID().withMessage('Invalid runner ID')]),
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await service.pingRunner(req.userId!, req.params.id, req.userRole);
    res.json({ success: true, data: result });
  })
);

// ============================================
// STORED CREDENTIALS
// ============================================

// GET /api/workflows/:workflowId/credentials
router.get(
  '/workflows/:workflowId/credentials',
  validate([param('workflowId').isUUID().withMessage('Invalid workflow ID')]),
  asyncHandler(async (req: AuthRequest, res) => {
    const credentials = await service.findAllCredentials(req.userId!, req.params.workflowId, req.userRole);
    res.json({ success: true, data: credentials });
  })
);

// POST /api/workflows/:workflowId/credentials
router.post(
  '/workflows/:workflowId/credentials',
  validate([
    param('workflowId').isUUID().withMessage('Invalid workflow ID'),
    body('name').isString().trim().notEmpty().withMessage('Name is required'),
    body('type').isIn(['ssh-key', 'token', 'basic', 'docker-registry']).withMessage('Invalid type'),
    body('value').isString().notEmpty().withMessage('Value is required'),
  ]),
  asyncHandler(async (req: AuthRequest, res) => {
    const credential = await service.createCredential(
      req.userId!,
      req.params.workflowId,
      req.body,
      req.userRole
    );
    res.status(201).json({ success: true, data: credential });
  })
);

// DELETE /api/credentials/:id
router.delete(
  '/credentials/:id',
  validate([param('id').isUUID().withMessage('Invalid credential ID')]),
  asyncHandler(async (req: AuthRequest, res) => {
    await service.deleteCredential(req.userId!, req.params.id, req.userRole);
    res.json({ success: true, data: null });
  })
);

// ============================================
// TAGS
// ============================================

// GET /api/workflows/:workflowId/tags
router.get(
  '/workflows/:workflowId/tags',
  validate([param('workflowId').isUUID().withMessage('Invalid workflow ID')]),
  asyncHandler(async (req: AuthRequest, res) => {
    const tags = await service.getAllTags(req.userId!, req.params.workflowId, req.userRole);
    res.json({ success: true, data: tags });
  })
);

// PUT /api/test-flows/:id/tags
router.put(
  '/test-flows/:id/tags',
  validate([
    param('id').isUUID().withMessage('Invalid test flow ID'),
    body('tags').isArray().withMessage('Tags must be an array'),
    body('tags.*').isString().trim().notEmpty().withMessage('Tags must be non-empty strings'),
  ]),
  asyncHandler(async (req: AuthRequest, res) => {
    const tags = await service.updateTestFlowTags(req.userId!, req.params.id, req.body.tags, req.userRole);
    res.json({ success: true, data: tags });
  })
);

// ============================================
// FILTER TEST FLOWS
// ============================================

// POST /api/workflows/:workflowId/filter-flows
router.post(
  '/workflows/:workflowId/filter-flows',
  validate([
    param('workflowId').isUUID().withMessage('Invalid workflow ID'),
    body('tags').optional().isArray(),
    body('tagMode').optional().isIn(['any', 'all']),
    body('excludeTags').optional().isArray(),
    body('testFlowIds').optional().isArray(),
  ]),
  asyncHandler(async (req: AuthRequest, res) => {
    const flowIds = await service.filterTestFlows(req.userId!, req.params.workflowId, {
      tags: req.body.tags || [],
      tagMode: req.body.tagMode || 'any',
      excludeTags: req.body.excludeTags || [],
      testFlowIds: req.body.testFlowIds || [],
    }, req.userRole);
    res.json({ success: true, data: flowIds });
  })
);

export { router as runConfigurationRoutes };

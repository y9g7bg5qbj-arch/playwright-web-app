import { Router } from 'express';
import { body, param } from 'express-validator';
import { TestFlowService } from '../services/testFlow.service';
import { validate } from '../middleware/validate';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const testFlowService = new TestFlowService();

// All routes require authentication
router.use(authenticateToken);

// Get all test flows for a workflow
router.get(
  '/workflow/:workflowId',
  validate([param('workflowId').isUUID().withMessage('Invalid workflow ID')]),
  async (req: AuthRequest, res, next) => {
    try {
      const testFlows = await testFlowService.findAll(req.userId!, req.params.workflowId);
      res.json({
        success: true,
        data: testFlows,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create test flow
router.post(
  '/workflow/:workflowId',
  validate([
    param('workflowId').isUUID().withMessage('Invalid workflow ID'),
    body('name').notEmpty().withMessage('Name is required'),
    body('code').optional().isString(),
    body('language').optional().isIn(['javascript', 'typescript', 'python']),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const testFlow = await testFlowService.create(req.userId!, req.params.workflowId, req.body);
      res.status(201).json({
        success: true,
        data: testFlow,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get single test flow
router.get(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid test flow ID')]),
  async (req: AuthRequest, res, next) => {
    try {
      const testFlow = await testFlowService.findOne(req.userId!, req.params.id);
      res.json({
        success: true,
        data: testFlow,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update test flow
router.put(
  '/:id',
  validate([
    param('id').isUUID().withMessage('Invalid test flow ID'),
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('code').optional().isString(),
    body('language').optional().isIn(['javascript', 'typescript', 'python']),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const testFlow = await testFlowService.update(req.userId!, req.params.id, req.body);
      res.json({
        success: true,
        data: testFlow,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Clone test flow
router.post(
  '/:id/clone',
  validate([param('id').isUUID().withMessage('Invalid test flow ID')]),
  async (req: AuthRequest, res, next) => {
    try {
      const testFlow = await testFlowService.clone(req.userId!, req.params.id);
      res.status(201).json({
        success: true,
        data: testFlow,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete test flow
router.delete(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid test flow ID')]),
  async (req: AuthRequest, res, next) => {
    try {
      await testFlowService.delete(req.userId!, req.params.id);
      res.json({
        success: true,
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as testFlowRoutes };

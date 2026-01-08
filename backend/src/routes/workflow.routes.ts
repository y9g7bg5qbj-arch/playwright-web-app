import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { WorkflowService } from '../services/workflow.service';
import { validate } from '../middleware/validate';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const workflowService = new WorkflowService();

// All routes require authentication
router.use(authenticateToken);

// Get all workflows (optionally filtered by applicationId)
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const applicationId = req.query.applicationId as string | undefined ?? req.query.projectId as string | undefined;
    const workflows = await workflowService.findAll(req.userId!, applicationId);
    res.json({
      success: true,
      data: workflows,
    });
  } catch (error) {
    next(error);
  }
});

// Create workflow (requires applicationId)
router.post(
  '/',
  validate([
    body('applicationId').notEmpty().withMessage('Application ID is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('description').optional().isString(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const workflow = await workflowService.create(req.userId!, req.body);
      res.status(201).json({
        success: true,
        data: workflow,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get single workflow
router.get(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid workflow ID')]),
  async (req: AuthRequest, res, next) => {
    try {
      const workflow = await workflowService.findOne(req.userId!, req.params.id);
      res.json({
        success: true,
        data: workflow,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update workflow
router.put(
  '/:id',
  validate([
    param('id').isUUID().withMessage('Invalid workflow ID'),
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('description').optional().isString(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const workflow = await workflowService.update(req.userId!, req.params.id, req.body);
      res.json({
        success: true,
        data: workflow,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete workflow
router.delete(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid workflow ID')]),
  async (req: AuthRequest, res, next) => {
    try {
      await workflowService.delete(req.userId!, req.params.id);
      res.json({
        success: true,
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as workflowRoutes };

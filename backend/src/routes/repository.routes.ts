// Object Repository API Routes
import { Router, Request, Response, NextFunction } from 'express';
import { RepositoryService } from '../services/repository.service';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { body, param, validationResult } from 'express-validator';

const router = Router();
const repositoryService = new RepositoryService();

// Validation helper
const validate = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};

// ============================================
// OBJECT REPOSITORY ROUTES
// ============================================

/**
 * GET /api/repositories/workflow/:workflowId
 * Get or create repository for a workflow
 */
router.get(
    '/workflow/:workflowId',
    authenticateToken,
    param('workflowId').isUUID(),
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).userId!;
        const { workflowId } = req.params;

        const repository = await repositoryService.getByWorkflowId(userId, workflowId);

        res.json({ success: true, data: repository });
    })
);

/**
 * PUT /api/repositories/workflow/:workflowId
 * Update repository settings
 */
router.put(
    '/workflow/:workflowId',
    authenticateToken,
    param('workflowId').isUUID(),
    body('name').optional().isString().trim().notEmpty(),
    body('description').optional().isString(),
    body('globalElements').optional().isArray(),
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).userId!;
        const { workflowId } = req.params;
        const { name, description, globalElements } = req.body;

        const repository = await repositoryService.updateRepository(userId, workflowId, {
            name,
            description,
            globalElements,
        });

        res.json({ success: true, data: repository });
    })
);

// ============================================
// PAGE OBJECT ROUTES
// ============================================

/**
 * GET /api/repositories/workflow/:workflowId/pages
 * Get all pages in the repository
 */
router.get(
    '/workflow/:workflowId/pages',
    authenticateToken,
    param('workflowId').isUUID(),
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).userId!;
        const { workflowId } = req.params;

        const pages = await repositoryService.getPages(userId, workflowId);

        res.json({ success: true, data: pages });
    })
);

/**
 * POST /api/repositories/workflow/:workflowId/pages
 * Create a new page
 */
router.post(
    '/workflow/:workflowId/pages',
    authenticateToken,
    param('workflowId').isUUID(),
    body('name').isString().trim().notEmpty(),
    body('description').optional().isString(),
    body('urlPattern').optional().isString(),
    body('baseUrl').optional().isString(),
    body('elements').optional().isArray(),
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).userId!;
        const { workflowId } = req.params;
        const { name, description, urlPattern, baseUrl, elements } = req.body;

        const page = await repositoryService.createPage(userId, workflowId, {
            name,
            description,
            urlPattern,
            baseUrl,
            elements,
        });

        res.status(201).json({ success: true, data: page });
    })
);

/**
 * PUT /api/repositories/workflow/:workflowId/pages/:pageId
 * Update a page
 */
router.put(
    '/workflow/:workflowId/pages/:pageId',
    authenticateToken,
    param('workflowId').isUUID(),
    param('pageId').isUUID(),
    body('name').optional().isString().trim().notEmpty(),
    body('description').optional().isString(),
    body('urlPattern').optional().isString(),
    body('baseUrl').optional().isString(),
    body('elements').optional().isArray(),
    body('order').optional().isInt({ min: 0 }),
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).userId!;
        const { workflowId, pageId } = req.params;
        const { name, description, urlPattern, baseUrl, elements, order } = req.body;

        const page = await repositoryService.updatePage(userId, workflowId, pageId, {
            name,
            description,
            urlPattern,
            baseUrl,
            elements,
            order,
        });

        res.json({ success: true, data: page });
    })
);

/**
 * DELETE /api/repositories/workflow/:workflowId/pages/:pageId
 * Delete a page
 */
router.delete(
    '/workflow/:workflowId/pages/:pageId',
    authenticateToken,
    param('workflowId').isUUID(),
    param('pageId').isUUID(),
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).userId!;
        const { workflowId, pageId } = req.params;

        await repositoryService.deletePage(userId, workflowId, pageId);

        res.json({ success: true, message: 'Page deleted' });
    })
);

/**
 * PUT /api/repositories/workflow/:workflowId/pages/reorder
 * Reorder pages
 */
router.put(
    '/workflow/:workflowId/pages/reorder',
    authenticateToken,
    param('workflowId').isUUID(),
    body('pageIds').isArray(),
    body('pageIds.*').isUUID(),
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).userId!;
        const { workflowId } = req.params;
        const { pageIds } = req.body;

        await repositoryService.reorderPages(userId, workflowId, pageIds);

        res.json({ success: true, message: 'Pages reordered' });
    })
);

// ============================================
// ELEMENT ROUTES
// ============================================

/**
 * POST /api/repositories/workflow/:workflowId/pages/:pageId/elements
 * Add an element to a page
 */
router.post(
    '/workflow/:workflowId/pages/:pageId/elements',
    authenticateToken,
    param('workflowId').isUUID(),
    param('pageId').isUUID(),
    body('name').isString().trim().notEmpty(),
    body('description').optional().isString(),
    body('locator').isObject(),
    body('tags').optional().isArray(),
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).userId!;
        const { workflowId, pageId } = req.params;
        const { name, description, locator, tags } = req.body;

        const page = await repositoryService.addElement(userId, workflowId, pageId, {
            name,
            description,
            locator,
            tags,
        });

        res.status(201).json({ success: true, data: page });
    })
);

/**
 * PUT /api/repositories/workflow/:workflowId/pages/:pageId/elements/:elementId
 * Update an element
 */
router.put(
    '/workflow/:workflowId/pages/:pageId/elements/:elementId',
    authenticateToken,
    param('workflowId').isUUID(),
    param('pageId').isUUID(),
    param('elementId').isUUID(),
    body('name').optional().isString().trim().notEmpty(),
    body('description').optional().isString(),
    body('locator').optional().isObject(),
    body('tags').optional().isArray(),
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).userId!;
        const { workflowId, pageId, elementId } = req.params;
        const { name, description, locator, tags } = req.body;

        const page = await repositoryService.updateElement(userId, workflowId, pageId, elementId, {
            name,
            description,
            locator,
            tags,
        });

        res.json({ success: true, data: page });
    })
);

/**
 * DELETE /api/repositories/workflow/:workflowId/pages/:pageId/elements/:elementId
 * Delete an element
 */
router.delete(
    '/workflow/:workflowId/pages/:pageId/elements/:elementId',
    authenticateToken,
    param('workflowId').isUUID(),
    param('pageId').isUUID(),
    param('elementId').isUUID(),
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthRequest).userId!;
        const { workflowId, pageId, elementId } = req.params;

        const page = await repositoryService.removeElement(userId, workflowId, pageId, elementId);

        res.json({ success: true, data: page });
    })
);

export default router;

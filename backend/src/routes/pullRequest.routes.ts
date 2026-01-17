import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { pullRequestService } from '../services/pullRequest.service';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/projects/:projectId/pull-requests
 * List all pull requests for a project
 */
router.get(
  '/projects/:projectId/pull-requests',
  validate([
    param('projectId').isUUID(),
    query('status').optional().isIn(['draft', 'open', 'approved', 'merged', 'closed']),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const pullRequests = await pullRequestService.listByProject(
        req.params.projectId,
        req.query.status as string | undefined
      );
      res.json({ pullRequests });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/sandboxes/:sandboxId/pull-requests
 * Create a new pull request from a sandbox
 */
router.post(
  '/sandboxes/:sandboxId/pull-requests',
  validate([
    param('sandboxId').isUUID(),
    body('title').isString().trim().notEmpty().isLength({ min: 1, max: 200 }),
    body('description').optional().isString().trim().isLength({ max: 2000 }),
    body('targetBranch').optional().isIn(['dev', 'master']),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const pullRequest = await pullRequestService.create(req.userId!, req.params.sandboxId, {
        title: req.body.title,
        description: req.body.description,
        targetBranch: req.body.targetBranch,
      });

      // Emit WebSocket event
      const io = req.app.get('io');
      if (io) {
        io.to(`project:${pullRequest.projectId}`).emit('pr:created', { pullRequest });
      }

      res.status(201).json({ pullRequest });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/pull-requests/:id
 * Get pull request details
 */
router.get(
  '/pull-requests/:id',
  validate([
    param('id').isUUID(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const pullRequest = await pullRequestService.getById(req.params.id);
      if (!pullRequest) {
        return res.status(404).json({ error: 'Pull request not found' });
      }
      res.json({ pullRequest });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/pull-requests/:id
 * Update pull request title/description
 */
router.patch(
  '/pull-requests/:id',
  validate([
    param('id').isUUID(),
    body('title').optional().isString().trim().notEmpty().isLength({ min: 1, max: 200 }),
    body('description').optional().isString().trim().isLength({ max: 2000 }),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const pullRequest = await pullRequestService.update(req.params.id, req.userId!, {
        title: req.body.title,
        description: req.body.description,
      });

      // Emit WebSocket event
      const io = req.app.get('io');
      if (io) {
        io.to(`project:${pullRequest.projectId}`).emit('pr:updated', { pullRequest });
      }

      res.json({ pullRequest });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/pull-requests/:id/open
 * Mark PR as ready for review (draft -> open)
 */
router.post(
  '/pull-requests/:id/open',
  validate([
    param('id').isUUID(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const pullRequest = await pullRequestService.openForReview(req.params.id, req.userId!);

      // Emit WebSocket event
      const io = req.app.get('io');
      if (io) {
        io.to(`project:${pullRequest.projectId}`).emit('pr:updated', { pullRequest });
      }

      res.json({ pullRequest });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/pull-requests/:id
 * Close a pull request
 */
router.delete(
  '/pull-requests/:id',
  validate([
    param('id').isUUID(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const pullRequest = await pullRequestService.getById(req.params.id);
      if (!pullRequest) {
        return res.status(404).json({ error: 'Pull request not found' });
      }

      await pullRequestService.close(req.params.id, req.userId!);

      // Emit WebSocket event
      const io = req.app.get('io');
      if (io) {
        io.to(`project:${pullRequest.projectId}`).emit('pr:closed', { pullRequestId: req.params.id });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/pull-requests/:id/diff
 * Get diff summary for a PR
 */
router.get(
  '/pull-requests/:id/diff',
  validate([
    param('id').isUUID(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const diff = await pullRequestService.getDiff(req.params.id);
      res.json({ diff });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/pull-requests/:id/diff/:filePath
 * Get detailed diff for a specific file
 */
router.get(
  '/pull-requests/:id/diff/:filePath(*)',
  validate([
    param('id').isUUID(),
    param('filePath').isString().notEmpty(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const fileDiff = await pullRequestService.getFileDiff(req.params.id, req.params.filePath);
      res.json({ fileDiff });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/pull-requests/:id/files
 * Get list of changed files
 */
router.get(
  '/pull-requests/:id/files',
  validate([
    param('id').isUUID(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const files = await pullRequestService.getChangedFiles(req.params.id);
      res.json({ files });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/pull-requests/:id/reviews
 * Get reviews for a PR
 */
router.get(
  '/pull-requests/:id/reviews',
  validate([
    param('id').isUUID(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const reviews = await pullRequestService.getReviews(req.params.id);
      res.json({ reviews });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/pull-requests/:id/reviews
 * Submit a review on a PR
 */
router.post(
  '/pull-requests/:id/reviews',
  validate([
    param('id').isUUID(),
    body('status').isIn(['approved', 'changes_requested']),
    body('comment').optional().isString().trim().isLength({ max: 2000 }),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const review = await pullRequestService.submitReview(req.params.id, req.userId!, {
        status: req.body.status,
        comment: req.body.comment,
      });

      // Get updated PR to emit event
      const pullRequest = await pullRequestService.getById(req.params.id);

      // Emit WebSocket event
      const io = req.app.get('io');
      if (io && pullRequest) {
        io.to(`project:${pullRequest.projectId}`).emit('pr:review:submitted', {
          pullRequestId: req.params.id,
          review,
        });
        io.to(`project:${pullRequest.projectId}`).emit('pr:updated', { pullRequest });
      }

      res.status(201).json({ review });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/pull-requests/:id/comments
 * Get comments for a PR
 */
router.get(
  '/pull-requests/:id/comments',
  validate([
    param('id').isUUID(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const comments = await pullRequestService.getComments(req.params.id);
      res.json({ comments });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/pull-requests/:id/comments
 * Add a comment to a PR
 */
router.post(
  '/pull-requests/:id/comments',
  validate([
    param('id').isUUID(),
    body('body').isString().trim().notEmpty().isLength({ max: 2000 }),
    body('filePath').optional().isString(),
    body('lineNumber').optional().isInt({ min: 1 }),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const comment = await pullRequestService.addComment(req.params.id, req.userId!, {
        body: req.body.body,
        filePath: req.body.filePath,
        lineNumber: req.body.lineNumber,
      });

      // Get PR to emit event
      const pullRequest = await pullRequestService.getById(req.params.id);

      // Emit WebSocket event
      const io = req.app.get('io');
      if (io && pullRequest) {
        io.to(`project:${pullRequest.projectId}`).emit('pr:comment:added', {
          pullRequestId: req.params.id,
          comment,
        });
      }

      res.status(201).json({ comment });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/pull-requests/:id/comments/:commentId
 * Delete a comment
 */
router.delete(
  '/pull-requests/:id/comments/:commentId',
  validate([
    param('id').isUUID(),
    param('commentId').isUUID(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      await pullRequestService.deleteComment(req.params.commentId, req.userId!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/pull-requests/:id/can-merge
 * Check if PR can be merged by current user
 */
router.get(
  '/pull-requests/:id/can-merge',
  validate([
    param('id').isUUID(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await pullRequestService.canMerge(req.params.id, req.userId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/pull-requests/:id/merge
 * Merge a PR
 */
router.post(
  '/pull-requests/:id/merge',
  validate([
    param('id').isUUID(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const pullRequest = await pullRequestService.merge(req.params.id, req.userId!);

      // Emit WebSocket event
      const io = req.app.get('io');
      if (io) {
        io.to(`project:${pullRequest.projectId}`).emit('pr:merged', {
          pullRequestId: req.params.id,
          mergedBy: req.userId,
        });
        io.to(`project:${pullRequest.projectId}`).emit('pr:updated', { pullRequest });
      }

      res.json({ pullRequest });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

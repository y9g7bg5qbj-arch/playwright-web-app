/**
 * GitHub Integration & Repository Routes
 * Endpoints for connecting/disconnecting GitHub, validating tokens, and browsing repositories.
 */

import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { githubService } from '../services/github.service';

const router = Router();

// ============================================
// INTEGRATION MANAGEMENT
// ============================================

/**
 * GET /api/github/integration
 * Get user's GitHub integration status
 */
router.get('/integration', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const integration = await githubService.getIntegration(req.userId!);
  res.json({
    success: true,
    data: integration,
  });
}));

/**
 * POST /api/github/connect
 * Connect GitHub with a Personal Access Token
 */
router.post(
  '/connect',
  authenticateToken,
  validate([
    body('token').isString().notEmpty().withMessage('Token is required'),
    body('tokenType').optional().isIn(['pat', 'oauth']).withMessage('Invalid token type'),
  ]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { token, tokenType = 'pat' } = req.body;

    const encryptionKey = (process.env.GITHUB_TOKEN_ENCRYPTION_KEY || '').trim();
    if (!encryptionKey) {
      res.status(503).json({
        success: false,
        error: 'GitHub integration is disabled until GITHUB_TOKEN_ENCRYPTION_KEY is configured',
      });
      return;
    }
    if (encryptionKey.length < 32) {
      res.status(503).json({
        success: false,
        error: 'GitHub integration requires GITHUB_TOKEN_ENCRYPTION_KEY to be at least 32 characters',
      });
      return;
    }

    // Validate the token
    const validation = await githubService.validateToken(token);
    if (!validation.valid || !validation.user) {
      res.status(400).json({
        success: false,
        error: validation.error || 'Invalid GitHub token',
      });
      return;
    }

    // Save the integration
    const integration = await githubService.saveIntegration(
      req.userId!,
      token,
      tokenType,
      validation.user
    );

    // Don't send the encrypted token back
    const { accessToken, ...safeIntegration } = integration;

    res.json({
      success: true,
      data: safeIntegration,
    });
  })
);

/**
 * DELETE /api/github/disconnect
 * Disconnect GitHub integration
 */
router.delete('/disconnect', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  await githubService.deleteIntegration(req.userId!);
  res.json({
    success: true,
    message: 'GitHub disconnected successfully',
  });
}));

/**
 * POST /api/github/validate-token
 * Validate a GitHub token without saving
 */
router.post(
  '/validate-token',
  authenticateToken,
  validate([body('token').isString().notEmpty().withMessage('Token is required')]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { token } = req.body;
    const validation = await githubService.validateToken(token);

    res.json({
      success: true,
      data: {
        valid: validation.valid,
        login: validation.user?.login,
        avatarUrl: validation.user?.avatar_url,
        error: validation.error,
      },
    });
  })
);

// ============================================
// REPOSITORY MANAGEMENT
// ============================================

/**
 * GET /api/github/repos
 * List user's GitHub repositories
 */
router.get('/repos', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const repos = await githubService.listRepositories(req.userId!);
  res.json({
    success: true,
    data: repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      private: repo.private,
      defaultBranch: repo.default_branch,
      htmlUrl: repo.html_url,
    })),
  });
}));

/**
 * GET /api/github/repos/:owner/:repo/branches
 * Get branches for a repository
 */
router.get(
  '/repos/:owner/:repo/branches',
  authenticateToken,
  validate([
    param('owner').isString().notEmpty(),
    param('repo').isString().notEmpty(),
  ]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { owner, repo } = req.params;
    const branches = await githubService.getRepoBranches(req.userId!, owner, repo);
    res.json({
      success: true,
      data: branches,
    });
  })
);

export { router as githubIntegrationRouter };

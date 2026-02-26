/**
 * Runtime Auth Middleware
 *
 * Verifies that the authenticated user owns the application specified
 * by the ?projectId= query parameter. Runtime callers may provide either:
 * - applicationId (legacy/current convention), or
 * - nested projectId (new execution scope convention).
 *
 * This middleware normalizes nested project IDs to their parent application ID
 * so downstream runtime routes can continue querying by application scope.
 *
 * Used by runtime-facing endpoints
 * (tables, versions, bulk) to prevent unauthorized data access.
 */

import { Response, NextFunction } from 'express';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { applicationRepository, projectRepository } from '../../db/repositories/mongo';

async function normalizeRuntimeProjectQuery(req: AuthRequest): Promise<string | undefined> {
  const rawProjectId = typeof req.query.projectId === 'string' ? req.query.projectId.trim() : '';
  if (!rawProjectId) {
    return undefined;
  }

  // Fast-path: projectId already points at an application.
  const directApplication = await applicationRepository.findById(rawProjectId);
  if (directApplication) {
    return directApplication.id;
  }

  // Fallback: runtime sent nested project id; map to owning application.
  const nestedProject = await projectRepository.findById(rawProjectId);
  if (nestedProject?.applicationId) {
    req.query.projectId = nestedProject.applicationId;
    if (!req.query.nestedProjectId) {
      req.query.nestedProjectId = nestedProject.id;
    }
    return nestedProject.applicationId;
  }

  return rawProjectId;
}

/**
 * Middleware chain: authenticateToken → verifyApplicationOwnership
 *
 * 1. authenticateToken sets req.userId (or rejects with 401, or bypasses in dev)
 * 2. verifyApplicationOwnership checks that req.userId owns the application
 *    identified by req.query.projectId
 */
export const runtimeAuth = [
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const applicationId = await normalizeRuntimeProjectQuery(req);
      if (!applicationId) {
        // Let the route handler deal with missing projectId
        return next();
      }

      const userId = req.userId;
      if (!userId) {
        // Should not happen — authenticateToken should have set it or rejected
        return next();
      }

      const application = await applicationRepository.findById(applicationId);
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }
      if (application.userId !== userId) {
        return res.status(403).json({ error: 'Access denied to this application' });
      }

      next();
    } catch (error) {
      next(error);
    }
  },
];

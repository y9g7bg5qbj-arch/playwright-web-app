/**
 * Runtime Auth Middleware
 *
 * Verifies that the authenticated user owns the application specified
 * by the ?projectId= query parameter. Used by runtime-facing endpoints
 * (tables, versions, bulk) to prevent unauthorized data access.
 */

import { Response, NextFunction } from 'express';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { applicationRepository } from '../../db/repositories/mongo';

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
      const applicationId = req.query.projectId as string;
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

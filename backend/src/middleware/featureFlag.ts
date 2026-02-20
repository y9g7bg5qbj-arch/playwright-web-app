import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware that gates a route behind an environment-variable feature flag.
 *
 * Usage:
 *   router.get('/auth-profiles', requireFeature('VERO_ENABLE_AUTH_PROFILES'), authenticateToken, handler);
 */
export function requireFeature(flag: string) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (process.env[flag] !== 'true') {
      return res.status(404).json({ error: 'Feature not available' });
    }
    next();
  };
}

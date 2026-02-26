import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from '../utils/errors';
import { DEV_BYPASS_USER_ID, isDevBypassEnabled } from '../utils/devBypassAuth';
import { userRepository } from '../db/repositories/mongo';
import type { UserRole } from '@playwright-web-app/shared';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: UserRole;
}

export const authenticateToken = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    // TODO: SECURITY - Local development bypass only
    if (isDevBypassEnabled()) {
      req.userId = DEV_BYPASS_USER_ID;
      req.userRole = 'admin';
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; role?: string };
    req.userId = decoded.userId;

    // Always read role from DB to ensure role changes take effect immediately,
    // rather than relying on the potentially stale JWT claim.
    const user = await userRepository.findById(decoded.userId);
    req.userRole = ((user?.role as UserRole) || 'qa_tester');

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
};

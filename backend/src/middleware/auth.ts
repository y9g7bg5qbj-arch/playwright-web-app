import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from '../utils/errors';
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
    // TODO: SECURITY - This bypass should only be used for local development
    // Set BYPASS_AUTH=true in .env to enable the bypass (development only)
    if (config.nodeEnv === 'development' && process.env.BYPASS_AUTH === 'true') {
      req.userId = '4a6ceb7d-9883-44e9-bfd3-6a1cd2557ffc';
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

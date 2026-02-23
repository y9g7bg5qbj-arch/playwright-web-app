/**
 * User Management Routes
 *
 * Admin-only endpoints for listing users and assigning roles.
 * All routes require 'manage:users' permission (admin only).
 */

import { Router, Response, NextFunction } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission, normalizeRole } from '../middleware/rbac';
import { userRepository } from '../db/repositories/mongo';
import { AuthService } from '../services/auth.service';
import { notificationService } from '../services/notification.service';
import { logger } from '../utils/logger';
import { config } from '../config';
import type { UserRole } from '@playwright-web-app/shared';

const VALID_ROLES: UserRole[] = ['admin', 'qa_lead', 'senior_qa', 'qa_tester', 'viewer'];

const router = Router();
const authService = new AuthService();

// All routes require authentication + manage:users permission
router.use(authenticateToken);
router.use(requirePermission('manage:users'));

/**
 * GET /api/users
 * List all users (admin only)
 */
router.get('/', async (_req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const users = await userRepository.findAll();

    const formatted = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: normalizeRole(u.role),
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    logger.error('Failed to list users:', error);
    res.status(500).json({ success: false, error: 'Failed to list users' });
  }
});

/**
 * GET /api/users/:id
 * Get user details (admin only)
 */
router.get('/:id', async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const user = await userRepository.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: normalizeRole(user.role),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Failed to get user:', error);
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
});

/**
 * POST /api/users
 * Create a provisioned user (admin only)
 * Body: { name, email, role }
 * Creates user with unusable password and sends welcome email
 */
router.post('/', async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const { name, email, role } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required' });
    }

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
      });
    }

    const { user, welcomeToken } = await authService.createProvisionedUser({
      name,
      email,
      role: role || 'qa_tester',
    });

    // Build set-password URL
    const frontendOrigin = config.cors.origin || 'http://localhost:5173';
    const setPasswordUrl = `${frontendOrigin}/set-password?token=${welcomeToken}`;

    // Send welcome email (non-blocking — don't fail the request if email fails)
    notificationService.sendWelcomeEmail(email, name, normalizeRole(role || 'qa_tester'), setPasswordUrl)
      .catch(err => logger.error(`Failed to send welcome email to ${email}:`, err));

    logger.info(`Admin ${req.userId} created provisioned user ${email} with role ${role || 'qa_tester'}`);

    res.status(201).json({
      success: true,
      data: {
        ...user,
        status: 'pending',
      },
    });
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    logger.error('Failed to create user:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

/**
 * PUT /api/users/:id/role
 * Assign a role to a user (admin only)
 *
 * Body: { role: UserRole }
 *
 * Guards:
 * - Cannot demote the last admin
 * - Cannot change your own role (prevents self-lockout)
 */
router.put('/:id/role', async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const targetUserId = req.params.id;
    const { role } = req.body;

    // Validate role
    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
      });
    }

    const normalizedRole = normalizeRole(role);

    // Fetch target user
    const targetUser = await userRepository.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Prevent self role change
    if (targetUserId === req.userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change your own role. Ask another admin.',
      });
    }

    // Last-admin protection: prevent demoting the last admin
    if (targetUser.role === 'admin' && normalizedRole !== 'admin') {
      const adminCount = await userRepository.countByRole('admin');
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot demote the last admin. Promote another user to admin first.',
        });
      }
    }

    // Update role
    const updatedUser = await userRepository.updateRole(targetUserId, normalizedRole);

    if (!updatedUser) {
      return res.status(500).json({ success: false, error: 'Failed to update role' });
    }

    logger.info(`User ${req.userId} changed role of ${targetUserId} to ${normalizedRole}`);

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: normalizeRole(updatedUser.role),
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Failed to update user role:', error);
    res.status(500).json({ success: false, error: 'Failed to update user role' });
  }
});

export default router;

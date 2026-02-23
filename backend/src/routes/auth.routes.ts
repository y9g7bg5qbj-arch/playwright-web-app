import { Router } from 'express';
import { body } from 'express-validator';
import { AuthService } from '../services/auth.service';
import { notificationService } from '../services/notification.service';
import { validate } from '../middleware/validate';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { config } from '../config';
import { logger } from '../utils/logger';

const router = Router();
const authService = new AuthService();

// Register (bootstrap admin only)
router.post(
  '/register',
  validate([
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').optional().isString(),
  ]),
  async (req, res, next) => {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Login
router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  async (req, res, next) => {
    try {
      const result = await authService.login(req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const user = await authService.getUser(req.userId!);
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// Validate a password token (welcome or reset)
router.get('/validate-token/:token', async (req, res, next) => {
  try {
    const result = await authService.validateToken(req.params.token);
    res.json({
      success: true,
      data: {
        user: {
          name: result.userName,
          role: result.userRole,
        },
        type: result.type,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Set password (using welcome or reset token)
router.post(
  '/set-password',
  validate([
    body('token').notEmpty().withMessage('Token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ]),
  async (req, res, next) => {
    try {
      await authService.setPassword(req.body.token, req.body.password);
      res.json({
        success: true,
        data: { message: 'Password set successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Forgot password — request a reset email
router.post(
  '/forgot-password',
  validate([
    body('email').isEmail().withMessage('Invalid email'),
  ]),
  async (req, res, _next) => {
    try {
      const { resetToken, userName } = await authService.requestPasswordReset(req.body.email);

      if (resetToken) {
        const frontendOrigin = config.cors.origin || 'http://localhost:5173';
        const resetUrl = `${frontendOrigin}/reset-password?token=${resetToken}`;

        // Send email non-blocking
        notificationService.sendPasswordResetEmail(req.body.email, userName || '', resetUrl)
          .catch(err => logger.error(`Failed to send reset email:`, err));
      }

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        data: { message: 'If an account exists with that email, a password reset link has been sent.' },
      });
    } catch (error: any) {
      logger.error('Password reset request error:', error);
      // Still return success to prevent enumeration
      res.json({
        success: true,
        data: { message: 'If an account exists with that email, a password reset link has been sent.' },
      });
    }
  }
);

// Reset password (using reset token)
router.post(
  '/reset-password',
  validate([
    body('token').notEmpty().withMessage('Token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ]),
  async (req, res, next) => {
    try {
      await authService.setPassword(req.body.token, req.body.password);
      res.json({
        success: true,
        data: { message: 'Password reset successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Mark onboarding as completed
router.put('/onboarding-complete', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    await authService.completeOnboarding(req.userId!);
    res.json({
      success: true,
      data: { message: 'Onboarding completed' },
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRoutes };

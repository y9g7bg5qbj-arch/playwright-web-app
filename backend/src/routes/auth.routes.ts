import { Router } from 'express';
import { body } from 'express-validator';
import { AuthService } from '../services/auth.service';
import { validate } from '../middleware/validate';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const authService = new AuthService();

// Register
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

export { router as authRoutes };

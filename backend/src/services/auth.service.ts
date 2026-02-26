import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userRepository, passwordTokenRepository } from '../db/repositories/mongo';
import { config } from '../config';
import { ConflictError, ForbiddenError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { normalizeRole } from '../middleware/rbac';
import { logger } from '../utils/logger';
import type { User, UserRole, UserCreate, UserLogin, AuthResponse } from '@playwright-web-app/shared';

const SALT_ROUNDS = 10;
const WELCOME_TOKEN_EXPIRY_DAYS = 7;
const RESET_TOKEN_EXPIRY_HOURS = 1;

export class AuthService {
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Self-registration — restricted to bootstrap admin emails only
   */
  async register(data: UserCreate): Promise<AuthResponse> {
    const email = this.normalizeEmail(data.email);
    const existingUser = await userRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Only bootstrap admin emails can self-register; all others are admin-provisioned
    const isBootstrapAdmin = config.rbac.bootstrapAdminEmails.includes(email);
    if (!isBootstrapAdmin) {
      throw new ForbiddenError('Registration is admin-provisioned. Contact your administrator.');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const role: UserRole = 'admin';

    const user = await userRepository.create({
      email,
      passwordHash,
      name: data.name,
      role,
    });

    const token = this.generateToken(user.id, user.role);

    return {
      user: this.formatUser(user),
      token,
    };
  }

  async login(data: UserLogin): Promise<AuthResponse> {
    const rawEmail = data.email.trim();
    const normalizedEmail = this.normalizeEmail(data.email);
    const user =
      await userRepository.findByEmail(normalizedEmail)
      || (rawEmail !== normalizedEmail ? await userRepository.findByEmail(rawEmail) : null);

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.passwordHash || typeof user.passwordHash !== 'string') {
      logger.warn('Rejecting login due to missing password hash on user record', {
        userId: user.id,
        email: normalizedEmail,
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    } catch (error) {
      logger.warn('Rejecting login due to invalid password hash format', {
        userId: user.id,
        email: normalizedEmail,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.role);

    return {
      user: this.formatUser(user),
      token,
    };
  }

  async getUser(userId: string): Promise<User> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return this.formatUser(user);
  }

  /**
   * Admin-provisioned user creation
   * Creates a user with an unusable password and generates a welcome token
   */
  async createProvisionedUser(data: { name: string; email: string; role: UserRole }): Promise<{ user: User; welcomeToken: string }> {
    const email = this.normalizeEmail(data.email);
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Create user with random unusable password
    const randomPassword = crypto.randomBytes(64).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, SALT_ROUNDS);

    const user = await userRepository.create({
      email,
      passwordHash,
      name: data.name,
      role: data.role,
    });

    // Generate welcome token
    const welcomeToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + WELCOME_TOKEN_EXPIRY_DAYS);

    await passwordTokenRepository.create({
      userId: user.id,
      token: welcomeToken,
      type: 'welcome',
      expiresAt,
    });

    logger.info(`Provisioned user ${user.email} with role ${data.role}`);

    return {
      user: this.formatUser(user),
      welcomeToken,
    };
  }

  /**
   * Validate a password token (welcome or reset) without consuming it
   */
  async validateToken(token: string): Promise<{ userId: string; userName: string; userRole: string; type: 'welcome' | 'reset' }> {
    const tokenDoc = await passwordTokenRepository.findByToken(token);

    if (!tokenDoc) {
      throw new NotFoundError('Invalid or expired token');
    }

    if (tokenDoc.usedAt) {
      throw new ForbiddenError('This token has already been used');
    }

    if (new Date() > tokenDoc.expiresAt) {
      throw new ForbiddenError('This token has expired. Contact your administrator.');
    }

    const user = await userRepository.findById(tokenDoc.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      userId: user.id,
      userName: user.name || '',
      userRole: normalizeRole(user.role),
      type: tokenDoc.type,
    };
  }

  /**
   * Set password using a token (welcome or reset)
   */
  async setPassword(token: string, password: string): Promise<void> {
    const tokenDoc = await passwordTokenRepository.findByToken(token);

    if (!tokenDoc) {
      throw new NotFoundError('Invalid or expired token');
    }

    if (tokenDoc.usedAt) {
      throw new ForbiddenError('This token has already been used');
    }

    if (new Date() > tokenDoc.expiresAt) {
      throw new ForbiddenError('This token has expired. Contact your administrator.');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await userRepository.updatePassword(tokenDoc.userId, passwordHash);
    await passwordTokenRepository.markUsed(tokenDoc.id);

    logger.info(`Password set for user ${tokenDoc.userId} via ${tokenDoc.type} token`);
  }

  /**
   * Request a password reset — sends a reset token
   * Always returns success to avoid email enumeration
   */
  async requestPasswordReset(email: string): Promise<{ resetToken: string | null; userName: string | null }> {
    const user = await userRepository.findByEmail(this.normalizeEmail(email));

    if (!user) {
      // Don't reveal if email exists
      return { resetToken: null, userName: null };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

    await passwordTokenRepository.create({
      userId: user.id,
      token: resetToken,
      type: 'reset',
      expiresAt,
    });

    logger.info(`Password reset requested for ${email}`);

    return { resetToken, userName: user.name || null };
  }

  /**
   * Mark user onboarding as completed
   */
  async completeOnboarding(userId: string): Promise<void> {
    await userRepository.updateOnboardingCompleted(userId);
  }

  private generateToken(userId: string, role: string): string {
    return jwt.sign({ userId, role }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as string,
    } as jwt.SignOptions);
  }

  private formatUser(user: any): User {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: normalizeRole(user.role),
      onboardingCompleted: user.onboardingCompleted ?? false,
      passwordSetAt: user.passwordSetAt ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userRepository } from '../db/repositories/mongo';
import { config } from '../config';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import type { User, UserCreate, UserLogin, AuthResponse } from '@playwright-web-app/shared';

const SALT_ROUNDS = 10;

export class AuthService {
  async register(data: UserCreate): Promise<AuthResponse> {
    const existingUser = await userRepository.findByEmail(data.email);

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await userRepository.create({
      email: data.email,
      passwordHash,
      name: data.name,
      role: 'qa_tester'
    });

    const token = this.generateToken(user.id);

    return {
      user: this.formatUser(user),
      token,
    };
  }

  async login(data: UserLogin): Promise<AuthResponse> {
    const user = await userRepository.findByEmail(data.email);

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = this.generateToken(user.id);

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

  private generateToken(userId: string): string {
    return jwt.sign({ userId }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as string,
    } as jwt.SignOptions);
  }

  private formatUser(user: any): User {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

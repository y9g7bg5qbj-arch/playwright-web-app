import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { config } from '../config';
import { NotFoundError } from '../utils/errors';

const SALT_ROUNDS = 10;

export class AgentService {
  async createAgent(userId: string, name: string): Promise<{ agentId: string; token: string }> {
    // Generate a random token
    const randomToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(randomToken, SALT_ROUNDS);

    // Create agent in database
    const agent = await prisma.agent.create({
      data: {
        userId,
        name,
        tokenHash,
        status: 'offline',
      },
    });

    // Generate JWT token
    const jwtToken = jwt.sign({ agentId: agent.id }, config.jwt.secret, {
      expiresIn: '7d', // Agents get longer-lived tokens
    });

    return {
      agentId: agent.id,
      token: jwtToken,
    };
  }

  async listAgents(userId: string) {
    return prisma.agent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAgent(agentId: string) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    return agent;
  }

  async deleteAgent(agentId: string, userId: string) {
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        userId,
      },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    await prisma.agent.delete({
      where: { id: agentId },
    });
  }

  async updateAgentStatus(agentId: string, status: string) {
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        status,
        lastSeenAt: new Date(),
      },
    });
  }
}

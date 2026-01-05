import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    type: 'prisma' as const,
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  storage: {
    path: path.resolve(process.env.STORAGE_PATH || './storage'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  },

  agent: {
    tokenExpiresIn: process.env.AGENT_TOKEN_EXPIRES_IN || '30d',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  agentName: process.env.AGENT_NAME || 'Local Agent',
  serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
  agentToken: process.env.AGENT_TOKEN || '',

  storage: {
    path: path.resolve(process.env.STORAGE_PATH || './storage'),
  },

  heartbeatInterval: 30000, // 30 seconds
};

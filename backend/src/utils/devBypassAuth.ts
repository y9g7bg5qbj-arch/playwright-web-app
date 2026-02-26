import { config } from '../config';

export const DEV_BYPASS_USER_ID = '4a6ceb7d-9883-44e9-bfd3-6a1cd2557ffc';

export function isDevBypassEnabled(): boolean {
  return config.nodeEnv === 'development' && process.env.BYPASS_AUTH === 'true';
}

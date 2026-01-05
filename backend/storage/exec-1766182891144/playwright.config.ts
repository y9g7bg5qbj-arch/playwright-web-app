
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'test.spec.ts',
  use: {
    headless: false,
    trace: 'retain-on-failure',
  },
  outputDir: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/backend/storage/exec-1766182891144/trace',
});

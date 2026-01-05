
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'test.spec.ts',
  use: {
    headless: false,
    trace: 'off',
  },
  outputDir: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/backend/storage/exec-1766183332338/trace',
});

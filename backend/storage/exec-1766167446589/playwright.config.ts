
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'test.spec.ts',
  use: {
    headless: false,
    trace: 'on', // Always record traces
  },
  outputDir: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/backend/storage/exec-1766167446589/trace',
});

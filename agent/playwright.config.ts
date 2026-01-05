import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './storage',
  timeout: 60000,
  use: {
    headless: false,
    screenshot: 'on', // Capture screenshot after each action
    trace: 'on', // Capture trace with element highlighting
    video: 'retain-on-failure',
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
  ],
});


import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'test.spec.ts',
  use: {
    headless: false,
    trace: 'on',
  },
  timeout: 0,  // No timeout in debug mode
});

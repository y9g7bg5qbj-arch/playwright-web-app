import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './output',
    timeout: 30000,
    retries: 0,
    use: {
        headless: true,
        screenshot: 'only-on-failure',
        trace: 'on-first-retry',
    },
});

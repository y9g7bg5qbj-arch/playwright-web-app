import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './output',
    fullyParallel: true,  // Enable test-level parallelism
    workers: 4,           // Run 4 browser instances simultaneously
    timeout: 30000,
    retries: 0,
    reporter: [
        ['list'],
        ['allure-playwright', { resultsDir: 'allure-results' }],
    ],
    use: {
        headless: true,
        screenshot: 'only-on-failure',
        trace: 'on-first-retry',
    },
});


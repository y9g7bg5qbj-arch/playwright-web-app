import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for parallel sharding demo tests
 */
export default defineConfig({
    testDir: './',

    // Run tests in parallel - this is key for sharding
    fullyParallel: true,

    // Retry failed tests once
    retries: 1,

    // Use 2 workers per shard
    workers: 2,

    // Reporter configuration
    reporter: [
        ['html', { open: 'never' }],
        ['list'],
    ],

    // Timeout settings
    timeout: 30000,

    use: {
        // Base URL for Playwright website tests
        baseURL: 'https://playwright.dev',

        // Collect trace on failure
        trace: 'on-first-retry',

        // Take screenshot on failure
        screenshot: 'only-on-failure',

        // Headless mode (set to false to watch tests run)
        headless: true,
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});

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

    // Reporter configuration - include JSON and Allure for rich reports
    reporter: [
        ['html', { open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['allure-playwright', { resultsDir: 'allure-results' }],
        ['list'],
    ],

    // Timeout settings
    timeout: 30000,

    use: {
        // Base URL for Playwright website tests
        baseURL: 'https://playwright.dev',

        // Collect trace for all tests (enables trace viewer in reports)
        trace: 'retain-on-failure',

        // Take screenshot for all tests
        screenshot: 'on',

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

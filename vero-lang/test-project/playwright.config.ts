import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './output',
    fullyParallel: true,  // Enable test-level parallelism
    workers: 4,           // Run 4 browser instances simultaneously
    timeout: 30000,
    retries: 0,
    reporter: [
        ['list'],
        ['json', { outputFile: 'test-results/results.json' }],
        ['allure-playwright', { resultsDir: 'allure-results' }],
    ],
    use: {
        headless: true,
        screenshot: 'on',  // Always capture screenshots for evidence
        trace: 'on',  // Always capture trace for all tests
    },
});


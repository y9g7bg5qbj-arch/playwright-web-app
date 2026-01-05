// Auto-generated from Vero DSL
import { test, expect, Page } from '@playwright/test';

test.describe('AmazonSearch', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('https://www.amazon.com');
        await page.waitForTimeout(2000);
    });

    test('Search for soccer ball and get top 3 results', async ({ page }) => { // @smoke
        await amazonpage.search(page, "soccer ball");
        await expect(amazonpage.searchResults(page)).toBeVisible();
        await test.step('Log: Search completed - getting top 3 results', async () => { console.log('Search completed - getting top 3 results'); await testInfo.attach('log', { body: JSON.stringify({ level: 'info', message: 'Search completed - getting top 3 results', timestamp: new Date().toISOString() }), contentType: 'application/json' }); });
    });

});

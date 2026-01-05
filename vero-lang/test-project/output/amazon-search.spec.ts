// Generated from Vero DSL (manually corrected)
import { test, expect, Page } from '@playwright/test';

// Page Object: AmazonPage
const amazonpage = {
    searchBox: (page: Page) => page.locator('#twotabsearchtextbox'),
    searchButton: (page: Page) => page.locator('#nav-search-submit-button'),
    searchResults: (page: Page) => page.locator('[data-component-type="s-search-result"]'),
    resultTitle: (page: Page) => page.locator('h2 a span'),

    search: async (page: Page, term: string) => {
        await amazonpage.searchBox(page).fill(term);
        await amazonpage.searchButton(page).click();
        await page.waitForTimeout(2000);
    },
};

test.describe('AmazonSearch', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('https://www.amazon.com');
        await page.waitForTimeout(2000);
    });

    test('Search for soccer ball and get top 3 results', async ({ page }) => { // Tags: @smoke
        await amazonpage.search(page, 'soccer ball');
        await expect(amazonpage.searchResults(page).first()).toBeVisible({ timeout: 10000 });

        // Get top 3 search results
        const results = amazonpage.searchResults(page);
        const count = await results.count();
        console.log(`Found ${count} search results`);

        const topResults: string[] = [];
        for (let i = 0; i < Math.min(3, count); i++) {
            const title = await results.nth(i).locator('h2 a span').textContent();
            if (title) {
                topResults.push(title.trim());
                console.log(`Result ${i + 1}: ${title.trim()}`);
            }
        }

        expect(topResults.length).toBeGreaterThan(0);
        console.log('Search completed - got top 3 results');
    });
});

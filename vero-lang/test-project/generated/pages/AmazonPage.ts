import { Page, Locator } from '@playwright/test';

export class AmazonPage {
  readonly page: Page;
  readonly searchBox: Locator;
  readonly searchButton: Locator;
  readonly searchResults: Locator;
  readonly resultTitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchBox = page.locator('#twotabsearchtextbox');
    this.searchButton = page.locator('#nav-search-submit-button');
    this.searchResults = page.locator('[data-component-type='s-search-result']');
    this.resultTitle = page.getByText('h2 a span');
  }

  async search(term: string) {
    await test.step('Fill searchBox', async () => { await this.searchBox.fill(term); });
    await test.step('Click searchButton', async () => { await this.searchButton.click(); });
    await test.step('Wait 2 seconds', async () => { await page.waitForTimeout(2000); });
  }
}
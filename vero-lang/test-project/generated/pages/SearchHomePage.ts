import { Page, Locator } from '@playwright/test';

export class SearchHomePage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchResults: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('[name='q']');
    this.searchResults = page.locator('#search');
  }

  async searchFor(query: string) {
    await test.step('Fill searchInput', async () => { await this.searchInput.fill(query); });
    await test.step('Press Enter', async () => { await page.keyboard.press('Enter'); });
  }
}
import { Page, Locator } from '@playwright/test';

export class SearchHomePage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchResults: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByRole('combobox');
    this.searchResults = page.locator('#search');
  }

  async searchFor(query: string) {
    await this.searchInput.fill(query);
    await page.keyboard.press('Enter');
  }
}
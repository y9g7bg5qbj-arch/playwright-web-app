import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly heroHeading: Locator;
  readonly signUpButton: Locator;
  readonly loginLink: Locator;
  readonly searchInput: Locator;
  baseUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.heroHeading = page.getByText('h1.hero-title');
    this.signUpButton = page.getByRole('button', { name: 'Sign Up' });
    this.loginLink = page.getByRole('link', { name: 'Log In' });
    this.searchInput = page.getByPlaceholder('Search...');
    this.baseUrl = 'https://example.com';
  }

  async navigateToSignUp() {
    await this.signUpButton.click();
  }

  async navigateToLogin() {
    await this.loginLink.click();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await page.keyboard.press('Enter');
  }
}
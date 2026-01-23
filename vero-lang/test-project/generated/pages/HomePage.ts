import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly learnMore: Locator;
  readonly header: Locator;
  readonly aclick: Locator;
  readonly signUpButton: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByText('h1');
    this.learnMore = page.locator('a:has-text('More information')');
    this.header = page.locator('#header');
    this.aclick = page.locator('a:has-text('IANA-managed Reserved Domains')');
    this.signUpButton = page.locator('button:has-text('Sign Up')');
    this.loginLink = page.locator('a:has-text('Log In')');
  }

  async navigateToSignUp() {
    await test.step('Click HomePage.signUpButton', async () => { await this.signUpButton.click(); });
  }

  async navigateToLogin() {
    await test.step('Click HomePage.loginLink', async () => { await this.loginLink.click(); });
  }
}
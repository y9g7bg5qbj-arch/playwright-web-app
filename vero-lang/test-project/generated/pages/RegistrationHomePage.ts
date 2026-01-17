import { Page, Locator } from '@playwright/test';

export class RegistrationHomePage {
  readonly page: Page;
  readonly heroHeading: Locator;
  readonly signUpButton: Locator;
  readonly loginLink: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroHeading = page.getByText('h1.hero-title');
    this.signUpButton = page.locator('button:has-text('Sign Up')');
    this.loginLink = page.locator('a:has-text('Log In')');
    this.searchInput = page.locator('[placeholder='Search...']');
  }

  async navigateToSignUp() {
    await test.step('Click RegistrationHomePage.signUpButton', async () => { await registrationHomePage.signUpButton.click(); });
  }

  async navigateToLogin() {
    await test.step('Click RegistrationHomePage.loginLink', async () => { await registrationHomePage.loginLink.click(); });
  }

  async search(query: string) {
    await test.step('Fill RegistrationHomePage.searchInput', async () => { await registrationHomePage.searchInput.fill(query); });
    await test.step('Press Enter', async () => { await page.keyboard.press('Enter'); });
  }
}
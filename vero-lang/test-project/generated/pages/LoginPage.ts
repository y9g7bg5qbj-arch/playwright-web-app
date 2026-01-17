import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[name=email], [type=email], input[placeholder*='Email']');
    this.passwordInput = page.locator('[name=password], [type=password]');
    this.submitBtn = page.locator('[type=submit], button:has-text('Sign In')');
  }

  async login(email: string, password: string) {
    await test.step('Fill LoginPage.emailInput', async () => { await loginPage.emailInput.fill(email); });
    await test.step('Fill LoginPage.passwordInput', async () => { await loginPage.passwordInput.fill(password); });
    await test.step('Click LoginPage.submitBtn', async () => { await loginPage.submitBtn.click(); });
  }
}
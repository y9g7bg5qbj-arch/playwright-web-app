import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitBtn: Locator;
  readonly errorMessage: Locator;
  readonly rememberMeCheckbox: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[name=email], [type=email], input[placeholder*=\'Email\']');
    this.passwordInput = page.locator('[name=password], [type=password]');
    this.submitBtn = page.locator('[type=submit], button:has-text(\'Sign In\')');
    this.errorMessage = page.locator('.error-message, [role=alert]');
    this.rememberMeCheckbox = page.locator('[type=checkbox]');
  }
}
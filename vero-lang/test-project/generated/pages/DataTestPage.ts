import { Page, Locator } from '@playwright/test';

export class DataTestPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly submitBtn: Locator;
  readonly resultMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('#username');
    this.emailInput = page.locator('#email');
    this.submitBtn = page.locator('[type=submit]');
    this.resultMessage = page.locator('.result-message');
  }
}
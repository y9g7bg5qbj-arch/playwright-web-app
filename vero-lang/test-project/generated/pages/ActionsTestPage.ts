import { Page, Locator } from '@playwright/test';

export class ActionsTestPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitBtn: Locator;
  readonly searchBox: Locator;
  readonly agreeCheckbox: Locator;
  readonly menuIcon: Locator;
  readonly welcomeHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitBtn = page.locator('[type=submit]');
    this.searchBox = page.locator('#search');
    this.agreeCheckbox = page.locator('#agree');
    this.menuIcon = page.locator('[aria-label=Menu]');
    this.welcomeHeading = page.getByText('h1');
  }

  async login(email: string, password: string) {
    await test.step('Fill ActionsTestPage.emailInput', async () => { await this.emailInput.fill(email); });
    await test.step('Fill ActionsTestPage.passwordInput', async () => { await this.passwordInput.fill(password); });
    await test.step('Click ActionsTestPage.submitBtn', async () => { await this.submitBtn.click(); });
  }

  async search(query: string) {
    await test.step('Fill ActionsTestPage.searchBox', async () => { await this.searchBox.fill(query); });
    await test.step('Press Enter', async () => { await page.keyboard.press('Enter'); });
  }
}
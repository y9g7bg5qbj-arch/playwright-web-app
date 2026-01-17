import { Page, Locator } from '@playwright/test';

export class TestPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly contentDiv: Locator;
  readonly inputField: Locator;
  readonly submitBtn: Locator;
  readonly resultText: Locator;
  readonly counter: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByText('h1');
    this.contentDiv = page.locator('.content');
    this.inputField = page.locator('#test-input');
    this.submitBtn = page.getByText('button');
    this.resultText = page.locator('.result');
    this.counter = page.locator('#counter');
  }

  async fillAndSubmit(inputValue: string) {
    await test.step('Fill TestPage.inputField', async () => { await testPage.inputField.fill(inputValue); });
    await test.step('Click TestPage.submitBtn', async () => { await testPage.submitBtn.click(); });
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
  }
}
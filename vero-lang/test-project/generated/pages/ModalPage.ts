import { Page, Locator } from '@playwright/test';

export class ModalPage {
  readonly page: Page;
  readonly modalContainer: Locator;
  readonly modalTitle: Locator;
  readonly closeButton: Locator;
  readonly confirmButton: Locator;
  readonly inputField: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modalContainer = page.locator('.modal');
    this.modalTitle = page.locator('.modal-title');
    this.closeButton = page.locator('.modal .close-btn');
    this.confirmButton = page.locator('.modal .btn-confirm');
    this.inputField = page.locator('.modal input[type=text]');
  }

  async confirmModal() {
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
    await test.step('Click ModalPage.confirmButton', async () => { await this.confirmButton.click(); });
  }

  async dismissModal() {
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
    await test.step('Click ModalPage.closeButton', async () => { await this.closeButton.click(); });
    await test.step('Wait 500 milliseconds', async () => { await page.waitForTimeout(500); });
  }

  async fillAndConfirm(inputValue: string) {
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
    await test.step('Fill ModalPage.inputField', async () => { await this.inputField.fill(inputValue); });
    await test.step('Click ModalPage.confirmButton', async () => { await this.confirmButton.click(); });
  }
}
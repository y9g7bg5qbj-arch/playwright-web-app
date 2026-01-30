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
}
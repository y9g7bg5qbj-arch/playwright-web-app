import { Page, Locator } from '@playwright/test';

export class ExamplePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly learnMoreLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByText('h1');
    this.learnMoreLink = page.locator('a:has-text(\'More information\')');
  }
}
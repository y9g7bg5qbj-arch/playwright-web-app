import { Page, Locator } from '@playwright/test';

export class AssertionsTestPage {
  readonly page: Page;
  readonly welcomeMessage: Locator;
  readonly errorBanner: Locator;
  readonly successAlert: Locator;
  readonly pageTitle: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitBtn: Locator;
  readonly disabledBtn: Locator;
  readonly agreeCheckbox: Locator;
  readonly helpLink: Locator;
  readonly menuItems: Locator;
  readonly loadingSpinner: Locator;
  readonly priceDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeMessage = page.locator('.welcome');
    this.errorBanner = page.locator('.error-banner');
    this.successAlert = page.locator('.success-alert');
    this.pageTitle = page.getByText('h1');
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitBtn = page.locator('[type=submit]');
    this.disabledBtn = page.locator('.disabled-btn');
    this.agreeCheckbox = page.locator('#agree');
    this.helpLink = page.locator('a[href*=help]');
    this.menuItems = page.locator('.menu-item');
    this.loadingSpinner = page.locator('.loading-spinner');
    this.priceDisplay = page.locator('.price');
  }
}
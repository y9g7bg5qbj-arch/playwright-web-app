import { Page, Locator } from '@playwright/test';

export class SignUpPage {
  readonly page: Page;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly termsCheckbox: Locator;
  readonly submitBtn: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstNameInput = page.locator('[name=\'firstName\'], [placeholder*=\'First Name\']');
    this.lastNameInput = page.locator('[name=\'lastName\'], [placeholder*=\'Last Name\']');
    this.emailInput = page.locator('[name=\'email\'], [type=\'email\']');
    this.passwordInput = page.locator('[name=\'password\']');
    this.confirmPasswordInput = page.locator('[name=\'confirmPassword\']');
    this.termsCheckbox = page.locator('[type=\'checkbox\']');
    this.submitBtn = page.locator('button:has-text(\'Create Account\')');
    this.errorMessage = page.locator('[data-testid=\'error-message\']');
    this.successMessage = page.locator('[data-testid=\'success-message\']');
  }
}
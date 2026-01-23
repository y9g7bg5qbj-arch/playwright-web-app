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
    this.firstNameInput = page.locator('[name='firstName'], [placeholder*='First Name']');
    this.lastNameInput = page.locator('[name='lastName'], [placeholder*='Last Name']');
    this.emailInput = page.locator('[name='email'], [type='email']');
    this.passwordInput = page.locator('[name='password']');
    this.confirmPasswordInput = page.locator('[name='confirmPassword']');
    this.termsCheckbox = page.locator('[type='checkbox']');
    this.submitBtn = page.locator('button:has-text('Create Account')');
    this.errorMessage = page.locator('[data-testid='error-message']');
    this.successMessage = page.locator('[data-testid='success-message']');
  }

  async fillRegistrationForm(firstName: string, lastName: string, email: string, password: string) {
    await test.step('Fill SignUpPage.firstNameInput', async () => { await this.firstNameInput.fill(firstName); });
    await test.step('Fill SignUpPage.lastNameInput', async () => { await this.lastNameInput.fill(lastName); });
    await test.step('Fill SignUpPage.emailInput', async () => { await this.emailInput.fill(email); });
    await test.step('Fill SignUpPage.passwordInput', async () => { await this.passwordInput.fill(password); });
    await test.step('Fill SignUpPage.confirmPasswordInput', async () => { await this.confirmPasswordInput.fill(password); });
  }

  async acceptTerms() {
    await test.step('Check SignUpPage.termsCheckbox', async () => { await this.termsCheckbox.check(); });
  }

  async submitForm() {
    await test.step('Click SignUpPage.submitBtn', async () => { await this.submitBtn.click(); });
  }

  async register(firstName: string, lastName: string, email: string, password: string) {
    await test.step('Fill SignUpPage.firstNameInput', async () => { await this.firstNameInput.fill(firstName); });
    await test.step('Fill SignUpPage.lastNameInput', async () => { await this.lastNameInput.fill(lastName); });
    await test.step('Fill SignUpPage.emailInput', async () => { await this.emailInput.fill(email); });
    await test.step('Fill SignUpPage.passwordInput', async () => { await this.passwordInput.fill(password); });
    await test.step('Fill SignUpPage.confirmPasswordInput', async () => { await this.confirmPasswordInput.fill(password); });
    await test.step('Check SignUpPage.termsCheckbox', async () => { await this.termsCheckbox.check(); });
    await test.step('Click SignUpPage.submitBtn', async () => { await this.submitBtn.click(); });
  }
}
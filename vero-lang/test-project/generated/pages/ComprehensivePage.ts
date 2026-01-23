import { Page, Locator } from '@playwright/test';

export class ComprehensivePage {
  readonly page: Page;
  readonly welcomeMessage: Locator;
  readonly pageTitle: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly loginForm: Locator;
  readonly firstMenuItem: Locator;
  readonly activeTab: Locator;
  readonly errorMessage: Locator;
  readonly searchInput: Locator;
  readonly fileUpload: Locator;
  readonly dataTestIdButton: Locator;
  readonly ariaLabelButton: Locator;
  readonly loginButton: Locator;
  readonly dynamicRow: Locator;
  readonly usernameField: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly countrySelect: Locator;
  readonly termsCheckbox: Locator;
  readonly homeLink: Locator;
  readonly dashboardLink: Locator;
  readonly logoutButton: Locator;
  readonly loadingSpinner: Locator;
  readonly successAlert: Locator;
  readonly errorBanner: Locator;
  readonly itemCount: Locator;
  readonly dataTable: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeMessage = page.getByText('Welcome to Our Site');
    this.pageTitle = page.getByText('Dashboard');
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('.submit-btn');
    this.loginForm = page.locator('[data-form=login]');
    this.firstMenuItem = page.locator('.menu-item:first-child');
    this.activeTab = page.locator('.tab.active');
    this.errorMessage = page.locator('.form-group.error > .error-text');
    this.searchInput = page.locator('[name=search]');
    this.fileUpload = page.locator('[type=file]');
    this.dataTestIdButton = page.locator('[data-testid=submit-btn]');
    this.ariaLabelButton = page.locator('[aria-label=Close]');
    this.loginButton = page.locator('[data-testid=login]');
    this.dynamicRow = page.locator('//table[@id='results']//tr[contains(@class, 'highlight')]');
    this.usernameField = page.locator('#username');
    this.rememberMeCheckbox = page.locator('#remember-me');
    this.countrySelect = page.locator('#country');
    this.termsCheckbox = page.locator('#accept-terms');
    this.homeLink = page.locator('a[href='/']');
    this.dashboardLink = page.locator('.nav-link.dashboard');
    this.logoutButton = page.locator('[aria-label=Logout]');
    this.loadingSpinner = page.locator('.loading-spinner');
    this.successAlert = page.locator('.alert-success');
    this.errorBanner = page.locator('.alert-danger');
    this.itemCount = page.locator('.item-count');
    this.dataTable = page.locator('#data-table');
    this.tableRows = page.locator('#data-table tbody tr');
  }

  async verifyPageLoaded() {
    await expect(this.welcomeMessage).toBeVisible();
    await expect(this.loadingSpinner).not.toBeVisible();
  }

  async login(username: string, password: string) {
    await test.step('Fill ComprehensivePage.usernameField', async () => { await this.usernameField.fill(username); });
    await test.step('Fill ComprehensivePage.passwordInput', async () => { await this.passwordInput.fill(password); });
    await test.step('Click ComprehensivePage.submitButton', async () => { await this.submitButton.click(); });
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
    await expect(this.errorMessage).not.toBeVisible();
  }

  async performSearch(query: string) {
    await test.step('Fill ComprehensivePage.searchInput', async () => { await this.searchInput.fill(query); });
    await test.step('Press Enter', async () => { await page.keyboard.press('Enter'); });
    await test.step('Wait 2 seconds', async () => { await page.waitForTimeout(2000); });
  }

  async logout() {
    await test.step('Click ComprehensivePage.logoutButton', async () => { await this.logoutButton.click(); });
    await expect(this.loginButton).toBeVisible();
  }
}
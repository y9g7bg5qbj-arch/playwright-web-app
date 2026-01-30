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
    this.dynamicRow = page.locator('//table[@id=\'results\']//tr[contains(@class, \'highlight\')]');
    this.usernameField = page.locator('#username');
    this.rememberMeCheckbox = page.locator('#remember-me');
    this.countrySelect = page.locator('#country');
    this.termsCheckbox = page.locator('#accept-terms');
    this.homeLink = page.locator('a[href=\'/\']');
    this.dashboardLink = page.locator('.nav-link.dashboard');
    this.logoutButton = page.locator('[aria-label=Logout]');
    this.loadingSpinner = page.locator('.loading-spinner');
    this.successAlert = page.locator('.alert-success');
    this.errorBanner = page.locator('.alert-danger');
    this.itemCount = page.locator('.item-count');
    this.dataTable = page.locator('#data-table');
    this.tableRows = page.locator('#data-table tbody tr');
  }
}
import { Page, Locator } from '@playwright/test';

export class RegistrationDashboardPage {
  readonly page: Page;
  readonly welcomeMessage: Locator;
  readonly userAvatar: Locator;
  readonly logoutButton: Locator;
  readonly settingsLink: Locator;
  readonly notificationBell: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeMessage = page.locator('[data-testid=\'welcome-message\']');
    this.userAvatar = page.locator('[data-testid=\'user-avatar\']');
    this.logoutButton = page.locator('button:has-text(\'Log Out\')');
    this.settingsLink = page.locator('a:has-text(\'Settings\')');
    this.notificationBell = page.locator('[data-testid=\'notifications\']');
  }
}
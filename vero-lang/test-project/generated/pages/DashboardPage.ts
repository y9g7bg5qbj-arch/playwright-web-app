import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly welcomeMessage: Locator;
  readonly userAvatar: Locator;
  readonly logoutButton: Locator;
  readonly settingsLink: Locator;
  readonly notificationBell: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeMessage = page.getByTestId('welcome-message');
    this.userAvatar = page.getByTestId('user-avatar');
    this.logoutButton = page.getByRole('button', { name: 'Log Out' });
    this.settingsLink = page.getByRole('link', { name: 'Settings' });
    this.notificationBell = page.getByTestId('notifications');
  }

  async logout() {
    await this.logoutButton.click();
  }

  async openSettings() {
    await this.settingsLink.click();
  }
}
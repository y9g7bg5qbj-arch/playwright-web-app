import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await page.goto('/login');
  });

  test('User can login @smoke', async ({ page }) => {
    await loginPage.login('test@example.com', 'secret');
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

});
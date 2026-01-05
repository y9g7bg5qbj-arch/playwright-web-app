import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SignUpPage } from '../pages/SignUpPage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('UserRegistration', () => {
  let homePage: HomePage;
  let signUpPage: SignUpPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    signUpPage = new SignUpPage(page);
    dashboardPage = new DashboardPage(page);
    await page.goto('https://example.com');
  });

  test.afterEach(async ({ page }) => {
    await page.screenshot();
  });

  test('User can navigate to sign up page @smoke', async ({ page }) => {
    await homePage.navigateToSignUp();
    await expect(signUpPage.firstNameInput).toBeVisible();
    await expect(signUpPage.submitBtn).toBeVisible();
  });

  test('User can complete registration @smoke @critical', async ({ page }) => {
    await homePage.navigateToSignUp();
    await signUpPage.register('John', 'Doe', 'john.doe@example.com', 'SecurePass123!');
    await page.waitForTimeout(2000);
    await expect(dashboardPage.welcomeMessage).toBeVisible();
  });

  test('Registration fails without accepting terms @regression', async ({ page }) => {
    await homePage.navigateToSignUp();
    await signUpPage.fillRegistrationForm('Jane', 'Smith', 'jane@example.com', 'Password123!');
    await signUpPage.submitForm();
    await expect(signUpPage.errorMessage).toBeVisible();
    await expect(dashboardPage.welcomeMessage).not.toBeVisible();
  });

  test('Password fields must match @validation', async ({ page }) => {
    await homePage.navigateToSignUp();
    await signUpPage.emailInput.fill('test@example.com');
    await signUpPage.passwordInput.fill('Password123');
    await signUpPage.confirmPasswordInput.fill('DifferentPassword');
    await signUpPage.submitForm();
    await expect(signUpPage.errorMessage).toBeVisible();
  });

  test('User can logout after registration @regression', async ({ page }) => {
    await homePage.navigateToSignUp();
    await signUpPage.register('Alice', 'Wonder', 'alice@example.com', 'AlicePass123!');
    await page.waitForTimeout(1000);
    await expect(dashboardPage.welcomeMessage).toBeVisible();
    await dashboardPage.logout();
    await expect(homePage.signUpButton).toBeVisible();
  });

});
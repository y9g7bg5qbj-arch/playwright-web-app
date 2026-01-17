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
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
  });

  test.afterEach(async ({ page }) => {
    await test.step('Take screenshot', async () => { await page.screenshot(); });
  });

  test('User can navigate to sign up page @smoke', async ({ page }, testInfo) => {
    await homePage.navigateToSignUp();
    await expect(signUpPage.firstNameInput).toBeVisible();
    await expect(signUpPage.submitBtn).toBeVisible();

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('User can complete registration @smoke @critical', async ({ page }, testInfo) => {
    await homePage.navigateToSignUp();
    await signUpPage.register('John', 'Doe', 'john.doe@example.com', 'SecurePass123!');
    await test.step('Wait 2 seconds', async () => { await page.waitForTimeout(2000); });
    await expect(dashboardPage.welcomeMessage).toBeVisible();

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Registration fails without accepting terms @regression', async ({ page }, testInfo) => {
    await homePage.navigateToSignUp();
    await signUpPage.fillRegistrationForm('Jane', 'Smith', 'jane@example.com', 'Password123!');
    await signUpPage.submitForm();
    await expect(signUpPage.errorMessage).toBeVisible();
    await expect(dashboardPage.welcomeMessage).not.toBeVisible();

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Password fields must match @validation', async ({ page }, testInfo) => {
    await homePage.navigateToSignUp();
    await test.step('Fill SignUpPage.emailInput', async () => { await signUpPage.emailInput.fill('test@example.com'); });
    await test.step('Fill SignUpPage.passwordInput', async () => { await signUpPage.passwordInput.fill('Password123'); });
    await test.step('Fill SignUpPage.confirmPasswordInput', async () => { await signUpPage.confirmPasswordInput.fill('DifferentPassword'); });
    await signUpPage.submitForm();
    await expect(signUpPage.errorMessage).toBeVisible();

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('User can logout after registration @regression', async ({ page }, testInfo) => {
    await homePage.navigateToSignUp();
    await signUpPage.register('Alice', 'Wonder', 'alice@example.com', 'AlicePass123!');
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
    await expect(dashboardPage.welcomeMessage).toBeVisible();
    await dashboardPage.logout();
    await expect(homePage.signUpButton).toBeVisible();

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

});
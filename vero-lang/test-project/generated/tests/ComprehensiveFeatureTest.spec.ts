import { test, expect } from '@playwright/test';
import { ComprehensivePage } from '../pages/ComprehensivePage';
import { ModalPage } from '../pages/ModalPage';

test.describe('ComprehensiveFeatureTest', () => {
  let comprehensivePage: ComprehensivePage;
  let modalPage: ModalPage;

  test.beforeAll(async ({ page }) => {
    await test.step('Log: ' + 'Starting ComprehensiveFeatureTest suite', async () => { console.log('Starting ComprehensiveFeatureTest suite'); });
  });

  test.beforeEach(async ({ page }) => {
    comprehensivePage = new ComprehensivePage(page);
    modalPage = new ModalPage(page);
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
  });

  test.afterEach(async ({ page }) => {
    await test.step('Take screenshot as after-test', async () => { await page.screenshot({ path: 'after-test' }); });
  });

  test.afterAll(async ({ page }) => {
    await test.step('Log: ' + 'Completed ComprehensiveFeatureTest suite', async () => { console.log('Completed ComprehensiveFeatureTest suite'); });
  });

  test('Test OPEN and REFRESH navigation @navigation @smoke', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/login', async () => { await page.goto('https://example.com/login'); });
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
    await test.step('Refresh page', async () => { await page.reload(); });
    await test.step('Log: ' + 'Navigation completed', async () => { console.log('Navigation completed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test CLICK actions @interaction', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await test.step('Click ComprehensivePage.submitButton', async () => { await comprehensivePage.submitButton.click(); });
    await test.step('Log: ' + 'Clicked submit button', async () => { console.log('Clicked submit button'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test FILL actions @interaction @forms', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/form', async () => { await page.goto('https://example.com/form'); });
    await test.step('Fill ComprehensivePage.emailInput', async () => { await comprehensivePage.emailInput.fill('test@example.com'); });
    await test.step('Fill ComprehensivePage.passwordInput', async () => { await comprehensivePage.passwordInput.fill('SecurePassword123'); });
    await test.step('Fill ComprehensivePage.usernameField', async () => { await comprehensivePage.usernameField.fill('testuser'); });
    await test.step('Fill ComprehensivePage.searchInput', async () => { await comprehensivePage.searchInput.fill('search query'); });
    await test.step('Log: ' + 'All fill actions completed', async () => { console.log('All fill actions completed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test CHECK actions @interaction @checkboxes', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/preferences', async () => { await page.goto('https://example.com/preferences'); });
    await test.step('Check ComprehensivePage.rememberMeCheckbox', async () => { await comprehensivePage.rememberMeCheckbox.check(); });
    await test.step('Check ComprehensivePage.termsCheckbox', async () => { await comprehensivePage.termsCheckbox.check(); });
    await test.step('Log: ' + 'Checkboxes checked', async () => { console.log('Checkboxes checked'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test HOVER action @interaction @mouse', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await test.step('Hover ComprehensivePage.dashboardLink', async () => { await comprehensivePage.dashboardLink.hover(); });
    await test.step('Wait 500 milliseconds', async () => { await page.waitForTimeout(500); });
    await test.step('Log: ' + 'Hover completed', async () => { console.log('Hover completed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test PRESS keyboard actions @interaction @keyboard', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await test.step('Press Enter', async () => { await page.keyboard.press('Enter'); });
    await test.step('Press Tab', async () => { await page.keyboard.press('Tab'); });
    await test.step('Press Escape', async () => { await page.keyboard.press('Escape'); });
    await test.step('Log: ' + 'All keyboard actions completed', async () => { console.log('All keyboard actions completed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test WAIT actions @timing', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await test.step('Wait 2 seconds', async () => { await page.waitForTimeout(2000); });
    await test.step('Wait 500 milliseconds', async () => { await page.waitForTimeout(500); });
    await test.step('Log: ' + 'Wait actions completed', async () => { console.log('Wait actions completed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test DO page actions @pageactions', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/login', async () => { await page.goto('https://example.com/login'); });
    await comprehensivePage.login('testuser', 'password123');
    await comprehensivePage.verifyPageLoaded();
    await modalPage.dismissModal();
    await test.step('Log: ' + 'Page actions completed', async () => { console.log('Page actions completed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test TAKE SCREENSHOT and LOG @capture @logging', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await test.step('Log: ' + 'Test started', async () => { console.log('Test started'); });
    await test.step('Take screenshot as homepage-screenshot', async () => { await page.screenshot({ path: 'homepage-screenshot' }); });
    await test.step('Fill ComprehensivePage.searchInput', async () => { await comprehensivePage.searchInput.fill('test'); });
    await test.step('Take screenshot as after-search-input', async () => { await page.screenshot({ path: 'after-search-input' }); });
    await test.step('Log: ' + 'Test completed successfully', async () => { console.log('Test completed successfully'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY visibility assertions @assertions', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await expect(comprehensivePage.welcomeMessage).toBeVisible();
    await expect(comprehensivePage.errorBanner).not.toBeVisible();
    await expect(comprehensivePage.loadingSpinner).toBeHidden();
    await test.step('Log: ' + 'Visibility assertions passed', async () => { console.log('Visibility assertions passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY state assertions @assertions @state', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/form', async () => { await page.goto('https://example.com/form'); });
    await expect(comprehensivePage.submitButton).toBeEnabled();
    await test.step('Check ComprehensivePage.rememberMeCheckbox', async () => { await comprehensivePage.rememberMeCheckbox.check(); });
    await expect(comprehensivePage.rememberMeCheckbox).toBeChecked();
    await expect(comprehensivePage.emailInput).toBeEmpty();
    await test.step('Fill ComprehensivePage.emailInput', async () => { await comprehensivePage.emailInput.fill('test'); });
    await expect(comprehensivePage.emailInput).not.toBeEmpty();
    await test.step('Log: ' + 'State assertions passed', async () => { console.log('State assertions passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY URL assertions @assertions', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/dashboard', async () => { await page.goto('https://example.com/dashboard'); });
    await expect(page).toHaveURL(new RegExp('/dashboard'));
    await expect(page).toHaveURL('https://example.com/dashboard');
    await test.step('Log: ' + 'URL assertions passed', async () => { console.log('URL assertions passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY TITLE assertions @assertions', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await expect(page).toHaveTitle(new RegExp('Example'));
    await expect(page).toHaveTitle('Example Domain');
    await test.step('Log: ' + 'Title assertions passed', async () => { console.log('Title assertions passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY HAS assertions @assertions', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/list', async () => { await page.goto('https://example.com/list'); });
    await expect(comprehensivePage.tableRows).toHaveCount(10);
    await test.step('Fill ComprehensivePage.emailInput', async () => { await comprehensivePage.emailInput.fill('test@example.com'); });
    await expect(comprehensivePage.emailInput).toHaveValue('test@example.com');
    await expect(comprehensivePage.emailInput).toHaveAttribute('type', 'email');
    await test.step('Log: ' + 'HAS assertions passed', async () => { console.log('HAS assertions passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test with multiple tags @smoke @regression @critical @login', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/login', async () => { await page.goto('https://example.com/login'); });
    await test.step('Fill ComprehensivePage.usernameField', async () => { await comprehensivePage.usernameField.fill('admin'); });
    await test.step('Fill ComprehensivePage.passwordInput', async () => { await comprehensivePage.passwordInput.fill('admin123'); });
    await test.step('Click ComprehensivePage.submitButton', async () => { await comprehensivePage.submitButton.click(); });
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
    await test.step('Log: ' + 'Login test completed', async () => { console.log('Login test completed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

});
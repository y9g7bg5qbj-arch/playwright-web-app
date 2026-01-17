import { test, expect } from '@playwright/test';
import { AssertionsTestPage } from '../pages/AssertionsTestPage';

test.describe('AllAssertionsTest', () => {
  let assertionsTestPage: AssertionsTestPage;

  test.beforeEach(async ({ page }) => {
    assertionsTestPage = new AssertionsTestPage(page);
  });

  test('Test VERIFY IS VISIBLE @assertions @visiblestate', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await expect(assertionsTestPage.welcomeMessage).toBeVisible();
    await expect(assertionsTestPage.submitBtn).toBeVisible();
    await expect(assertionsTestPage.pageTitle).toBeVisible();
    await test.step('Log: ' + 'Visibility assertions passed', async () => { console.log('Visibility assertions passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY IS NOT VISIBLE @assertions @notvisible', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await expect(assertionsTestPage.errorBanner).not.toBeVisible();
    await expect(assertionsTestPage.loadingSpinner).not.toBeVisible();
    await test.step('Log: ' + 'Not visible assertions passed', async () => { console.log('Not visible assertions passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY IS HIDDEN @assertions @hiddenstate', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await expect(assertionsTestPage.errorBanner).toBeHidden();
    await expect(assertionsTestPage.loadingSpinner).toBeHidden();
    await test.step('Log: ' + 'Hidden assertions passed', async () => { console.log('Hidden assertions passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY IS ENABLED @assertions @enabledstate', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/form', async () => { await page.goto('https://example.com/form'); });
    await expect(assertionsTestPage.emailInput).toBeEnabled();
    await expect(assertionsTestPage.passwordInput).toBeEnabled();
    await expect(assertionsTestPage.submitBtn).toBeEnabled();
    await test.step('Log: ' + 'Enabled assertions passed', async () => { console.log('Enabled assertions passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY IS DISABLED @assertions @disabledstate', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/form', async () => { await page.goto('https://example.com/form'); });
    await expect(assertionsTestPage.disabledBtn).toBeDisabled();
    await test.step('Log: ' + 'Disabled assertions passed', async () => { console.log('Disabled assertions passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY IS NOT DISABLED @assertions @notdisabled', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/form', async () => { await page.goto('https://example.com/form'); });
    await expect(assertionsTestPage.submitBtn).toBeEnabled();
    await test.step('Log: ' + 'Not disabled assertions passed', async () => { console.log('Not disabled assertions passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY IS CHECKED @assertions @checkedstate', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/preferences', async () => { await page.goto('https://example.com/preferences'); });
    await test.step('Check AssertionsTestPage.agreeCheckbox', async () => { await assertionsTestPage.agreeCheckbox.check(); });
    await expect(assertionsTestPage.agreeCheckbox).toBeChecked();
    await test.step('Log: ' + 'Checked assertions passed', async () => { console.log('Checked assertions passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY IS EMPTY @assertions @emptystate', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/form', async () => { await page.goto('https://example.com/form'); });
    await expect(assertionsTestPage.emailInput).toBeEmpty();
    await test.step('Log: ' + 'Empty assertions passed', async () => { console.log('Empty assertions passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY IS NOT EMPTY @assertions @notempty', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/form', async () => { await page.goto('https://example.com/form'); });
    await test.step('Fill AssertionsTestPage.emailInput', async () => { await assertionsTestPage.emailInput.fill('test@example.com'); });
    await expect(assertionsTestPage.emailInput).not.toBeEmpty();
    await test.step('Log: ' + 'Not empty assertions passed', async () => { console.log('Not empty assertions passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY URL CONTAINS @assertions @urlcheck', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/dashboard', async () => { await page.goto('https://example.com/dashboard'); });
    await expect(page).toHaveURL(new RegExp('/dashboard'));
    await expect(page).toHaveURL(new RegExp('example.com'));
    await test.step('Log: ' + 'URL contains passed', async () => { console.log('URL contains passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY URL EQUAL @assertions @urlexact', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/', async () => { await page.goto('https://example.com/'); });
    await expect(page).toHaveURL('https://example.com/');
    await test.step('Log: ' + 'URL equals passed', async () => { console.log('URL equals passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY URL MATCHES @assertions @urlregex', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/users/123', async () => { await page.goto('https://example.com/users/123'); });
    await expect(page).toHaveURL(new RegExp('/users/.*'));
    await test.step('Log: ' + 'URL matches passed', async () => { console.log('URL matches passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY TITLE CONTAINS @assertions @titlecheck', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await expect(page).toHaveTitle(new RegExp('Example'));
    await test.step('Log: ' + 'Title contains passed', async () => { console.log('Title contains passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY TITLE EQUAL @assertions @titleexact', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await expect(page).toHaveTitle('Example Domain');
    await test.step('Log: ' + 'Title equals passed', async () => { console.log('Title equals passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY HAS COUNT @assertions @counting', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/list', async () => { await page.goto('https://example.com/list'); });
    await expect(assertionsTestPage.menuItems).toHaveCount(5);
    await test.step('Log: ' + 'Count assertions passed', async () => { console.log('Count assertions passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY HAS VALUE @assertions @valuecheck', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/form', async () => { await page.goto('https://example.com/form'); });
    await test.step('Fill AssertionsTestPage.emailInput', async () => { await assertionsTestPage.emailInput.fill('test@example.com'); });
    await expect(assertionsTestPage.emailInput).toHaveValue('test@example.com');
    await test.step('Log: ' + 'Value assertions passed', async () => { console.log('Value assertions passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test VERIFY HAS ATTRIBUTE @assertions @attrcheck', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await expect(assertionsTestPage.emailInput).toHaveAttribute('type', 'email');
    await expect(assertionsTestPage.submitBtn).toHaveAttribute('type', 'submit');
    await test.step('Log: ' + 'Attribute assertions passed', async () => { console.log('Attribute assertions passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

});
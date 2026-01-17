import { test, expect } from '@playwright/test';
import { ActionsTestPage } from '../pages/ActionsTestPage';

test.describe('AllActionsTest', () => {
  let actionsTestPage: ActionsTestPage;

  test.beforeEach(async ({ page }) => {
    actionsTestPage = new ActionsTestPage(page);
  });

  test('Test OPEN action @actions @navigation', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await test.step('Log: ' + 'Opened example.com', async () => { console.log('Opened example.com'); });
    await test.step('Navigate to ' + 'https://example.com/login', async () => { await page.goto('https://example.com/login'); });
    await test.step('Log: ' + 'Opened login page', async () => { console.log('Opened login page'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test CLICK action @actions @interaction', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await test.step('Click ActionsTestPage.submitBtn', async () => { await actionsTestPage.submitBtn.click(); });
    await test.step('Log: ' + 'Clicked submit button', async () => { console.log('Clicked submit button'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test FILL action @actions @forms', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/form', async () => { await page.goto('https://example.com/form'); });
    await test.step('Fill ActionsTestPage.emailInput', async () => { await actionsTestPage.emailInput.fill('test@example.com'); });
    await test.step('Fill ActionsTestPage.passwordInput', async () => { await actionsTestPage.passwordInput.fill('SecurePass123'); });
    await test.step('Log: ' + 'Filled form fields', async () => { console.log('Filled form fields'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test CHECK action @actions @checkboxes', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/preferences', async () => { await page.goto('https://example.com/preferences'); });
    await test.step('Check ActionsTestPage.agreeCheckbox', async () => { await actionsTestPage.agreeCheckbox.check(); });
    await test.step('Log: ' + 'Checked checkbox', async () => { console.log('Checked checkbox'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test HOVER action @actions @mouse', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await test.step('Hover ActionsTestPage.menuIcon', async () => { await actionsTestPage.menuIcon.hover(); });
    await test.step('Log: ' + 'Hovered menu icon', async () => { console.log('Hovered menu icon'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test PRESS action @actions @keyboard', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await test.step('Press Enter', async () => { await page.keyboard.press('Enter'); });
    await test.step('Press Tab', async () => { await page.keyboard.press('Tab'); });
    await test.step('Press Escape', async () => { await page.keyboard.press('Escape'); });
    await test.step('Log: ' + 'Pressed keys', async () => { console.log('Pressed keys'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test WAIT action with time @actions @timing', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
    await test.step('Log: ' + 'Waited 1 second', async () => { console.log('Waited 1 second'); });
    await test.step('Wait 500 milliseconds', async () => { await page.waitForTimeout(500); });
    await test.step('Log: ' + 'Waited 500ms', async () => { console.log('Waited 500ms'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test DO action @actions @pageaction', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/login', async () => { await page.goto('https://example.com/login'); });
    await actionsTestPage.login('user@test.com', 'password123');
    await test.step('Log: ' + 'Executed login action', async () => { console.log('Executed login action'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test REFRESH action @actions @reload', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await test.step('Refresh page', async () => { await page.reload(); });
    await test.step('Log: ' + 'Page refreshed', async () => { console.log('Page refreshed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test LOG action @actions @logging', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await test.step('Log: ' + 'Test started', async () => { console.log('Test started'); });
    await test.step('Log: ' + 'Step 1 completed', async () => { console.log('Step 1 completed'); });
    await test.step('Log: ' + 'All steps passed', async () => { console.log('All steps passed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Test TAKE SCREENSHOT action @actions @capture', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await test.step('Take screenshot as homepage.png', async () => { await page.screenshot({ path: 'homepage.png' }); });
    await test.step('Fill ActionsTestPage.emailInput', async () => { await actionsTestPage.emailInput.fill('test@example.com'); });
    await test.step('Take screenshot as after-fill.png', async () => { await page.screenshot({ path: 'after-fill.png' }); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

});
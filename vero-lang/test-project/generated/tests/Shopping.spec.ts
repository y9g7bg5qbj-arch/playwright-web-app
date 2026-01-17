import { test, expect } from '@playwright/test';
import { ProductPage } from '../pages/ProductPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';

test.describe('Shopping', () => {
  let productPage: ProductPage;
  let cartPage: CartPage;
  let checkoutPage: CheckoutPage;

  test.beforeEach(async ({ page }) => {
    productPage = new ProductPage(page);
    cartPage = new CartPage(page);
    checkoutPage = new CheckoutPage(page);
    await test.step('Navigate to ' + 'https://shop.example.com/products/laptop', async () => { await page.goto('https://shop.example.com/products/laptop'); });
  });

  test('User can add product to cart @smoke', async ({ page }, testInfo) => {
    await expect(productPage.productTitle).toBeVisible();
    await expect(productPage.addToCartBtn).toBeEnabled();
    await productPage.addToCart();
    await test.step('Wait 500 milliseconds', async () => { await page.waitForTimeout(500); });
    await expect(productPage.cartBadge).toBeVisible();

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('User can add multiple quantities @regression', async ({ page }, testInfo) => {
    await productPage.addToCartWithQuantity('3');
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
    await expect(productPage.cartBadge).toBeVisible();
    await test.step('Log: ' + 'Added 3 items to cart', async () => { console.log('Added 3 items to cart'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('User can complete checkout @smoke @e2e', async ({ page }, testInfo) => {
    await productPage.addToCart();
    await test.step('Navigate to ' + 'https://shop.example.com/cart', async () => { await page.goto('https://shop.example.com/cart'); });
    await expect(cartPage.cartItems).toBeVisible();
    await expect(cartPage.cartTotal).not.toBeEmpty();
    await cartPage.proceedToCheckout();
    await checkoutPage.fillShippingInfo('buyer@test.com', '123 Main St', 'New York', '10001');
    await checkoutPage.fillPaymentInfo('4111111111111111', '12/25', '123');
    await checkoutPage.placeOrder();
    await test.step('Wait 3 seconds', async () => { await page.waitForTimeout(3000); });
    await expect(checkoutPage.orderConfirmation).toBeVisible();
    await test.step('Take screenshot as order_complete.png', async () => { await page.screenshot({ path: 'order_complete.png' }); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Promo code applies discount @regression', async ({ page }, testInfo) => {
    await productPage.addToCart();
    await test.step('Navigate to ' + 'https://shop.example.com/cart', async () => { await page.goto('https://shop.example.com/cart'); });
    await cartPage.applyPromoCode('SAVE20');
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
    await expect(cartPage.promoSuccessMsg).toBeVisible();
    await expect(cartPage.promoErrorMsg).toBeHidden();

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Invalid promo code shows error @negative', async ({ page }, testInfo) => {
    await productPage.addToCart();
    await test.step('Navigate to ' + 'https://shop.example.com/cart', async () => { await page.goto('https://shop.example.com/cart'); });
    await cartPage.applyPromoCode('INVALIDCODE');
    await expect(cartPage.promoErrorMsg).toBeVisible();
    await expect(cartPage.promoSuccessMsg).not.toBeVisible();

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Empty cart displays message @edge', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://shop.example.com/cart', async () => { await page.goto('https://shop.example.com/cart'); });
    await expect(cartPage.emptyCartMessage).toBeVisible();
    await expect(cartPage.checkoutBtn).toBeDisabled();

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

});
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
    await page.goto('https://shop.example.com/products/laptop');
  });

  test('User can add product to cart @smoke', async ({ page }) => {
    await expect(productPage.productTitle).toBeVisible();
    await expect(productPage.addToCartBtn).toBeEnabled();
    await productPage.addToCart();
    await page.waitForTimeout(500);
    await expect(productPage.cartBadge).toBeVisible();
  });

  test('User can add multiple quantities @regression', async ({ page }) => {
    await productPage.addToCartWithQuantity('3');
    await page.waitForTimeout(1000);
    await expect(productPage.cartBadge).toBeVisible();
    console.log('Added 3 items to cart');
  });

  test('User can complete checkout @smoke @e2e', async ({ page }) => {
    await productPage.addToCart();
    await page.goto('https://shop.example.com/cart');
    await expect(cartPage.cartItems).toBeVisible();
    await expect(cartPage.cartTotal).not.toBeEmpty();
    await cartPage.proceedToCheckout();
    await checkoutPage.fillShippingInfo('buyer@test.com', '123 Main St', 'New York', '10001');
    await checkoutPage.fillPaymentInfo('4111111111111111', '12/25', '123');
    await checkoutPage.placeOrder();
    await page.waitForTimeout(3000);
    await expect(checkoutPage.orderConfirmation).toBeVisible();
    await page.screenshot({ path: 'order_complete.png' });
  });

  test('Promo code applies discount @regression', async ({ page }) => {
    await productPage.addToCart();
    await page.goto('https://shop.example.com/cart');
    await cartPage.applyPromoCode('SAVE20');
    await page.waitForTimeout(1000);
    await expect(cartPage.promoSuccessMsg).toBeVisible();
    await expect(cartPage.promoErrorMsg).toBeHidden();
  });

  test('Invalid promo code shows error @negative', async ({ page }) => {
    await productPage.addToCart();
    await page.goto('https://shop.example.com/cart');
    await cartPage.applyPromoCode('INVALIDCODE');
    await expect(cartPage.promoErrorMsg).toBeVisible();
    await expect(cartPage.promoSuccessMsg).not.toBeVisible();
  });

  test('Empty cart displays message @edge', async ({ page }) => {
    await page.goto('https://shop.example.com/cart');
    await expect(cartPage.emptyCartMessage).toBeVisible();
    await expect(cartPage.checkoutBtn).toBeDisabled();
  });

});
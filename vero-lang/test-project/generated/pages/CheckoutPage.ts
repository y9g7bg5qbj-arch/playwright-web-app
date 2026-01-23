import { Page, Locator } from '@playwright/test';

export class CheckoutPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly addressInput: Locator;
  readonly cityInput: Locator;
  readonly zipInput: Locator;
  readonly cardNumberInput: Locator;
  readonly expiryInput: Locator;
  readonly cvvInput: Locator;
  readonly placeOrderBtn: Locator;
  readonly orderConfirmation: Locator;
  readonly orderNumber: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name='email'], input[type='email']');
    this.addressInput = page.locator('input[name='address']');
    this.cityInput = page.locator('input[name='city']');
    this.zipInput = page.locator('input[name='zip'], input[placeholder*='ZIP']');
    this.cardNumberInput = page.locator('[placeholder*='Card number']');
    this.expiryInput = page.locator('[placeholder*='MM/YY']');
    this.cvvInput = page.locator('[placeholder*='CVV']');
    this.placeOrderBtn = page.locator('button:has-text('Place Order')');
    this.orderConfirmation = page.locator('[data-testid='order-confirmation']');
    this.orderNumber = page.locator('[data-testid='order-number']');
  }

  async fillShippingInfo(email: string, address: string, city: string, zip: string) {
    await test.step('Fill CheckoutPage.emailInput', async () => { await this.emailInput.fill(email); });
    await test.step('Fill CheckoutPage.addressInput', async () => { await this.addressInput.fill(address); });
    await test.step('Fill CheckoutPage.cityInput', async () => { await this.cityInput.fill(city); });
    await test.step('Fill CheckoutPage.zipInput', async () => { await this.zipInput.fill(zip); });
  }

  async fillPaymentInfo(cardNumber: string, expiry: string, cvv: string) {
    await test.step('Fill CheckoutPage.cardNumberInput', async () => { await this.cardNumberInput.fill(cardNumber); });
    await test.step('Fill CheckoutPage.expiryInput', async () => { await this.expiryInput.fill(expiry); });
    await test.step('Fill CheckoutPage.cvvInput', async () => { await this.cvvInput.fill(cvv); });
  }

  async placeOrder() {
    await test.step('Click CheckoutPage.placeOrderBtn', async () => { await this.placeOrderBtn.click(); });
  }
}
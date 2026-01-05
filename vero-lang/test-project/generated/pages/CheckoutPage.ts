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
    this.emailInput = page.getByLabel('Email');
    this.addressInput = page.getByLabel('Address');
    this.cityInput = page.getByLabel('City');
    this.zipInput = page.getByLabel('ZIP Code');
    this.cardNumberInput = page.getByPlaceholder('Card number');
    this.expiryInput = page.getByPlaceholder('MM/YY');
    this.cvvInput = page.getByPlaceholder('CVV');
    this.placeOrderBtn = page.getByRole('button', { name: 'Place Order' });
    this.orderConfirmation = page.getByTestId('order-confirmation');
    this.orderNumber = page.getByTestId('order-number');
  }

  async fillShippingInfo(email: string, address: string, city: string, zip: string) {
    await this.emailInput.fill(email);
    await this.addressInput.fill(address);
    await this.cityInput.fill(city);
    await this.zipInput.fill(zip);
  }

  async fillPaymentInfo(cardNumber: string, expiry: string, cvv: string) {
    await this.cardNumberInput.fill(cardNumber);
    await this.expiryInput.fill(expiry);
    await this.cvvInput.fill(cvv);
  }

  async placeOrder() {
    await this.placeOrderBtn.click();
  }
}
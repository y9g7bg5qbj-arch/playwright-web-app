import { Page, Locator } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly cartItems: Locator;
  readonly cartTotal: Locator;
  readonly checkoutBtn: Locator;
  readonly emptyCartMessage: Locator;
  readonly removeItemBtn: Locator;
  readonly updateQuantityInput: Locator;
  readonly applyPromoInput: Locator;
  readonly applyPromoBtn: Locator;
  readonly promoSuccessMsg: Locator;
  readonly promoErrorMsg: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cartItems = page.getByTestId('cart-items');
    this.cartTotal = page.getByTestId('cart-total');
    this.checkoutBtn = page.getByRole('button', { name: 'Proceed to Checkout' });
    this.emptyCartMessage = page.getByTestId('empty-cart');
    this.removeItemBtn = page.getByRole('button', { name: 'Remove' });
    this.updateQuantityInput = page.getByLabel('Qty');
    this.applyPromoInput = page.getByPlaceholder('Promo code');
    this.applyPromoBtn = page.getByRole('button', { name: 'Apply' });
    this.promoSuccessMsg = page.getByTestId('promo-success');
    this.promoErrorMsg = page.getByTestId('promo-error');
  }

  async proceedToCheckout() {
    await this.checkoutBtn.click();
  }

  async removeFirstItem() {
    await this.removeItemBtn.click();
  }

  async applyPromoCode(code: string) {
    await this.applyPromoInput.fill(code);
    await this.applyPromoBtn.click();
  }
}
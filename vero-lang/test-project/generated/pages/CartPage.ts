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
    this.cartItems = page.locator('[data-testid=\'cart-items\']');
    this.cartTotal = page.locator('[data-testid=\'cart-total\']');
    this.checkoutBtn = page.locator('button:has-text(\'Proceed to Checkout\')');
    this.emptyCartMessage = page.locator('[data-testid=\'empty-cart\']');
    this.removeItemBtn = page.locator('button:has-text(\'Remove\')');
    this.updateQuantityInput = page.locator('input[name=\'qty\']');
    this.applyPromoInput = page.locator('[placeholder*=\'Promo\']');
    this.applyPromoBtn = page.locator('button:has-text(\'Apply\')');
    this.promoSuccessMsg = page.locator('[data-testid=\'promo-success\']');
    this.promoErrorMsg = page.locator('[data-testid=\'promo-error\']');
  }
}
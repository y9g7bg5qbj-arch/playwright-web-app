import { Page, Locator } from '@playwright/test';

export class ProductPage {
  readonly page: Page;
  readonly productTitle: Locator;
  readonly productPrice: Locator;
  readonly quantityInput: Locator;
  readonly addToCartBtn: Locator;
  readonly wishlistBtn: Locator;
  readonly reviewsSection: Locator;
  readonly ratingStars: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productTitle = page.locator('[data-testid='product-title']');
    this.productPrice = page.locator('[data-testid='product-price']');
    this.quantityInput = page.locator('[name='quantity'], input[placeholder*='Quantity']');
    this.addToCartBtn = page.locator('button:has-text('Add to Cart')');
    this.wishlistBtn = page.locator('button:has-text('Add to Wishlist')');
    this.reviewsSection = page.locator('[data-testid='reviews']');
    this.ratingStars = page.locator('[data-testid='rating']');
    this.cartBadge = page.locator('[data-testid='cart-count']');
  }

  async addToCart() {
    await test.step('Click ProductPage.addToCartBtn', async () => { await productPage.addToCartBtn.click(); });
  }

  async addToCartWithQuantity(quantity: string) {
    await test.step('Fill ProductPage.quantityInput', async () => { await productPage.quantityInput.fill(quantity); });
    await test.step('Click ProductPage.addToCartBtn', async () => { await productPage.addToCartBtn.click(); });
  }

  async addToWishlist() {
    await test.step('Click ProductPage.wishlistBtn', async () => { await productPage.wishlistBtn.click(); });
  }
}
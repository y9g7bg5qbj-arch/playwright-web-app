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
    this.productTitle = page.getByTestId('product-title');
    this.productPrice = page.getByTestId('product-price');
    this.quantityInput = page.getByLabel('Quantity');
    this.addToCartBtn = page.getByRole('button', { name: 'Add to Cart' });
    this.wishlistBtn = page.getByRole('button', { name: 'Add to Wishlist' });
    this.reviewsSection = page.getByTestId('reviews');
    this.ratingStars = page.getByTestId('rating');
    this.cartBadge = page.getByTestId('cart-count');
  }

  async addToCart() {
    await this.addToCartBtn.click();
  }

  async addToCartWithQuantity(quantity: string) {
    await this.quantityInput.fill(quantity);
    await this.addToCartBtn.click();
  }

  async addToWishlist() {
    await this.wishlistBtn.click();
  }
}
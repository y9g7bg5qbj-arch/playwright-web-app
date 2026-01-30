import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly learnMore: Locator;
  readonly header: Locator;
  readonly aclick: Locator;
  readonly signUpButton: Locator;
  readonly loginLink: Locator;
  readonly myidOrUsernametextbox: Locator;
  readonly keepMeSignedIntext: Locator;
  readonly nextbutton: Locator;
  readonly passwordtextbox: Locator;
  readonly clickelement: Locator;
  readonly verifybutton: Locator;
  readonly launchAppApexUatlink: Locator;
  readonly backToSignInlink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByText('h1');
    this.learnMore = page.locator('a:has-text(\'More information\')');
    this.header = page.locator('#header');
    this.aclick = page.locator('a:has-text(\'IANA-managed Reserved Domains\')');
    this.signUpButton = page.locator('button:has-text(\'Sign Up\')');
    this.loginLink = page.locator('a:has-text(\'Log In\')');
    this.myidOrUsernametextbox = page.locator('[name=\'username\'], [placeholder*=\'myID\']');
    this.keepMeSignedIntext = page.getByText('text=Keep me signed in');
    this.nextbutton = page.locator('button:has-text(\'Next\')');
    this.passwordtextbox = page.locator('[name=\'password\'], [type=\'password\']');
    this.clickelement = page.getByText('span');
    this.verifybutton = page.locator('button:has-text(\'Verify\')');
    this.launchAppApexUatlink = page.locator('a:has-text(\'launch app APEX UAT\')');
    this.backToSignInlink = page.locator('a:has-text(\'Back to sign in\')');
  }
}
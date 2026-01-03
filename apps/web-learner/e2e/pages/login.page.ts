import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Login Page Object
 *
 * Handles authentication flow interactions:
 * - Email/password login
 * - MFA verification
 * - SSO login (Google, Microsoft, Clever)
 * - Password reset
 * - Remember me
 * - Error handling
 */

export class LoginPage extends BasePage {
  protected readonly path = '/login';

  constructor(page: Page) {
    super(page);
  }

  // ============================================================================
  // LOCATORS - FORM ELEMENTS
  // ============================================================================

  get emailInput(): Locator {
    return this.page.getByLabel(/email/i);
  }

  get passwordInput(): Locator {
    return this.page.getByLabel(/password/i);
  }

  get rememberMeCheckbox(): Locator {
    return this.page.getByRole('checkbox', { name: /remember me/i });
  }

  get submitButton(): Locator {
    return this.page.getByRole('button', { name: /sign in|log in|login/i });
  }

  get forgotPasswordLink(): Locator {
    return this.page.getByRole('link', { name: /forgot password/i });
  }

  get signUpLink(): Locator {
    return this.page.getByRole('link', { name: /sign up|create account|register/i });
  }

  // ============================================================================
  // LOCATORS - ERROR MESSAGES
  // ============================================================================

  get emailError(): Locator {
    return this.page.locator('[data-testid="email-error"], #email-error');
  }

  get passwordError(): Locator {
    return this.page.locator('[data-testid="password-error"], #password-error');
  }

  get errorMessage(): Locator {
    return this.page.getByRole('alert').filter({ hasText: /error|invalid|failed/i });
  }

  get generalError(): Locator {
    return this.page.locator('[data-testid="login-error"]');
  }

  // ============================================================================
  // LOCATORS - MFA
  // ============================================================================

  get mfaInput(): Locator {
    return this.page.getByLabel(/verification code|mfa code|authenticator/i);
  }

  get mfaSubmitButton(): Locator {
    return this.page.getByRole('button', { name: /verify|submit|confirm/i });
  }

  get resendMfaButton(): Locator {
    return this.page.getByRole('button', { name: /resend/i });
  }

  get mfaError(): Locator {
    return this.page.locator('[data-testid="mfa-error"]');
  }

  // ============================================================================
  // LOCATORS - SSO BUTTONS
  // ============================================================================

  get googleLoginButton(): Locator {
    return this.page.getByRole('button', { name: /google|sign in with google/i });
  }

  get microsoftLoginButton(): Locator {
    return this.page.getByRole('button', { name: /microsoft|sign in with microsoft/i });
  }

  get cleverLoginButton(): Locator {
    return this.page.getByRole('button', { name: /clever|sign in with clever/i });
  }

  get ssoSection(): Locator {
    return this.page.locator('[data-testid="sso-section"]');
  }

  // ============================================================================
  // LOCATORS - PASSWORD VISIBILITY
  // ============================================================================

  get showPasswordButton(): Locator {
    return this.page.getByRole('button', { name: /show password|toggle password/i });
  }

  get hidePasswordButton(): Locator {
    return this.page.getByRole('button', { name: /hide password/i });
  }

  // ============================================================================
  // ACTIONS - BASIC LOGIN
  // ============================================================================

  /**
   * Fill email input
   */
  async fillEmail(email: string): Promise<void> {
    await this.fillInput(this.emailInput, email);
  }

  /**
   * Fill password input
   */
  async fillPassword(password: string): Promise<void> {
    await this.fillInput(this.passwordInput, password);
  }

  /**
   * Check remember me checkbox
   */
  async checkRememberMe(): Promise<void> {
    if (!(await this.rememberMeCheckbox.isChecked())) {
      await this.rememberMeCheckbox.check();
    }
  }

  /**
   * Uncheck remember me checkbox
   */
  async uncheckRememberMe(): Promise<void> {
    if (await this.rememberMeCheckbox.isChecked()) {
      await this.rememberMeCheckbox.uncheck();
    }
  }

  /**
   * Submit the login form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Complete login with email and password
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  /**
   * Login and wait for dashboard
   */
  async loginAndWaitForDashboard(email: string, password: string): Promise<void> {
    await this.login(email, password);
    await this.waitForUrl(/\/dashboard/);
  }

  /**
   * Login with remember me option
   */
  async loginWithRememberMe(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.checkRememberMe();
    await this.submit();
  }

  // ============================================================================
  // ACTIONS - MFA
  // ============================================================================

  /**
   * Enter MFA code
   */
  async enterMfaCode(code: string): Promise<void> {
    await this.fillInput(this.mfaInput, code);
    await this.mfaSubmitButton.click();
  }

  /**
   * Request new MFA code
   */
  async resendMfaCode(): Promise<void> {
    await this.resendMfaButton.click();
  }

  /**
   * Complete login with MFA
   */
  async loginWithMfa(email: string, password: string, mfaCode: string): Promise<void> {
    await this.login(email, password);
    await expect(this.mfaInput).toBeVisible();
    await this.enterMfaCode(mfaCode);
  }

  // ============================================================================
  // ACTIONS - SSO
  // ============================================================================

  /**
   * Initiate Google SSO login
   */
  async clickGoogleLogin(): Promise<void> {
    await this.googleLoginButton.click();
  }

  /**
   * Initiate Microsoft SSO login
   */
  async clickMicrosoftLogin(): Promise<void> {
    await this.microsoftLoginButton.click();
  }

  /**
   * Initiate Clever SSO login
   */
  async clickCleverLogin(): Promise<void> {
    await this.cleverLoginButton.click();
  }

  // ============================================================================
  // ACTIONS - PASSWORD
  // ============================================================================

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility(): Promise<void> {
    const showButton = this.showPasswordButton;
    const hideButton = this.hidePasswordButton;

    if (await showButton.isVisible()) {
      await showButton.click();
    } else if (await hideButton.isVisible()) {
      await hideButton.click();
    }
  }

  /**
   * Navigate to forgot password page
   */
  async goToForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
    await this.waitForUrl(/\/forgot-password/);
  }

  /**
   * Navigate to sign up page
   */
  async goToSignUp(): Promise<void> {
    await this.signUpLink.click();
    await this.waitForUrl(/\/sign-up|\/register/);
  }

  // ============================================================================
  // ASSERTIONS
  // ============================================================================

  /**
   * Assert login page is displayed
   */
  async assertPageDisplayed(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Assert email validation error
   */
  async assertEmailError(expectedText?: string | RegExp): Promise<void> {
    await expect(this.emailError).toBeVisible();
    if (expectedText) {
      await expect(this.emailError).toHaveText(expectedText);
    }
  }

  /**
   * Assert password validation error
   */
  async assertPasswordError(expectedText?: string | RegExp): Promise<void> {
    await expect(this.passwordError).toBeVisible();
    if (expectedText) {
      await expect(this.passwordError).toHaveText(expectedText);
    }
  }

  /**
   * Assert general error message
   */
  async assertError(expectedText?: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    if (expectedText) {
      await expect(this.errorMessage).toHaveText(expectedText);
    }
  }

  /**
   * Assert MFA prompt is displayed
   */
  async assertMfaPromptDisplayed(): Promise<void> {
    await expect(this.mfaInput).toBeVisible();
    await expect(this.mfaSubmitButton).toBeVisible();
  }

  /**
   * Assert MFA error
   */
  async assertMfaError(expectedText?: string | RegExp): Promise<void> {
    await expect(this.mfaError).toBeVisible();
    if (expectedText) {
      await expect(this.mfaError).toHaveText(expectedText);
    }
  }

  /**
   * Assert SSO options are displayed
   */
  async assertSsoOptionsDisplayed(): Promise<void> {
    await expect(this.googleLoginButton).toBeVisible();
    await expect(this.microsoftLoginButton).toBeVisible();
  }

  /**
   * Assert password is visible (as text)
   */
  async assertPasswordVisible(): Promise<void> {
    await expect(this.passwordInput).toHaveAttribute('type', 'text');
  }

  /**
   * Assert password is hidden (masked)
   */
  async assertPasswordHidden(): Promise<void> {
    await expect(this.passwordInput).toHaveAttribute('type', 'password');
  }

  /**
   * Assert form is in loading state
   */
  async assertLoading(): Promise<void> {
    await expect(this.submitButton).toBeDisabled();
  }

  /**
   * Assert form is not loading
   */
  async assertNotLoading(): Promise<void> {
    await expect(this.submitButton).toBeEnabled();
  }

  /**
   * Assert redirected to dashboard after login
   */
  async assertRedirectedToDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard/);
  }
}

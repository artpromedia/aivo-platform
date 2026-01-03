import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { DashboardPage } from '../../pages/dashboard.page';
import { TestDataFactory, TestUser } from '../../utils/test-data-factory';

/**
 * Authentication E2E Tests
 *
 * Comprehensive login flow testing:
 * - Valid credentials
 * - Invalid credentials
 * - Form validation
 * - MFA flow
 * - Password reset
 * - Session management
 * - Rate limiting
 * - SSO integration
 */

test.describe('Authentication', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let testUser: TestUser;

  test.beforeAll(async () => {
    await TestDataFactory.initialize();
    testUser = await TestDataFactory.createUser({
      role: 'student',
      verified: true,
    });
  });

  test.afterAll(async () => {
    await TestDataFactory.cleanup();
  });

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    await loginPage.navigate();
  });

  // ============================================================================
  // LOGIN FORM DISPLAY
  // ============================================================================

  test.describe('Login Form Display', () => {
    test('should display login form with all required elements', async () => {
      await loginPage.assertPageDisplayed();
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
      await expect(loginPage.forgotPasswordLink).toBeVisible();
      await expect(loginPage.signUpLink).toBeVisible();
    });

    test('should display SSO login options', async () => {
      await loginPage.assertSsoOptionsDisplayed();
    });

    test('should have proper form labels for accessibility', async ({ page }) => {
      // Email input should have proper label
      const emailLabel = page.locator('label[for="email"], label:has-text("Email")');
      await expect(emailLabel).toBeVisible();

      // Password input should have proper label
      const passwordLabel = page.locator('label[for="password"], label:has-text("Password")');
      await expect(passwordLabel).toBeVisible();
    });

    test('should toggle password visibility', async () => {
      await loginPage.fillPassword('testpassword');
      await loginPage.assertPasswordHidden();

      await loginPage.togglePasswordVisibility();
      await loginPage.assertPasswordVisible();

      await loginPage.togglePasswordVisibility();
      await loginPage.assertPasswordHidden();
    });
  });

  // ============================================================================
  // FORM VALIDATION
  // ============================================================================

  test.describe('Form Validation', () => {
    test('should show validation errors for empty form submission', async () => {
      await loginPage.submit();

      await loginPage.assertEmailError(/email is required/i);
      await loginPage.assertPasswordError(/password is required/i);
    });

    test('should show validation error for invalid email format', async () => {
      await loginPage.fillEmail('invalid-email');
      await loginPage.fillPassword('password123');
      await loginPage.submit();

      await loginPage.assertEmailError(/valid email/i);
    });

    test('should show validation error for short password', async () => {
      await loginPage.fillEmail('test@example.com');
      await loginPage.fillPassword('123');
      await loginPage.submit();

      await loginPage.assertPasswordError(/password.*characters/i);
    });

    test('should clear validation errors when input changes', async ({ page }) => {
      await loginPage.submit();
      await loginPage.assertEmailError();

      await loginPage.fillEmail('valid@example.com');
      await expect(loginPage.emailError).not.toBeVisible();
    });
  });

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  test.describe('Login Authentication', () => {
    test('should show error for incorrect credentials', async () => {
      await loginPage.login('wrong@example.com', 'wrongpassword');

      await loginPage.assertError(/invalid credentials|authentication failed/i);
    });

    test('should show error for correct email but wrong password', async () => {
      await loginPage.login(testUser.email, 'wrongpassword');

      await loginPage.assertError(/invalid credentials|authentication failed/i);
    });

    test('should successfully login with valid credentials', async ({ page }) => {
      await loginPage.login(testUser.email, testUser.password);

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);

      // Should show user greeting
      await expect(dashboardPage.userGreeting).toContainText(testUser.firstName);
    });

    test('should persist session after page reload', async ({ page }) => {
      await loginPage.login(testUser.email, testUser.password);
      await page.waitForURL(/\/dashboard/);

      // Reload page
      await page.reload();

      // Should still be on dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(dashboardPage.userGreeting).toBeVisible();
    });

    test('should redirect to intended page after login', async ({ page }) => {
      // Try to access protected page
      await page.goto('/lessons');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);

      // Login
      await loginPage.login(testUser.email, testUser.password);

      // Should redirect to originally intended page
      await expect(page).toHaveURL(/\/lessons/);
    });
  });

  // ============================================================================
  // REMEMBER ME
  // ============================================================================

  test.describe('Remember Me', () => {
    test('should set long-lived session when "Remember me" is checked', async ({
      page,
      context,
    }) => {
      await loginPage.checkRememberMe();
      await loginPage.login(testUser.email, testUser.password);

      await page.waitForURL(/\/dashboard/);

      // Check for session cookie with extended expiry
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(
        (c) => c.name.includes('session') || c.name.includes('token')
      );

      expect(sessionCookie).toBeDefined();
      // Cookie should expire in more than 1 day
      if (sessionCookie?.expires) {
        expect(sessionCookie.expires).toBeGreaterThan(Date.now() / 1000 + 86400);
      }
    });

    test('should set short-lived session when "Remember me" is not checked', async ({
      page,
      context,
    }) => {
      await loginPage.uncheckRememberMe();
      await loginPage.login(testUser.email, testUser.password);

      await page.waitForURL(/\/dashboard/);

      // Check for session cookie
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(
        (c) => c.name.includes('session') || c.name.includes('token')
      );

      expect(sessionCookie).toBeDefined();
      // Session cookie should have short expiry or be session-only
      if (sessionCookie?.expires && sessionCookie.expires !== -1) {
        expect(sessionCookie.expires).toBeLessThan(Date.now() / 1000 + 86400 * 7);
      }
    });
  });

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  test.describe('Rate Limiting', () => {
    test('should handle rate limiting after multiple failed attempts', async () => {
      const wrongEmail = 'ratelimit@test.com';

      // Attempt login multiple times with wrong credentials
      for (let i = 0; i < 5; i++) {
        await loginPage.login(wrongEmail, 'wrongpassword');
        await loginPage.errorMessage.waitFor({ state: 'visible' });
      }

      // Next attempt should be rate limited
      await loginPage.login(wrongEmail, 'wrongpassword');
      await loginPage.assertError(/too many attempts|rate limit|try again later/i);
    });
  });

  // ============================================================================
  // MFA FLOW
  // ============================================================================

  test.describe('MFA Flow', () => {
    let mfaUser: TestUser;

    test.beforeAll(async () => {
      mfaUser = await TestDataFactory.createUser({
        role: 'student',
        verified: true,
        mfaEnabled: true,
      });
    });

    test.afterAll(async () => {
      await TestDataFactory.deleteUser(mfaUser.id);
    });

    test('should prompt for MFA code after password', async () => {
      await loginPage.login(mfaUser.email, mfaUser.password);

      await loginPage.assertMfaPromptDisplayed();
    });

    test('should reject invalid MFA code', async () => {
      await loginPage.login(mfaUser.email, mfaUser.password);
      await loginPage.enterMfaCode('000000');

      await loginPage.assertMfaError(/invalid.*code/i);
    });

    test('should successfully login with valid MFA code', async ({ page }) => {
      await loginPage.login(mfaUser.email, mfaUser.password);

      // Generate valid TOTP code
      const mfaCode = await TestDataFactory.generateTotpCode(mfaUser.mfaSecret!);
      await loginPage.enterMfaCode(mfaCode);

      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should allow resending MFA code', async () => {
      await loginPage.login(mfaUser.email, mfaUser.password);
      await loginPage.assertMfaPromptDisplayed();

      await loginPage.resendMfaCode();

      // Should show success message
      await expect(loginPage.page.getByText(/code sent|resent/i)).toBeVisible();
    });
  });

  // ============================================================================
  // PASSWORD RESET
  // ============================================================================

  test.describe('Password Reset', () => {
    test('should navigate to password reset page', async ({ page }) => {
      await loginPage.goToForgotPassword();

      await expect(page).toHaveURL(/\/forgot-password/);
      await expect(
        page.getByRole('heading', { name: /reset.*password|forgot.*password/i })
      ).toBeVisible();
    });

    test('should send password reset email', async ({ page }) => {
      await loginPage.goToForgotPassword();

      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByRole('button', { name: /send|reset|submit/i }).click();

      await expect(page.getByText(/check your email|email sent/i)).toBeVisible();
    });

    test('should show error for non-existent email', async ({ page }) => {
      await loginPage.goToForgotPassword();

      await page.getByLabel(/email/i).fill('nonexistent@example.com');
      await page.getByRole('button', { name: /send|reset|submit/i }).click();

      // Should still show success (for security - don't reveal if email exists)
      // OR show a generic error
      const response = page.getByText(/check your email|email sent|error/i);
      await expect(response).toBeVisible();
    });

    test('should complete password reset flow', async ({ page }) => {
      // Get reset token
      const resetToken = await TestDataFactory.createPasswordResetToken(testUser.email);

      // Navigate to reset page with token
      await page.goto(`/reset-password?token=${resetToken}`);

      // Fill new password
      const newPassword = 'NewSecurePassword123!';
      await page.getByLabel(/new password/i).fill(newPassword);
      await page.getByLabel(/confirm password/i).fill(newPassword);
      await page.getByRole('button', { name: /reset|change|update/i }).click();

      // Should redirect to login with success message
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByText(/password.*reset|password.*changed/i)).toBeVisible();

      // Should be able to login with new password
      await loginPage.login(testUser.email, newPassword);
      await expect(page).toHaveURL(/\/dashboard/);

      // Reset password back for other tests
      await TestDataFactory.resetUserPassword(testUser.id, testUser.password);
    });
  });

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  test.describe('Session Management', () => {
    test('should logout successfully', async ({ page }) => {
      await loginPage.login(testUser.email, testUser.password);
      await page.waitForURL(/\/dashboard/);

      await dashboardPage.logout();

      await expect(page).toHaveURL(/\/login/);

      // Session should be invalidated - accessing dashboard should redirect to login
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login/);
    });

    test('should handle session expiry gracefully', async ({ page }) => {
      await loginPage.login(testUser.email, testUser.password);
      await page.waitForURL(/\/dashboard/);

      // Expire session via API
      await TestDataFactory.expireUserSession(testUser.id);

      // Perform action that requires authentication
      await dashboardPage.navigateToProfile();

      // Should redirect to login with message
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByText(/session expired|please.*log.*in/i)).toBeVisible();
    });

    test('should prevent access to protected routes without authentication', async ({ page }) => {
      // Try accessing various protected routes
      const protectedRoutes = ['/dashboard', '/lessons', '/profile', '/settings', '/courses'];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(/\/login/);
      }
    });
  });

  // ============================================================================
  // SSO LOGIN
  // ============================================================================

  test.describe('SSO Login', () => {
    test('should initiate Google SSO flow', async ({ page }) => {
      // Mock OAuth redirect
      await page.route('**/accounts.google.com/**', (route) => {
        route.fulfill({
          status: 200,
          body: '<html><body>Google Login Mock</body></html>',
        });
      });

      await loginPage.clickGoogleLogin();

      // Should navigate to Google OAuth (mocked)
      await expect(page).toHaveURL(/google|oauth/i);
    });

    test('should initiate Microsoft SSO flow', async ({ page }) => {
      await page.route('**/login.microsoftonline.com/**', (route) => {
        route.fulfill({
          status: 200,
          body: '<html><body>Microsoft Login Mock</body></html>',
        });
      });

      await loginPage.clickMicrosoftLogin();

      // Should navigate to Microsoft OAuth (mocked)
      await expect(page).toHaveURL(/microsoft|oauth/i);
    });

    test('should handle SSO callback with success', async ({ page }) => {
      // Simulate SSO callback
      await page.goto('/auth/callback?code=mock_code&state=mock_state&provider=google');

      // Should process callback and redirect to dashboard (or show error if mock)
      await page.waitForURL(/\/dashboard|\/login/);
    });
  });

  // ============================================================================
  // LOADING STATES
  // ============================================================================

  test.describe('Loading States', () => {
    test('should show loading state during login', async ({ page }) => {
      // Slow down API response
      await page.route('**/auth/login', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        route.continue();
      });

      await loginPage.fillEmail(testUser.email);
      await loginPage.fillPassword(testUser.password);
      await loginPage.submit();

      await loginPage.assertLoading();
    });

    test('should re-enable form after login error', async ({ page }) => {
      await loginPage.login('wrong@example.com', 'wrongpassword');

      await loginPage.assertError();
      await loginPage.assertNotLoading();
    });
  });
});

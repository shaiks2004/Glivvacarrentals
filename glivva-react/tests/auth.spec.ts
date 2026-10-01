import { test, expect } from '@playwright/test';

test.describe('Authentication & Route Guards (Phase 2b)', () => {
  test('unauthenticated visitor accessing /account gets redirected to /login', async ({ page }) => {
    await page.goto('/account');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('h1')).toContainText('Log in');
  });

  test('unauthenticated visitor accessing /staff gets redirected to /login', async ({ page }) => {
    await page.goto('/staff');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated visitor accessing /admin gets redirected to /login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'nonexistent@example.test');
    await page.fill('input[type="password"]', 'wrongpassword123');
    await page.click('button[type="submit"]');

    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/Invalid login credentials|Invalid email or password/i);
  });

  test('signup flow registers a new customer user and redirects to account', async ({ page }) => {
    const uniqueEmail = `testuser_${Date.now()}@example.test`;
    await page.goto('/signup');

    await page.fill('input[name="name"], input[placeholder*="Rahul"], input[autoComplete="name"]', 'Test Customer');
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', 'ValidPass123!');
    await page.click('button[type="submit"]');

    // Upon signup, user session is created and redirected to /account
    await expect(page).toHaveURL(/\/account/);
    await expect(page.locator('h1')).toContainText(/My account/i);
  });

  test('forgot password flow submits email and displays confirmation', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.fill('input[type="email"]', 'customer@example.test');
    await page.click('button[type="submit"]');

    const statusMsg = page.locator('[role="status"]');
    await expect(statusMsg).toBeVisible();
    await expect(statusMsg).toContainText(/Recovery Link Sent/i);
  });
});

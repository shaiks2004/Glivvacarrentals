import { test, expect } from '@playwright/test';

test.describe('User Account Area (Phase 4)', () => {
  const email = `customer-${Date.now()}@example.test`;
  const password = 'Password@123';

  test('authenticated user manages profile, documents, and cancels a booking', async ({ page }) => {
    // 1. Sign up a new customer
    await page.goto('/signup');
    await page.fill('input[autoComplete="name"]', 'Rohan Mehra');
    await page.fill('input[type="email"]', email);
    await page.fill('input[autoComplete="new-password"]', password);
    await page.click('button[type="submit"]');

    // Should redirect to /account
    await expect(page).toHaveURL(/\/account/);
    await expect(page.locator('h1')).toContainText(/My account/i);
    await expect(page.locator('main')).toContainText(/Welcome back, Rohan Mehra/i);

    // 2. Navigate to Profile Tab and update phone number
    const testPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    await page.click('text=Profile');
    await expect(page).toHaveURL(/\/account\/profile/);
    await page.fill('#profile-phone', testPhone);
    await page.click('button[type="submit"]');

    const profileSuccess = page.locator('.ok[role="status"]');
    await expect(profileSuccess).toBeVisible({ timeout: 5000 });
    await expect(profileSuccess).toContainText(/Profile updated successfully/i);

    // 3. Navigate to Security Tab and test password change
    await page.click('text=Security');
    await expect(page).toHaveURL(/\/account\/security/);
    await page.fill('#new-pwd', 'NewSecret@987');
    await page.fill('#confirm-pwd', 'NewSecret@987');
    await page.click('button[type="submit"]');

    const securitySuccess = page.locator('.ok[role="status"]');
    await expect(securitySuccess).toBeVisible({ timeout: 5000 });
    await expect(securitySuccess).toContainText(/password has been updated/i);

    // 4. Navigate to KYC Documents Tab and check document list
    await page.click('text=KYC Documents');
    await expect(page).toHaveURL(/\/account\/documents/);
    await expect(page.locator('main')).toContainText(/Driving Licence/i);
    await expect(page.locator('main')).toContainText(/Government Identity Proof/i);

    // 5. Create a booking for this user
    await page.goto('/booking');
    await page.selectOption('select', { index: 1 });

    const futureDays = 350 + Math.floor(Math.random() * 600);
    const start = new Date();
    start.setDate(start.getDate() + futureDays);
    const end = new Date(start);
    end.setDate(end.getDate() + 2);

    await page.fill('input[type="date"] >> nth=0', start.toISOString().split('T')[0]);
    await page.fill('input[type="date"] >> nth=1', end.toISOString().split('T')[0]);
    await page.click('text=Continue to Driver Details');

    // Review & Submit
    await page.click('text=Review Booking');
    await page.click('button[type="submit"]');

    const bookingSuccess = page.locator('.ok[role="status"]');
    await expect(bookingSuccess).toBeVisible({ timeout: 8000 });
    await expect(bookingSuccess).toContainText(/Booking received/i);

    // 6. Return to /account/bookings, verify booking is listed, open timeline, and cancel it
    await page.goto('/account/bookings');
    await expect(page.locator('.card')).toContainText(/Pending Verification/i);

    // Open timeline
    await page.click('text=View Status History');
    await expect(page.locator('main')).toContainText(/Booking Status Timeline/i);

    // Click Cancel Booking
    await page.click('text=Cancel Booking');
    await expect(page.locator('#cancel-modal-title')).toBeVisible();

    // Confirm Cancellation
    await page.click('text=Confirm Cancellation');

    const cancelSuccess = page.locator('.ok[role="status"]');
    await expect(cancelSuccess).toBeVisible({ timeout: 8000 });
    await expect(cancelSuccess).toContainText(/cancelled successfully/i);

    // Status badge on card should now show Cancelled
    await expect(page.locator('.card')).toContainText(/Cancelled/i);
  });
});

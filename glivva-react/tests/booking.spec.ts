import { test, expect } from '@playwright/test';

test.describe('Public Booking Flow & Contact Form (Phase 3)', () => {
  test('guest user completes multi-step booking wizard and receives reference code', async ({ page }) => {
    await page.goto('/booking');

    // Step 1: Trip configuration
    await expect(page.locator('h2')).toContainText(/Configure your trip/i);
    await page.selectOption('select', { index: 1 }); // Choose first car

    // Use random future offset so repeating the test does not hit duplicate bookings
    const futureDays = 10 + Math.floor(Math.random() * 50);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + futureDays);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 2);

    const fromDateStr = tomorrow.toISOString().split('T')[0];
    const toDateStr = dayAfter.toISOString().split('T')[0];

    await page.fill('input[type="date"] >> nth=0', fromDateStr);
    await page.fill('input[type="date"] >> nth=1', toDateStr);

    await page.click('text=Continue to Driver Details');

    // Step 2: Driver Details
    const uniquePhone = `+9197${Math.floor(10000000 + Math.random() * 90000000)}`;
    const uniqueEmail = `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.test`;
    await expect(page.locator('h2')).toContainText(/Driver information/i);
    await page.fill('input[autoComplete="name"]', 'Arjun Verma');
    await page.fill('input[autoComplete="tel"]', uniquePhone);
    await page.fill('input[autoComplete="email"]', uniqueEmail);

    await page.click('text=Review Booking');

    // Step 3: Review & Confirm
    await expect(page.locator('h2')).toContainText(/Review your booking/i);
    await expect(page.locator('.booking-summary')).toContainText(/Live estimate/i);

    await page.click('button[type="submit"]');

    // Step 4: Success confirmation screen
    const successBox = page.locator('.ok[role="status"]');
    await expect(successBox).toBeVisible({ timeout: 8000 });
    await expect(successBox).toContainText(/Booking received\. Our team will call you shortly to confirm\./i);
    await expect(successBox).toContainText(/GLV-/i);
    await expect(successBox).toContainText(/Notification Queued/i);
  });

  test('attempting to double-book overlapping dates shows error banner', async ({ page }) => {
    // Book fixed dates (2026-12-01 to 2026-12-03)
    await page.goto('/booking');
    await page.selectOption('select', { index: 1 });
    await page.fill('input[type="date"] >> nth=0', '2026-12-01');
    await page.fill('input[type="date"] >> nth=1', '2026-12-03');
    await page.click('text=Continue to Driver Details');
    await page.fill('input[autoComplete="name"]', 'First Booker');
    await page.fill('input[autoComplete="tel"]', '+919876543220');
    await page.fill('input[autoComplete="email"]', 'first@example.test');
    await page.click('text=Review Booking');
    await page.click('button[type="submit"]');

    // First booking completes (or if already booked from previous run, that's fine too)
    await page.waitForTimeout(1000);

    // Now attempt to book the exact same car on overlapping dates (2026-12-02 to 2026-12-04)
    await page.goto('/booking');
    await page.selectOption('select', { index: 1 });
    await page.fill('input[type="date"] >> nth=0', '2026-12-02');
    await page.fill('input[type="date"] >> nth=1', '2026-12-04');
    await page.click('text=Continue to Driver Details');
    await page.fill('input[autoComplete="name"]', 'Conflict Tester');
    await page.fill('input[autoComplete="tel"]', '+919876543221');
    await page.fill('input[autoComplete="email"]', 'conflict@example.test');
    await page.click('text=Review Booking');
    await page.click('button[type="submit"]');

    const errorBanner = page.locator('.err[role="alert"]');
    await expect(errorBanner).toBeVisible({ timeout: 8000 });
    await expect(errorBanner).toContainText(/already booked/i);
  });

  test('contact form submits message and shows confirmation', async ({ page }) => {
    await page.goto('/contact');
    await page.fill('input[autoComplete="name"]', 'Pooja Singh');
    await page.fill('input[type="email"]', 'pooja@example.test');
    await page.fill('textarea', 'Inquiry regarding outstation rental from Ranchi to Jamshedpur.');

    await page.click('button[type="submit"]');

    const okBanner = page.locator('.ok[role="status"]');
    await expect(okBanner).toBeVisible({ timeout: 5000 });
    await expect(okBanner).toContainText(/Message sent/i);
  });
});

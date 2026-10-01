import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe('Employee & Operations Portal (Phase 5)', () => {
  const staffEmail = `staff_${Date.now()}@example.test`;
  const staffPassword = 'StaffSecret@123';
  let staffUserId = '';

  test.beforeAll(async () => {
    // Provision employee user via service role
    const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
      email: staffEmail,
      password: staffPassword,
      email_confirm: true,
      user_metadata: { name: 'Vikram Staff' },
    });

    if (authErr || !authUser.user) {
      throw new Error(`Failed to create test employee: ${authErr?.message}`);
    }

    staffUserId = authUser.user.id;

    // Set employee profile
    const { error: profileErr } = await adminClient
      .from('profiles')
      .update({
        name: 'Vikram Staff',
        role: 'employee',
        phone: `+919876${Math.floor(100000 + Math.random() * 900000)}`,
        active: true,
        must_change_password: false,
      })
      .eq('id', staffUserId);

    if (profileErr) {
      throw new Error(`Failed to update profile to employee: ${profileErr.message}`);
    }
  });

  test.afterAll(async () => {
    if (staffUserId) {
      await adminClient.auth.admin.deleteUser(staffUserId);
    }
  });

  test('staff member logs in, manages call queue, performs handover, and manages fleet', async ({ page }) => {
    // 1. Create a fresh test booking via public booking flow
    const bookingRef = `GLV-STF-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomOffset = 150 + Math.floor(Math.random() * 3000);
    const tripStart = new Date();
    tripStart.setDate(tripStart.getDate() + randomOffset);
    const tripEnd = new Date(tripStart);
    tripEnd.setDate(tripEnd.getDate() + 2);

    const { data: swiftCar } = await adminClient
      .from('cars')
      .select('id')
      .eq('slug', 'swift')
      .single();

    const carId = swiftCar?.id || 1;

    // Insert pending booking with customer metadata
    const { error: bookingErr } = await adminClient.from('bookings').insert({
      ref: bookingRef,
      car_id: carId,
      pickup_place: 'Ranchi Railway Station',
      period: `[${tripStart.toISOString()},${tripEnd.toISOString()}]`,
      driver_option: 'self',
      subtotal: 3600.0,
      tax: 648.0,
      total: 4248.0,
      status: 'pending',
      notes: 'Customer requested manual check',
    });

    expect(bookingErr).toBeNull();

    // 2. Log in as Employee
    await page.goto('/login');
    await page.fill('input[type="email"]', staffEmail);
    await page.fill('input[type="password"]', staffPassword);
    await page.click('button[type="submit"]');

    // Should redirect to /staff
    await expect(page).toHaveURL(/\/staff/);
    await expect(page.locator('h1')).toContainText(/Operations desk/i);
    await expect(page.locator('main')).toContainText(/Vikram Staff/i);
    await expect(page.locator('main')).toContainText(/Employee/i);

    // 3. Call Queue Tab: Claim and Log Call Outcome
    await expect(page.locator('h2')).toContainText(/Call Queue/i);

    // Wait for queue item to appear in table
    const leadRow = page.locator(`tr:has-text("${bookingRef}")`);
    await expect(leadRow).toBeVisible({ timeout: 8000 });

    // Claim the booking
    const claimBtn = leadRow.locator('button:has-text("Claim")');
    await claimBtn.click();

    // After claim or directly, click Log Outcome
    const outcomeBtn = leadRow.locator('button:has-text("Log Outcome")');
    await expect(outcomeBtn).toBeVisible({ timeout: 5000 });
    await outcomeBtn.click();

    // Modal opens
    await expect(page.locator('#outcome-modal-title')).toBeVisible();
    await page.selectOption('select', 'confirmed');
    await page.fill('textarea', 'Identity verified on call, customer ready for pickup.');
    await page.click('button:has-text("Save & Update Booking")');

    // Success banner appears
    const callSuccess = page.locator('.ok[role="status"]');
    await expect(callSuccess).toBeVisible({ timeout: 8000 });
    await expect(callSuccess).toContainText(/Call outcome \(confirmed\) logged/i);

    // 4. Reservations & Handover Tab
    await page.click('text=Reservations & Handover');
    await expect(page).toHaveURL(/\/staff\/bookings/);
    await expect(page.locator('h2')).toContainText(/Reservations & Handover/i);

    // Booking is now listed in Reservations table
    const reservationRow = page.locator(`tr:has-text("${bookingRef}")`);
    await expect(reservationRow).toBeVisible({ timeout: 8000 });
    await expect(reservationRow).toContainText(/Confirmed/i);

    // Click Pickup Handover
    const pickupBtn = reservationRow.locator('button:has-text("Pickup")');
    await pickupBtn.click();

    // Handover Modal opens
    await expect(page.locator('#handover-modal-title')).toContainText(/pickup Handover/i);
    await page.fill('#handover-odo', '45200');
    await page.fill('#handover-fuel', '100');
    await page.fill('#handover-notes', 'Vehicle handed over in pristine condition. No scratches.');
    await page.click('button:has-text("Complete Pickup")');

    const handoverOk = page.locator('.ok[role="status"]');
    await expect(handoverOk).toBeVisible({ timeout: 8000 });
    await expect(handoverOk).toContainText(/Successfully recorded pickup handover/i);

    // Status is now Active
    await expect(page.locator(`tr:has-text("${bookingRef}")`)).toContainText(/Active/i);

    // Click Return Handover
    const returnBtn = page.locator(`tr:has-text("${bookingRef}") button:has-text("Return")`);
    await returnBtn.click();

    await expect(page.locator('#handover-modal-title')).toContainText(/return Handover/i);
    await page.fill('#handover-odo', '45680');
    await page.fill('#handover-fuel', '95');
    await page.fill('#handover-notes', 'Returned on time. Security deposit released.');
    await page.click('button:has-text("Complete Return")');

    await expect(page.locator('.ok[role="status"]')).toContainText(/Successfully recorded return handover/i);
    await expect(page.locator(`tr:has-text("${bookingRef}")`)).toContainText(/Completed/i);

    // 5. Fleet & Compliance Tab
    await page.click('text=Fleet & Compliance');
    await expect(page).toHaveURL(/\/staff\/fleet/);
    await expect(page.locator('h2')).toContainText(/Fleet Management/i);

    // Check KPI cards
    await expect(page.locator('main')).toContainText(/Total Fleet/i);
    await expect(page.locator('main')).toContainText(/Active In Fleet/i);

    // Add New Vehicle
    await page.click('text=Add New Vehicle');
    const carModal = page.locator('div[role="dialog"]');
    await expect(carModal.locator('#car-modal-title')).toContainText(/Add New Vehicle/i);

    const testCarName = `Tata Nexon EV ${Date.now()}`;
    const testCarSlug = `nexon-ev-${Date.now()}`;
    const testRegNumber = `JH-01-EV-${Math.floor(1000 + Math.random() * 8999)}`;
    await carModal.locator('input[placeholder*="Mahindra Scorpio"]').fill(testCarName);
    await carModal.locator('input[placeholder*="scorpio-n"]').fill(testCarSlug);
    await carModal.locator('input[placeholder*="JH-01"]').fill(testRegNumber);
    await carModal.locator('select').nth(0).selectOption('SUV');
    await carModal.locator('input[type="number"]').nth(0).fill('5');
    await carModal.locator('select').nth(1).selectOption('Electric');
    await carModal.locator('select').nth(2).selectOption('Automatic');
    await carModal.locator('input[type="number"]').nth(1).fill('3500');
    await carModal.locator('button:has-text("Create Vehicle")').click();

    const fleetOk = page.locator('.ok[role="status"]');
    await expect(fleetOk).toBeVisible({ timeout: 8000 });
    await expect(fleetOk).toContainText(/added to fleet/i);

    // Verify newly added car is listed
    const nexonCard = page.locator(`.card:has-text("${testCarName}")`);
    await expect(nexonCard).toBeVisible();
    await expect(nexonCard).toContainText(/Electric/i);

    // Open Docs for this vehicle
    const docsBtn = nexonCard.locator('button:has-text("Docs")');
    await docsBtn.click();
    await expect(page.locator('#docs-modal-title')).toContainText(new RegExp(`Compliance: ${testCarName}`, 'i'));

    // Update RC document
    await page.click('text=Add Record >> nth=0');
    await page.fill('input[placeholder*="POL-99212"]', 'RC-99887766');
    await page.fill('input[type="date"] >> nth=1', '2030-12-31');
    await page.click('button:has-text("Save Document")');

    await expect(page.locator('.ok[role="status"]')).toContainText(/Updated rc document/i);
    await page.click('button[aria-label="Close dialog"]');

    // Open Blocks for this vehicle
    const blocksBtn = nexonCard.locator('button:has-text("Blocks")');
    await blocksBtn.click();
    await expect(page.locator('#blocks-modal-title')).toContainText(/Maintenance & Blocks/i);

    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 90);
    const blockStartStr = nextMonth.toISOString().slice(0, 16);
    const nextMonthEnd = new Date(nextMonth);
    nextMonthEnd.setDate(nextMonthEnd.getDate() + 2);
    const blockEndStr = nextMonthEnd.toISOString().slice(0, 16);

    await page.fill('input[type="datetime-local"] >> nth=0', blockStartStr);
    await page.fill('input[type="datetime-local"] >> nth=1', blockEndStr);
    await page.fill('input[placeholder*="periodic service"]', 'Scheduled 10k EV inspection');
    await page.click('button:has-text("Lock Availability")');

    await expect(page.locator('.ok[role="status"]')).toContainText(/Maintenance block added/i);
    await expect(page.locator('main')).toContainText(/Scheduled 10k EV inspection/i);

    // Release Lock
    await page.click('button:has-text("Release Lock")');
    await expect(page.locator('.ok[role="status"]')).toContainText(/Block released/i);
    await page.click('button[aria-label="Close dialog"]');

    // Archive the car
    const archiveBtn = nexonCard.locator('button:has-text("Archive")');
    await archiveBtn.click();
    await expect(page.locator('.ok[role="status"]')).toContainText(/Archived/i);
  });
});

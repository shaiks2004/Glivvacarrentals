import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe('Admin Control Center & Executive Management (Phase 6)', () => {
  const adminEmail = `admin_${Date.now()}@example.test`;
  const adminPassword = 'AdminSecret@123';
  let adminUserId = '';

  test.beforeAll(async () => {
    // 1. Provision super admin account
    const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { name: 'Executive Director' },
    });

    if (authErr || !authUser.user) {
      throw new Error(`Failed to create test admin: ${authErr?.message}`);
    }

    adminUserId = authUser.user.id;

    // 2. Set profile role to admin
    const { error: profileErr } = await adminClient
      .from('profiles')
      .update({
        name: 'Executive Director',
        role: 'admin',
        phone: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
        active: true,
        must_change_password: false,
      })
      .eq('id', adminUserId);

    if (profileErr) {
      throw new Error(`Failed to update profile to admin: ${profileErr.message}`);
    }
  });

  test.afterAll(async () => {
    if (adminUserId) {
      await adminClient.auth.admin.deleteUser(adminUserId);
    }
  });

  test('admin logs in, reviews KPIs, provisions employee, manages offers, inspects audit logs, and updates settings', async ({
    page,
  }) => {
    // 1. Log in as Admin
    await page.goto('/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');

    // Should redirect to /admin
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('h1')).toContainText(/Admin console/i);
    await expect(page.locator('main')).toContainText(/Executive Director/i);
    await expect(page.locator('main')).toContainText(/Executive Admin/i);

    // 2. Tab 1: Executive KPI Dashboard
    await expect(page.locator('h2')).toContainText(/Executive KPI Dashboard/i);
    await expect(page.locator('main')).toContainText(/Booked Gross Value/i);
    await expect(page.locator('main')).toContainText(/Active Trips On Road/i);
    await expect(page.locator('main')).toContainText(/Confirmed Bookings/i);
    await expect(page.locator('main')).toContainText(/Pending Call Queue/i);

    // 3. Tab 2: Employees & Coverage
    await page.click('text=Employees & Coverage');
    await expect(page).toHaveURL(/\/admin\/employees/);
    await expect(page.locator('h2')).toContainText(/Employee Management/i);

    // Admin should be listed in directory
    await expect(page.locator('main')).toContainText(/Executive Director/i);

    // Provision new employee
    await page.click('text=Provision New Employee');
    const provModal = page.locator('div[role="dialog"]');
    await expect(provModal.locator('#provision-modal-title')).toBeVisible();

    const newEmpEmail = `emp_${Date.now()}@glivva.test`;
    const newEmpName = `Priya Sharma ${Date.now()}`;
    await provModal.locator('input[placeholder*="Anand Kumar"]').fill(newEmpName);
    await provModal.locator('input[placeholder*="anand@glivva.in"]').fill(newEmpEmail);
    await provModal.locator('input[placeholder*="+91 98765"]').fill(`+9198${Math.floor(10000000 + Math.random() * 90000000)}`);
    await provModal.locator('input[placeholder*="Min 8 characters"]').fill('PriyaPass@123');
    await provModal.locator('button:has-text("Provision Employee")').click();

    const provOk = page.locator('.ok[role="status"]');
    await expect(provOk).toBeVisible({ timeout: 8000 });
    await expect(provOk).toContainText(/created successfully/i);

    // Verify Priya Sharma is now in directory
    await expect(page.locator(`tr:has-text("${newEmpName}")`)).toBeVisible();
    await expect(page.locator(`tr:has-text("${newEmpName}")`)).toContainText(/employee/i);

    // 4. Tab 3: Pricing & Offers
    await page.click('text=Pricing & Offers');
    await expect(page).toHaveURL(/\/admin\/offers/);
    await expect(page.locator('h2')).toContainText(/Pricing & Promotional Offers/i);

    // Create New Promo Offer
    await page.click('text=Create New Promo Offer');
    const offerModal = page.locator('div[role="dialog"]');
    await expect(offerModal.locator('#offer-modal-title')).toBeVisible();

    const promoCode = `DWL${Date.now().toString().slice(-6)}`;
    await offerModal.locator('input[placeholder*="MONSOON25"]').fill(promoCode);
    await offerModal.locator('input[type="number"]').fill('30');
    await offerModal.locator('input[placeholder*="Weekend Getaway"]').fill('Diwali Festival Special');
    await offerModal.locator('textarea').fill('Flat 30% discount on self drive rentals for Diwali.');
    await offerModal.locator('button:has-text("Create Offer")').click();

    const offerOk = page.locator('.ok[role="status"]');
    await expect(offerOk).toBeVisible({ timeout: 8000 });
    await expect(offerOk).toContainText(/created/i);

    // Verify offer row in table
    const offerRow = page.locator(`tr:has-text("${promoCode}")`);
    await expect(offerRow).toBeVisible();
    await expect(offerRow).toContainText(/30% OFF/i);

    // Pause Offer
    const pauseBtn = offerRow.locator('button:has-text("Pause")');
    await pauseBtn.click();
    await expect(page.locator('.ok[role="status"]')).toContainText(/Paused/i);

    // 5. Tab 4: Security Audit Trail
    await page.click('text=Security Audit Trail');
    await expect(page).toHaveURL(/\/admin\/audit/);
    await expect(page.locator('h2')).toContainText(/Security Audit Trail/i);

    // Verify table has records
    await expect(page.locator('table')).toBeVisible();

    // Inspect first diff
    const firstDiffBtn = page.locator('table button:has-text("Inspect Diff")').first();
    await firstDiffBtn.click();

    const diffModal = page.locator('div[role="dialog"]');
    await expect(diffModal.locator('#diff-modal-title')).toBeVisible();
    await expect(diffModal).toContainText(/State After/i);
    await diffModal.locator('button:has-text("Close Inspector")').click();

    // 6. Tab 5: Settings & Reviews
    await page.click('text=Settings & Reviews');
    await expect(page).toHaveURL(/\/admin\/settings/);
    await expect(page.locator('h2')).toContainText(/Site Settings & Moderation/i);

    // Update hotline
    const newSupportPhone = `+91 92968 ${Math.floor(10000 + Math.random() * 89999)}`;
    await page.fill('input[value*="+91"]', newSupportPhone);
    await page.click('button:has-text("Save Operational Settings")');

    const settingsOk = page.locator('.ok[role="status"]');
    await expect(settingsOk).toBeVisible({ timeout: 8000 });
    await expect(settingsOk).toContainText(/Operational settings updated successfully/i);
  });
});

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe('Document Verification & Notifications Engine (Phase 7)', () => {
  const timestamp = Date.now();
  const customerEmail = `customer_kyc_${timestamp}@example.test`;
  const staffEmail = `staff_kyc_${timestamp}@example.test`;
  const adminEmail = `admin_kyc_${timestamp}@example.test`;
  const password = 'TestSecurePassword@123';

  let customerId = '';
  let staffId = '';
  let adminId = '';
  let documentId = '';

  test.beforeAll(async () => {
    // 1. Create Customer
    const { data: custAuth, error: cErr } = await adminClient.auth.admin.createUser({
      email: customerEmail,
      password,
      email_confirm: true,
      user_metadata: { name: 'Aarav Sharma' },
    });
    if (cErr || !custAuth?.user) throw new Error(`Cust error: ${cErr?.message}`);
    customerId = custAuth.user.id;
    const { error: cProfErr } = await adminClient.from('profiles').update({
      name: 'Aarav Sharma',
      role: 'user',
      phone: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      active: true,
      must_change_password: false,
    }).eq('id', customerId);
    if (cProfErr) throw new Error(`Cust prof error: ${cProfErr.message}`);

    // 2. Create Staff
    const { data: staffAuth, error: sErr } = await adminClient.auth.admin.createUser({
      email: staffEmail,
      password,
      email_confirm: true,
      user_metadata: { name: 'Kavita Iyer' },
    });
    if (sErr || !staffAuth?.user) throw new Error(`Staff error: ${sErr?.message}`);
    staffId = staffAuth.user.id;
    const { error: sProfErr } = await adminClient.from('profiles').update({
      name: 'Kavita Iyer',
      role: 'employee',
      phone: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      active: true,
      must_change_password: false,
    }).eq('id', staffId);
    if (sProfErr) throw new Error(`Staff prof error: ${sProfErr.message}`);

    // 3. Create Admin
    const { data: admAuth, error: aErr } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
      user_metadata: { name: 'Super Admin' },
    });
    if (aErr || !admAuth?.user) throw new Error(`Admin error: ${aErr?.message}`);
    adminId = admAuth.user.id;
    const { error: aProfErr } = await adminClient.from('profiles').update({
      name: 'Super Admin',
      role: 'admin',
      phone: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      active: true,
      must_change_password: false,
    }).eq('id', adminId);
    if (aProfErr) throw new Error(`Admin prof error: ${aProfErr.message}`);

    // 4. Create an unverified KYC document for Customer
    const { data: docData, error: docErr } = await adminClient
      .from('documents')
      .insert({
        user_id: customerId,
        kind: 'driving_licence',
        storage_path: `kyc/${customerId}/driving_licence.png`,
        verified: false,
      })
      .select('id')
      .single();

    if (docErr || !docData) {
      throw new Error(`Failed to insert seed KYC document: ${docErr?.message}`);
    }
    documentId = docData.id;
  });

  test.afterAll(async () => {
    if (customerId) await adminClient.auth.admin.deleteUser(customerId);
    if (staffId) await adminClient.auth.admin.deleteUser(staffId);
    if (adminId) await adminClient.auth.admin.deleteUser(adminId);
  });

  test('Staff reviews customer KYC document, approves it, and Admin dispatches sandbox notification', async ({
    page,
  }) => {
    // 1. Staff logs in and navigates to KYC Verification Desk
    await page.goto('/login');
    await page.fill('input[type="email"]', staffEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Should redirect to staff portal
    await expect(page).toHaveURL(/\/staff/);

    // Navigate to KYC verification tab
    await page.click('button:has-text("KYC Verification")');
    await expect(page.locator('h2')).toContainText('Customer KYC Verification Desk');

    // Check that the customer's document is visible in pending queue
    const approveBtn = page.locator(`[data-testid="approve-doc-${documentId}"]`);
    await expect(approveBtn).toBeVisible();

    // Click Approve
    await approveBtn.click();
    await expect(page.getByRole('status')).toContainText('KYC document approved successfully');

    // Sign out from staff
    await page.click('button:has-text("Sign out")');
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    // 2. Admin logs in and checks notifications
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Should redirect to admin portal
    await expect(page).toHaveURL(/\/admin/);

    // Navigate to Notifications tab
    await page.click('button:has-text("Notifications & Gateway")');
    await expect(page.locator('h2')).toContainText('Multi-Channel Notification Gateway');

    // Find and trigger the sandbox dispatch button
    const dispatchBtn = page.locator('[data-testid="dispatch-sandbox-btn"]');
    await expect(dispatchBtn).toBeVisible();
    await dispatchBtn.click();

    // Verify feedback banner
    await expect(page.getByRole('status')).toContainText('Dispatched');

    // Verify the sent status in table
    await expect(page.locator('table')).toContainText('kyc_approved');
    await expect(page.locator('table')).toContainText('sent');
  });
});

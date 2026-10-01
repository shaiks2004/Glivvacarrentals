import { test, expect } from '@playwright/test';

test.describe.serial('Production Fleet & Car Management End-to-End', () => {
  const STAFF_EMAIL = 'staff@glivva.com';
  const STAFF_PASSWORD = 'Staff@123';
  const ADMIN_EMAIL = 'admin@glivva.com';
  const ADMIN_PASSWORD = 'Admin@123';



  test('Step 1: Verify car inventory starts empty on public website and admin/staff', async ({ page }) => {
    // Check public /cars page
    await page.goto('/cars');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/No vehicles currently available/i);

    // Verify 0 car cards on page
    const carCards = page.locator('article.card.car');
    await expect(carCards).toHaveCount(0);
  });

  test('Step 2: Staff logs in and creates Car #1 (Mahindra Thar 4x4)', async ({ page }) => {
    // Log in as Staff
    await page.goto('/login');
    await page.fill('input[type="email"]', STAFF_EMAIL);
    await page.fill('input[type="password"]', STAFF_PASSWORD);
    await page.click('button[type="submit"]');

    // Should land on /staff
    await expect(page).toHaveURL(/\/staff/);

    // Navigate to Fleet tab
    await page.click('button[role="tab"]:has-text("Fleet")');
    await expect(page).toHaveURL(/\/staff\/fleet/);

    // Click "Add New Vehicle"
    await page.click('button:has-text("Add New Vehicle")');
    const modal = page.locator('div[role="dialog"]');
    await expect(modal.locator('#car-modal-title')).toContainText('Add New Vehicle');

    // Fill form for Car #1
    await modal.locator('input[placeholder*="Swift"]').fill('Mahindra Thar 4x4');
    await modal.locator('input[placeholder="e.g. swift"]').fill('thar-4x4');
    await modal.locator('input[placeholder*="JH-01"]').fill('JH-01-TH-2024');
    await modal.locator('select:has(option[value="SUV"])').selectOption('SUV');
    await modal.locator('input[type="number"][min="2"]').fill('4');
    await modal.locator('select:has(option[value="Diesel"])').selectOption('Diesel');
    await modal.locator('select:has(option[value="Manual"])').selectOption('Manual');
    await modal.locator('input[type="number"][min="500"]').fill('3500');

    // Submit form
    await modal.locator('button[type="submit"]:has-text("Create Vehicle")').click();

    // Verify success banner and car card in staff list
    await expect(page.locator('.ok')).toContainText(/added to production fleet|created successfully/i);
    await expect(page.locator('body')).toContainText('Mahindra Thar 4x4');
    await expect(page.locator('body')).toContainText('AVAILABLE');
  });

  test('Step 3: Verify Car #1 appears in Admin inventory and on Public Website', async ({ page }) => {
    // Log in as Admin
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Should land on /admin
    await expect(page).toHaveURL(/\/admin/);

    // Navigate to Fleet tab in Admin
    await page.click('button[role="tab"]:has-text("Fleet")');
    await expect(page).toHaveURL(/\/admin\/fleet/);
    await expect(page.locator('body')).toContainText('Mahindra Thar 4x4');
    await expect(page.locator('body')).toContainText('JH-01-TH-2024');

    // Open public /cars page
    await page.goto('/cars');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText('Mahindra Thar 4x4');
    await expect(page.locator('body')).toContainText('₹3,500');

    // Open public detail page /car/thar-4x4
    await page.goto('/car/thar-4x4');
    await expect(page.locator('h1')).toContainText('Mahindra Thar 4x4');
    await expect(page.locator('body')).toContainText('4 seats');
    await expect(page.locator('body')).toContainText('Diesel');
  });

  test('Step 4: Update Car #1 (Price and Name) and verify update everywhere', async ({ page }) => {
    // Log in as Staff
    await page.goto('/login');
    await page.fill('input[type="email"]', STAFF_EMAIL);
    await page.fill('input[type="password"]', STAFF_PASSWORD);
    await page.click('button[type="submit"]');

    // Go to Fleet tab
    await page.click('button[role="tab"]:has-text("Fleet")');

    // Click Edit on Car #1
    await page.click('button:has-text("Edit")');
    const modal = page.locator('div[role="dialog"]');
    await expect(modal.locator('#car-modal-title')).toContainText('Edit Mahindra Thar 4x4');

    // Update daily rate from 3500 to 3800 and name
    await modal.locator('input[value*="Mahindra Thar"]').fill('Mahindra Thar 4x4 Hardtop');
    await modal.locator('input[type="number"][value="3500"]').fill('3800');
    await modal.locator('button[type="submit"]:has-text("Save Changes")').click();

    // Verify success banner
    await expect(page.locator('.ok')).toContainText(/updated successfully/i);
    await expect(page.locator('body')).toContainText('Mahindra Thar 4x4 Hardtop');

    // Check public /cars page
    await page.goto('/cars');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText('Mahindra Thar 4x4 Hardtop');
    await expect(page.locator('body')).toContainText('₹3,800');
  });

  test('Step 5: Admin logs in and creates Car #2 (Hyundai Verna SX)', async ({ page }) => {
    // Log in as Admin
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Go to Fleet tab
    await page.click('button[role="tab"]:has-text("Fleet")');

    // Click "Add New Vehicle"
    await page.click('button:has-text("Add New Vehicle")');
    const modal = page.locator('div[role="dialog"]');

    // Fill form for Car #2
    await modal.locator('input[placeholder*="Swift"]').fill('Hyundai Verna SX');
    await modal.locator('input[placeholder="e.g. swift"]').fill('verna-sx');
    await modal.locator('input[placeholder*="JH-01"]').fill('JH-01-VR-9988');
    await modal.locator('select:has(option[value="Sedan"])').selectOption('Sedan');
    await modal.locator('input[type="number"][min="2"]').fill('5');
    await modal.locator('select:has(option[value="Petrol"])').selectOption('Petrol');
    await modal.locator('select:has(option[value="Automatic"])').selectOption('Automatic');
    await modal.locator('input[type="number"][min="500"]').fill('2800');

    // Submit form
    await modal.locator('button[type="submit"]:has-text("Create Vehicle")').click();

    // Verify success and both cars in list
    await expect(page.locator('.ok')).toContainText(/added to production fleet|created successfully/i);
    await expect(page.locator('body')).toContainText('Hyundai Verna SX');
    await expect(page.locator('body')).toContainText('Mahindra Thar 4x4 Hardtop');
  });

  test('Step 6: Update Car #2 and verify everywhere', async ({ page }) => {
    // Admin is on /admin/fleet
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await page.click('button[role="tab"]:has-text("Fleet")');

    // Click Edit on Verna
    const vernaCard = page.locator('.card:has-text("Hyundai Verna SX")');
    await vernaCard.locator('button:has-text("Edit")').click();

    const modal = page.locator('div[role="dialog"]');
    // Update rate from 2800 to 2950
    await modal.locator('input[type="number"][value="2800"]').fill('2950');
    await modal.locator('button[type="submit"]:has-text("Save Changes")').click();

    await expect(page.locator('.ok')).toContainText(/updated successfully/i);
  });

  test('Step 7: Public Website Verification (Both cars loaded dynamically from Supabase)', async ({ page }) => {
    // Open public /cars page
    await page.goto('/cars');
    await page.waitForLoadState('networkidle');

    // Exactly 2 cars should appear
    const carCards = page.locator('article.card.car');
    await expect(carCards).toHaveCount(2);

    // Verify names and prices
    await expect(page.locator('body')).toContainText('Mahindra Thar 4x4 Hardtop');
    await expect(page.locator('body')).toContainText('₹3,800');
    await expect(page.locator('body')).toContainText('Hyundai Verna SX');
    await expect(page.locator('body')).toContainText('₹2,950');

    // Verify no old demo cars (e.g. Toyota Innova Crysta, Mercedes E-Class)
    await expect(page.locator('body')).not.toContainText('Mercedes-Benz E-Class');
    await expect(page.locator('body')).not.toContainText('Toyota Innova Crysta');

    // Open Home page and verify popular cars section displays the live cars
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('section.popular-cars')).toContainText('Mahindra Thar 4x4 Hardtop');
    await expect(page.locator('section.popular-cars')).toContainText('Hyundai Verna SX');

    // Open booking page and verify car dropdown options
    await page.goto('/booking');
    await page.waitForLoadState('networkidle');
    const select = page.locator('select');
    await expect(select).toContainText('Mahindra Thar 4x4 Hardtop');
    await expect(select).toContainText('Hyundai Verna SX');
  });

  test('Step 8: Admin Creates and Deletes a Test Vehicle via UI', async ({ page }) => {
    // Log in as Admin and navigate to fleet
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await page.click('button[role="tab"]:has-text("Fleet")');

    // Create a temporary car to test DELETE
    await page.click('button:has-text("Add New Vehicle")');
    const modal = page.locator('div[role="dialog"]');
    await modal.locator('input[placeholder*="Swift"]').fill('Temp Test Car To Delete');
    await modal.locator('input[placeholder="e.g. swift"]').fill('temp-delete-car');
    await modal.locator('input[placeholder*="JH-01"]').fill('JH-01-DEL-0001');
    await modal.locator('select:has(option[value="Hatchback"])').selectOption('Hatchback');
    await modal.locator('input[type="number"][min="2"]').fill('5');
    await modal.locator('select:has(option[value="Petrol"])').selectOption('Petrol');
    await modal.locator('select:has(option[value="Manual"])').selectOption('Manual');
    await modal.locator('input[type="number"][min="500"]').fill('1500');
    await modal.locator('button[type="submit"]:has-text("Create Vehicle")').click();

    await expect(page.locator('body')).toContainText('Temp Test Car To Delete');

    // Click Delete on the temp car
    const tempCard = page.locator('.card:has-text("Temp Test Car To Delete")');
    await tempCard.locator('button:has-text("Delete")').click();

    // Confirm deletion modal
    const deleteModal = page.locator('div[role="dialog"]:has-text("Delete Vehicle")');
    await expect(deleteModal).toContainText('Are you sure you want to permanently delete');
    await deleteModal.locator('button:has-text("Confirm Delete")').click();

    // Verify deleted
    await expect(page.locator('.ok')).toContainText(/deleted permanently/i);
    await expect(page.locator('.card:has(h3:text-is("Temp Test Car To Delete"))')).toHaveCount(0);

    // Verify on public /cars that only the 2 test cars remain
    await page.goto('/cars');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('article.card.car')).toHaveCount(2);
  });
});


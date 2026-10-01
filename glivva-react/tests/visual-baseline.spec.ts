import { expect, test } from '@playwright/test';

const routes = [
  ['home', '/'],
  ['cars', '/cars'],
  ['booking', '/booking'],
  ['login', '/login'],
] as const;
const widths = [390, 1440] as const;

for (const [name, route] of routes) {
  for (const width of widths) {
    test(`${name} visual baseline at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(() => localStorage.setItem('glivva_splash_v1', '1'));
      await page.goto(route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      await page.locator('video').evaluateAll(videos => videos.forEach(video => video.pause()));
      await expect(page).toHaveScreenshot(`${name}-${width}.png`, { fullPage: true });
    });
  }
}

for (const width of widths) {
  test(`splash visual baseline at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?splash=1', { waitUntil: 'domcontentloaded' });
    await page.locator('#splash').waitFor({ state: 'visible' });
    await page.addStyleTag({ content: '#splash,#splash *{animation:none!important;transition:none!important}#splash .slogo{opacity:1!important;filter:none!important;transform:none!important}' });
    await expect(page.locator('#splash')).toHaveScreenshot(`splash-${width}.png`);
  });
}

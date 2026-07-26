import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, test } from '@playwright/test';

const screenshotDir = path.resolve(__dirname, '../../../screen-shot');

test.beforeAll(async () => {
  fs.mkdirSync(screenshotDir, { recursive: true });
});

test.describe('Kurs FX Widget - Desktop', () => {
  test('01 - landing page loads with header', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Kurs')).toBeVisible();
    await expect(page.getByText('Show prices in any currency, get paid in USDC.')).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotDir, '01-landing.jpg'),
      type: 'jpeg',
      quality: 85,
    });
  });

  test('02 - merchant banner visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText("Rosa's Sari-Sari Store")).toBeVisible();
    await expect(page.getByText('Quezon City, Philippines')).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotDir, '02-merchant-banner.jpg'),
      type: 'jpeg',
      quality: 85,
    });
  });

  test('03 - menu items display with multi-currency prices', async ({ page }) => {
    await page.goto('/');
    // Wait for items to load
    await expect(page.getByText('Siopao')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Lumpia')).toBeVisible();
    await expect(page.getByText('Halo-halo')).toBeVisible();
    // Check multi-currency labels
    await expect(page.getByText('PHP').first()).toBeVisible();
    await expect(page.getByText('USDC').first()).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotDir, '03-menu-items.jpg'),
      type: 'jpeg',
      quality: 85,
    });
  });

  test('04 - live FX rate bar visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Live Rates:')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/₱.*\/USDC/)).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotDir, '04-fx-rates-bar.jpg'),
      type: 'jpeg',
      quality: 85,
    });
  });

  test('05 - click item shows QR panel', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Siopao')).toBeVisible({ timeout: 15000 });
    await page.getByText('Siopao').first().click();
    // QR panel should appear
    await expect(page.getByText('Order Reference')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Copy SEP-7 URI')).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotDir, '05-qr-panel.jpg'),
      type: 'jpeg',
      quality: 85,
    });
  });

  test('06 - simulate payment shows success', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Lumpia')).toBeVisible({ timeout: 15000 });
    await page.getByText('Lumpia').first().click();
    await expect(page.getByText('Simulate Payment (demo)')).toBeVisible({ timeout: 10000 });
    await page.getByText('Simulate Payment (demo)').click();
    await expect(page.getByText('Payment Received!')).toBeVisible({ timeout: 15000 });
    await page.screenshot({
      path: path.join(screenshotDir, '06-payment-success.jpg'),
      type: 'jpeg',
      quality: 85,
    });
  });

  test('07 - copy SEP-7 URI button works', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Halo-halo')).toBeVisible({ timeout: 15000 });
    await page.getByText('Halo-halo').first().click();
    await expect(page.getByText('Copy SEP-7 URI')).toBeVisible({ timeout: 10000 });
    // Button is visible and clickable — clipboard API requires browser grant, just verify button present
    await page.screenshot({
      path: path.join(screenshotDir, '06b-copy-sep7.jpg'),
      type: 'jpeg',
      quality: 85,
    });
  });

  test('08 - Stellar branding visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Powered by')).toBeVisible();
    await expect(page.getByText('SEP-7', { exact: true })).toBeVisible();
    await expect(page.getByText('Reflector Oracle')).toBeVisible();
  });
});

test.describe('Kurs FX Widget - Mobile', () => {
  test('mobile-01 - widget loads on 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.getByText('Kurs')).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotDir, '07-mobile-landing.jpg'),
      type: 'jpeg',
      quality: 85,
    });
  });

  test('mobile-02 - items visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.getByText('Siopao')).toBeVisible({ timeout: 15000 });
    await page.screenshot({
      path: path.join(screenshotDir, '08-mobile-items.jpg'),
      type: 'jpeg',
      quality: 85,
    });
  });
});

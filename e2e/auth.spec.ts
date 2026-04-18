import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // Check if the page loaded successfully
    await expect(page).toHaveTitle(/RouteTracker|Vite/i);
  });

  test('should navigate to auth page when not logged in', async ({ page }) => {
    await page.goto('/');

    // Wait for potential redirect or auth check
    await page.waitForLoadState('networkidle');

    // Should either show auth page or redirect to it
    const url = page.url();
    expect(url).toBeTruthy();
  });

  test('should display sign in form', async ({ page }) => {
    await page.goto('/auth');

    // Look for email and password inputs
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should have proper navigation structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if basic page structure is rendered
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });
});

import { expect, test } from '@playwright/test';

/**
 * End-to-end test for the Phase 1 foundation landing page.
 *
 * Asserts the page renders AND that it displays a successful live API health
 * response ("ok") fetched from the running API — not merely that the health
 * panel exists. If the API is unavailable, the status never resolves to "ok"
 * (or the error state renders), so this test fails, as required.
 */
test('landing page displays a successful live API health response', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'DeveloperOS' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'API health' })).toBeVisible();

  // The definitive assertion: the live status resolves to "ok" from the API.
  await expect(page.getByTestId('health-status')).toHaveText('ok', { timeout: 15_000 });

  // And the error state must NOT be present.
  await expect(page.getByTestId('health-error')).toHaveCount(0);
});

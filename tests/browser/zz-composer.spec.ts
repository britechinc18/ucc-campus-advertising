import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const fixture = JSON.parse(
  readFileSync(process.env.BROWSER_FIXTURE_FILE ?? '/tmp/ucc-browser-fixtures.json', 'utf8'),
);
test('composer updates preview, restores local drafts and publishes without review or quotas', async ({
  page,
  browser,
}, testInfo) => {
  await page.context().addCookies([
    {
      name: 'authjs.session-token',
      value: fixture.ownerToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  const admin = await browser.newContext();
  await admin.addCookies([
    {
      name: 'authjs.session-token',
      value: fixture.adminToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  const request = await admin.request.get('http://localhost:3000/api/v1/me/context');
  const old = (await request.json()).settings;
  const policy = {
    maxActive: old.max_active,
    dailyLimit: old.daily_limit,
    durationDays: old.duration_days,
    maxImages: old.max_images,
    maxImageBytes: old.max_image_bytes,
    expectedVersion: old.version,
    autoPublish: true,
    postingLimitsEnabled: false,
    reason: 'Verify open publishing in disposable browser tests',
  };
  const changed = await admin.request.patch('http://localhost:3000/api/v1/admin/settings', {
    headers: { Origin: 'http://localhost:3000' },
    data: policy,
  });
  expect(changed.status()).toBe(200);
  try {
    await page.goto('/post?kind=service');
    await page.getByLabel('Advert title').fill('Live preview campus tutoring');
    await page
      .getByLabel('Description')
      .fill('Personal tutoring sessions around campus. Book a convenient afternoon session.');
    await page
      .getByRole('combobox', { name: 'Category', exact: true })
      .selectOption(fixture.category);
    await page.getByLabel('Price (GH₵)').fill('65');
    await page.getByLabel('Campus location').fill('UCC North campus');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('saved on this device');
    await page.goto('/my-adverts');
    await expect(page.getByRole('region', { name: 'Drafts on this device' })).toContainText(
      'Live preview campus tutoring',
    );
    await page
      .getByRole('region', { name: 'Drafts on this device' })
      .getByRole('link', { name: 'Continue draft' })
      .click();
    await page.getByRole('button', { name: 'Restore draft', exact: true }).click();
    await expect(page.getByLabel('Advert title')).toHaveValue('Live preview campus tutoring');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(page.locator('.live-preview-panel h3')).toHaveText('Live preview campus tutoring');
    await expect(page.locator('.live-preview-panel .price')).toContainText('65');
    await page.screenshot({ path: testInfo.outputPath('composer-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Live preview campus tutoring');
    await page.evaluate(async () => {
      await Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => undefined)),
      );
    });
    await page.screenshot({
      path: testInfo.outputPath('composer-mobile-preview.png'),
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByLabel('Phone number', { exact: true }).fill('0241234567');
    await page.getByLabel('I consent to publish these contact details').check();
    await page.getByRole('button', { name: 'Review advert', exact: true }).click();
    await page.getByRole('button', { name: 'Publish advert', exact: true }).click();
    await expect(page).toHaveURL(/my-adverts\?published=1/);
    await expect(page.getByRole('status')).toContainText('live');
    await page.screenshot({ path: testInfo.outputPath('my-ads-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: testInfo.outputPath('my-ads-desktop.png'), fullPage: true });
    const listing = page.locator('.advert-row').filter({ hasText: 'Live preview campus tutoring' });
    await expect(listing.locator('.badge')).toHaveText('Live');
    await listing.getByRole('link', { name: 'Manage', exact: true }).click();
    await page.getByRole('link', { name: 'View live advert', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Live preview campus tutoring',
    );
  } finally {
    const current = (
      await (await admin.request.get('http://localhost:3000/api/v1/me/context')).json()
    ).settings;
    await admin.request.patch('http://localhost:3000/api/v1/admin/settings', {
      headers: { Origin: 'http://localhost:3000' },
      data: {
        ...policy,
        autoPublish: old.auto_publish,
        postingLimitsEnabled: old.posting_limits_enabled,
        expectedVersion: current.version,
      },
    });
    await admin.close();
  }
});

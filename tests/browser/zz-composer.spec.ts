import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const fixture = JSON.parse(
  readFileSync(process.env.BROWSER_FIXTURE_FILE ?? '/tmp/ucc-browser-fixtures.json', 'utf8'),
);
test('composer updates preview, restores local drafts and publishes without review or quotas', async ({
  page,
  browser,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
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
    await expect(
      page.locator('.post-heading').getByRole('button', { name: 'Save draft', exact: true }),
    ).toHaveCount(0);
    await expect(page.getByLabel('Campus location')).toHaveCount(0);
    await page.getByLabel('Advert title').fill('Live preview campus tutoring');
    await page
      .getByLabel('Description')
      .fill('Personal tutoring sessions around campus. Book a convenient afternoon session.');
    await page
      .getByRole('combobox', { name: 'Category', exact: true })
      .selectOption(fixture.category);
    await page.getByLabel('Price (GH₵)').fill('65');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(page.locator('.live-preview-panel h3')).toHaveText('Live preview campus tutoring');
    await expect(page.locator('.live-preview-panel .preview-brand strong')).toContainText(
      'MedStash',
    );
    await expect(page.locator('.live-preview-panel .preview-brand > div > span')).toHaveText(
      'Sponsored',
    );
    await expect(page.locator('.live-preview-heading')).not.toContainText('Updates as you type');
    const panels = await page.locator('.post-columns > *').evaluateAll((elements) =>
      elements.map((element) => ({
        height: element.getBoundingClientRect().height,
        overflow: getComputedStyle(element).overflowY,
      })),
    );
    expect(Math.abs(panels[0].height - panels[1].height)).toBeLessThan(2);
    expect(panels.every((panel) => panel.overflow === 'visible')).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('composer-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Live preview campus tutoring');
    await page.screenshot({
      path: testInfo.outputPath('composer-mobile-preview.png'),
      fullPage: true,
    });
    const chooser = page.waitForEvent('filechooser', { timeout: 10000 });
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Add a photo', exact: true })
      .click();
    await (await chooser).setFiles([]);
    await expect(
      page.getByRole('heading', { name: 'Photos & contact', exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Seller / Business Name')).toHaveAttribute('readonly', '');
    await expect(page.getByRole('button', { name: 'Restore Profile Defaults' })).toHaveCount(0);
    await page.getByLabel('Campus location').fill('UCC North campus');
    await page.getByLabel('Phone number', { exact: true }).fill('0241234567');
    await page.getByLabel('I consent to publish these contact details').check();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: testInfo.outputPath('composer-contacts-desktop.png'),
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Review advert', exact: true }).click();
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('saved on this device');
    await page.goto('/my-adverts');
    await page
      .getByRole('region', { name: 'Drafts on this device' })
      .getByRole('link', { name: 'Continue draft' })
      .click();
    await expect(page.getByRole('button', { name: 'Restore draft', exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Advert title')).toHaveValue('Live preview campus tutoring');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Review advert', exact: true }).click();
    await page.getByRole('button', { name: 'Publish advert', exact: true }).click();
    await expect(page).toHaveURL(/my-adverts\?published=1/);
    await expect(page.getByRole('status')).toContainText('live');
    await page.setViewportSize({ width: 390, height: 844 });
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
    try {
      const current = (
        await (
          await admin.request.get('http://localhost:3000/api/v1/me/context', { timeout: 5000 })
        ).json()
      ).settings;
      await admin.request.patch('http://localhost:3000/api/v1/admin/settings', {
        timeout: 5000,
        headers: { Origin: 'http://localhost:3000' },
        data: {
          ...policy,
          autoPublish: old.auto_publish,
          postingLimitsEnabled: old.posting_limits_enabled,
          expectedVersion: current.version,
        },
      });
    } catch {}
    await admin.close();
  }
});

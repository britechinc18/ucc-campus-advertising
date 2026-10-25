import { defaultControls } from '../../src/lib/platform-controls';
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
    platformControls: { ...defaultControls, enabled: false },
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
      'medstash.',
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
    const contactPanels = await page
      .locator('.post-columns > *')
      .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
    expect(Math.abs(contactPanels[0] - contactPanels[1])).toBeLessThan(2);
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
          platformControls: old.platform_controls ?? {
            ...defaultControls,
            enabled: true,
            personalPosting: old.auto_publish ? 'open' : 'approval',
            businessPosting: old.auto_publish ? 'open' : 'approval',
            advertEdits: old.auto_publish ? 'open' : 'approval',
            postingLimits: old.posting_limits_enabled,
          },
          autoPublish: old.auto_publish,
          postingLimitsEnabled: old.posting_limits_enabled,
          expectedVersion: current.version,
        },
      });
    } catch {}
    await admin.close();
  }
});

test('platform controls change review actions and master off restores open publishing', async ({
  page,
  browser,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.context().addCookies([
    {
      name: 'authjs.session-token',
      value: fixture.adminToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  const owner = await browser.newContext({ baseURL: 'http://localhost:3000' });
  await owner.addCookies([
    {
      name: 'authjs.session-token',
      value: fixture.ownerToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  const editor = await owner.newPage();
  const old = (await (await page.request.get('/api/v1/me/context')).json()).settings;
  const base = {
    enabled: true,
    registration: 'open',
    businessCreation: 'open',
    profileEdits: 'open',
    personalPosting: 'open',
    businessPosting: 'open',
    advertEdits: 'open',
    postingLimits: false,
    pauseMessage: 'Publishing is paused while we update the platform.',
  };
  async function policy(controls: typeof base) {
    const latest = (await (await page.request.get('/api/v1/me/context')).json()).settings;
    const response = await page.request.patch('/api/v1/admin/settings', {
      headers: { Origin: 'http://localhost:3000' },
      data: {
        maxActive: old.max_active,
        dailyLimit: old.daily_limit,
        durationDays: old.duration_days,
        maxImages: old.max_images,
        maxImageBytes: old.max_image_bytes,
        autoPublish: true,
        postingLimitsEnabled: false,
        platformControls: controls,
        expectedVersion: latest.version,
        reason: 'Verify platform control states in disposable browser tests',
      },
    });
    expect(response.status()).toBe(200);
  }
  async function review() {
    await editor.goto('/post?kind=service');
    await editor.getByLabel('Advert title').fill('Platform policy review example');
    await editor
      .getByLabel('Description')
      .fill('A complete service advert to verify the final review and publishing controls.');
    await editor
      .getByRole('combobox', { name: 'Category', exact: true })
      .selectOption(fixture.category);
    await editor.getByLabel('Price (GH₵)').fill('50');
    await editor.getByRole('button', { name: 'Continue', exact: true }).click();
    await editor.getByLabel('Campus location').fill('UCC campus');
    await editor.getByLabel('Phone number', { exact: true }).fill('0241234567');
    await editor.getByLabel('I consent to publish these contact details').check();
    await editor.getByRole('button', { name: 'Review advert', exact: true }).click();
    await expect(editor.locator('.advert-review-summary')).toContainText(
      'Platform policy review example',
    );
    await expect(editor.locator('.review-live-preview')).toHaveCount(0);
  }
  try {
    await policy(base);
    await page.goto('/admin/settings');
    await expect(page.getByRole('switch', { name: 'Enable restrictions' })).toBeChecked();
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.screenshot({
      path: testInfo.outputPath('platform-controls-desktop.png'),
      fullPage: true,
    });
    await review();
    await expect(editor.getByRole('button', { name: 'Publish advert', exact: true })).toBeEnabled();
    await editor.setViewportSize({ width: 1440, height: 1000 });
    await editor.screenshot({
      path: testInfo.outputPath('review-open-desktop.png'),
      fullPage: true,
    });
    await policy({ ...base, businessPosting: 'approval', personalPosting: 'approval' });
    await review();
    await expect(
      editor.getByRole('button', { name: 'Submit for approval', exact: true }),
    ).toBeEnabled();
    await editor.setViewportSize({ width: 390, height: 844 });
    await editor.screenshot({
      path: testInfo.outputPath('review-approval-mobile.png'),
      fullPage: true,
    });
    await policy({ ...base, businessPosting: 'paused', personalPosting: 'paused' });
    await review();
    await expect(
      editor.getByRole('button', { name: 'Publishing paused', exact: true }),
    ).toBeDisabled();
    await expect(editor.getByRole('button', { name: 'Save draft', exact: true })).toBeEnabled();
    await expect(editor.locator('.review-publishing-notice')).toContainText(base.pauseMessage);
    await editor.screenshot({
      path: testInfo.outputPath('review-paused-mobile.png'),
      fullPage: true,
    });
    await policy({ ...base, enabled: false, businessPosting: 'paused', personalPosting: 'paused' });
    await review();
    await expect(editor.getByRole('button', { name: 'Publish advert', exact: true })).toBeEnabled();
  } finally {
    await policy(
      old.platform_controls ?? {
        ...base,
        enabled: true,
        personalPosting: old.auto_publish ? 'open' : 'approval',
        businessPosting: old.auto_publish ? 'open' : 'approval',
        advertEdits: old.auto_publish ? 'open' : 'approval',
        postingLimits: old.posting_limits_enabled,
      },
    );
    await owner.close();
  }
});

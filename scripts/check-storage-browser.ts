// Opt-in real-storage integration, with local app/database/session fixtures only.
import { chromium, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
const base = process.env.APP_ORIGIN ?? '',
  branch = process.env.STORAGE_PROBE_BRANCH,
  endpoint = process.env.S3_ENDPOINT ?? '';
if (
  !['localhost', '127.0.0.1'].includes(new URL(base).hostname) ||
  !branch ||
  process.env.STORAGE_PROBE_CONFIRM !== 'isolated-test-bucket' ||
  !new URL(endpoint).hostname.startsWith(branch + '.storage.')
)
  throw new Error('A local test app and isolated storage branch must be explicitly confirmed');
const fixture = JSON.parse(
  readFileSync(process.env.BROWSER_FIXTURE_FILE ?? '/tmp/ucc-browser-fixtures.json', 'utf8'),
) as Record<string, string>;
const checks: string[] = [];
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
try {
  const owner = await browser.newContext({ baseURL: base, viewport: { width: 390, height: 844 } });
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
  const page = await owner.newPage();
  await page.goto('/post');
  await page.getByLabel('Advert title').fill('Isolated Neon image integration check');
  await page
    .getByRole('combobox', { name: 'Category', exact: true })
    .selectOption(fixture.category);
  await page.getByLabel('Price (GH₵)').fill('10');
  await page
    .getByLabel('Description')
    .fill(
      'Local database fixture only. Tests real signed upload, normalization and approved image visibility.',
    );
  await page.getByLabel('Campus location').fill('Local integration test');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const bytes = await sharp({
    create: { width: 128, height: 128, channels: 3, background: '#126e61' },
  })
    .jpeg()
    .toBuffer();
  await page
    .getByLabel('Select photographs')
    .setInputFiles({ name: 'storage-integration.jpg', mimeType: 'image/jpeg', buffer: bytes });
  await expect(page.locator('.uploaded-photo')).toHaveCount(1, { timeout: 30000 });
  await expect(page.locator('.uploaded-photo img')).toBeVisible();
  checks.push(
    'Browser presigned PUT and application upload completion succeed with real Neon storage',
  );
  const src = await page.locator('.uploaded-photo img').getAttribute('src');
  if (!src) throw new Error('No completed image reference');
  const preview = await owner.request.get(src);
  expect(preview.status()).toBe(200);
  expect(preview.headers()['content-type']).toContain('image/webp');
  checks.push('Owner preview serves the normalized WebP derivative');
  const anonymous = await browser.newContext({ baseURL: base });
  expect((await anonymous.request.get(src)).status()).toBe(404);
  checks.push('Unapproved image is hidden from anonymous API reads');
  await page.getByLabel('Phone number', { exact: true }).fill('0241234567');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Review advert' }).click();
  await page.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(page).toHaveURL(/my-adverts\?submitted=1/);
  const admin = await browser.newContext({ baseURL: base });
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
  const review = await admin.newPage();
  await review.goto('/admin/submissions');
  await review
    .locator('.data-row')
    .filter({ hasText: 'Isolated Neon image integration check' })
    .getByRole('link', { name: 'Review', exact: true })
    .click();
  await review.getByRole('button', { name: 'Approve advert', exact: true }).click();
  await review
    .getByRole('dialog')
    .getByLabel('Reason for the audit trail')
    .fill('Verified real storage pipeline with isolated fixtures.');
  await review.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(review).toHaveURL(/admin\/submissions$/);
  expect((await anonymous.request.get(src)).status()).toBe(200);
  checks.push('Approval exposes the derivative through the checked media API');
  await page.goto('/my-adverts');
  await page
    .locator('.advert-row')
    .filter({ hasText: 'Isolated Neon image integration check' })
    .getByRole('link', { name: 'Manage' })
    .click();
  await page.getByRole('button', { name: 'Mark as sold' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await anonymous.request.get(src)).status()).toBe(404);
  checks.push('Fulfillment immediately hides media from anonymous API reads');
  console.log(
    JSON.stringify({
      passed: checks.length,
      checks,
      database: 'local disposable browser database',
      storage: 'isolated Neon integration branch',
    }),
  );
} finally {
  await browser.close();
}

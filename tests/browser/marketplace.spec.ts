import { test, expect, type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const fixture = JSON.parse(
  readFileSync(process.env.BROWSER_FIXTURE_FILE ?? '/tmp/ucc-browser-fixtures.json', 'utf8'),
) as Record<string, string>;
async function session(context: BrowserContext, role: 'owner' | 'admin' | 'stranger' | 'business') {
  await context.addCookies([
    {
      name: 'authjs.session-token',
      value: fixture[`${role}Token`],
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

test('public search, filters, detail, contacts and reporting work without sign-in', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Fresh Finds', exact: true })).toBeVisible();
  await page.getByRole('searchbox').fill('tutoring');
  await page.getByRole('searchbox').press('Enter');
  await expect(page).toHaveURL(/q=tutoring/);
  await expect(page.locator('.listing')).toHaveCount(1);
  await page.locator('.listing').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Browser test tutoring service');
  await expect(page.locator('.contact-bar a').filter({ hasText: 'WhatsApp' })).toHaveAttribute(
    'href',
    /^https:\/\/wa.me\/233/,
  );
  await expect(page.locator('.contact-bar a').filter({ hasText: 'Call' })).toHaveAttribute(
    'href',
    'tel:+233241234567',
  );
  await expect(page.locator('.bottom-nav')).toHaveCount(0);
  await page.getByRole('button', { name: 'Report advert', exact: true }).click();
  await page.getByRole('combobox', { name: 'Reason', exact: true }).selectOption('duplicate');
  await page.getByLabel('Additional details').fill('Browser test report for administrator review.');
  await page.getByRole('button', { name: 'Send report' }).click();
  await expect(page.getByRole('status')).toContainText('report has been sent');
  await page.goto('/explore');
  await page.getByRole('button', { name: 'Filters & sort' }).click();
  await page.getByRole('dialog').getByLabel('Maximum price in Ghana cedis').fill('100');
  await page.getByRole('dialog').getByRole('button', { name: 'Apply filters' }).click();
  await expect(page).toHaveURL(/max=10000/);
  await expect(page.locator('.listing')).toHaveCount(2);
});

test('advertiser submits, admin approves, public search finds it, advertiser marks completed', async ({
  page,
  browser,
}) => {
  await session(page.context(), 'owner');
  await page.goto('/post');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Post an advert');
  await page.getByLabel('What are you posting?').selectOption('service');
  await page.getByLabel('Advert title').fill('Browser review tutoring appointment');
  await page
    .getByRole('combobox', { name: 'Category', exact: true })
    .selectOption(fixture.category);
  await page.getByLabel('Price (GH₵)').fill('65.50');
  await page
    .getByLabel('Description')
    .fill('Browser-only tutoring appointment to verify submission and approval end to end.');
  await page.getByLabel('Campus location').fill('Science Market');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Phone number', { exact: true }).fill('0241234567');
  await page.getByLabel('WhatsApp number', { exact: true }).fill('0241234567');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Review advert' }).click();
  await page.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(page).toHaveURL(/my-adverts\?submitted=1/);
  await expect(page.locator('.form-success')).toContainText('submitted for approval');
  const adminContext = await browser.newContext({
    baseURL: 'http://localhost:3000',
    viewport: { width: 1440, height: 1000 },
  });
  await session(adminContext, 'admin');
  const adminPage = await adminContext.newPage();
  await adminPage.goto('/admin/submissions');
  const row = adminPage
    .locator('.data-row')
    .filter({ hasText: 'Browser review tutoring appointment' });
  await row.getByRole('link', { name: 'Review', exact: true }).click();
  await adminPage.getByRole('button', { name: 'Approve advert', exact: true }).click();
  await adminPage
    .getByRole('dialog')
    .getByLabel('Reason for the audit trail')
    .fill('Reviewed complete browser test submission.');
  await adminPage.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(adminPage).toHaveURL(/admin\/submissions$/);
  const publicContext = await browser.newContext({ baseURL: 'http://localhost:3000' });
  const publicPage = await publicContext.newPage();
  await publicPage.goto('/explore?q=appointment');
  await expect(publicPage.locator('.listing')).toHaveCount(1);
  await expect(publicPage.locator('.listing .price')).toHaveText('GH₵65.50');
  await page.goto('/my-adverts');
  await page
    .locator('.advert-row')
    .filter({ hasText: 'Browser review tutoring appointment' })
    .getByRole('link', { name: 'Manage' })
    .click();
  await page.getByRole('button', { name: 'Mark as completed' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mark as completed' })).toHaveCount(0);
  await publicPage.reload();
  await expect(publicPage.locator('.listing')).toHaveCount(0);
  await adminContext.close();
  await publicContext.close();
});

test('admin reviews reports, settings and account permissions', async ({ page, browser }) => {
  await session(page.context(), 'admin');
  await page.goto('/admin/reports');
  const report = page.locator('.data-row').filter({ hasText: 'Browser test report' });
  await report.getByRole('button', { name: 'Resolve', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Resolution', { exact: true })
    .fill('Reviewed advert evidence and resolved browser test report.');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(report).toHaveCount(0);
  await page.getByLabel('Report status').selectOption('resolved');
  await expect(page.locator('.data-row').filter({ hasText: 'Browser test report' })).toBeVisible();
  await page.goto('/admin/settings');
  await page.getByLabel('Maximum active adverts').fill('6');
  await page.getByLabel('Reason for the audit trail').fill('Browser test configuration change.');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByLabel('Maximum active adverts')).toHaveValue('6');
  const unauthorized = await browser.newContext({ baseURL: 'http://localhost:3000' });
  await session(unauthorized, 'owner');
  const result = await unauthorized.request.get('/api/v1/admin/overview');
  expect(result.status()).toBe(403);
  const other = await unauthorized.newPage();
  await other.goto('/admin');
  await expect(other).toHaveURL(/my-adverts$/);
  await unauthorized.close();
});

test('theme override, dialog focus and onboarding work', async ({ page }) => {
  await page.goto('/explore');
  await page.getByRole('button', { name: 'Toggle light and dark theme' }).click();
  const theme = await page.locator('html').getAttribute('data-theme');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme!);
  const trigger = page.getByRole('button', { name: 'Filters & sort' });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await session(page.context(), 'stranger');
  await page.goto('/my-adverts');
  await expect(page).toHaveURL(/onboarding/);
  await page.getByLabel('Advertiser name').fill('Browser New Student');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create advertiser profile' }).click();
  await expect(page).toHaveURL(/my-adverts$/);
});

test('responsive pages and both themes have no serious/critical automated accessibility violations', async ({
  page,
}) => {
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('ucc-theme');
    });
    await page.reload();
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const path of [
        '/',
        '/explore',
        '/businesses',
        '/businesses/browser-test-services',
        `/adverts/${fixture.publicId}`,
        '/help',
        '/sign-in',
      ]) {
        await page.goto(path);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${path} ${theme} ${width}`,
        ).toBe(true);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of [
      '/',
      '/explore',
      '/businesses',
      `/adverts/${fixture.publicId}`,
      '/sign-in',
    ]) {
      await page.goto(path);
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        result.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')),
        JSON.stringify(
          result.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => n.target),
          })),
        ),
      ).toEqual([]);
    }
  }
  await session(page.context(), 'admin');
  for (const path of [
    '/admin',
    '/admin/submissions',
    '/admin/adverts',
    '/admin/reports',
    '/admin/advertisers',
    '/admin/businesses',
    '/admin/categories',
    '/admin/settings',
    '/admin/audit',
  ]) {
    await page.goto(path);
    await expect(page.locator('.loading-state')).toHaveCount(0);
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${path} ${width}`,
      ).toBe(true);
    }
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      result.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')),
      JSON.stringify(
        result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      ),
    ).toEqual([]);
  }
});

test('business edits remain private until approved and upload failure never looks successful', async ({
  page,
  browser,
}) => {
  await session(page.context(), 'business');
  await page.goto('/my-business');
  await page
    .getByLabel('About your business')
    .fill('Browser business profile updated through the real moderation workflow.');
  await page.getByLabel('WhatsApp (optional)').fill('0241234567');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(page.getByRole('status')).toContainText('submitted');
  const publicContext = await browser.newContext({ baseURL: 'http://localhost:3000' });
  const pub = await publicContext.newPage();
  await pub.goto('/businesses/browser-test-services');
  await expect(pub.locator('.description')).not.toContainText(
    'updated through the real moderation',
  );
  const adminContext = await browser.newContext({ baseURL: 'http://localhost:3000' });
  await session(adminContext, 'admin');
  const admin = await adminContext.newPage();
  await admin.goto('/admin/businesses');
  await admin
    .locator('.data-row')
    .filter({ hasText: 'Browser Test Campus Services' })
    .getByRole('button', { name: 'Approve', exact: true })
    .click();
  await admin
    .getByRole('dialog')
    .getByLabel('Reason for the audit trail')
    .fill('Reviewed business contact changes in local browser test.');
  await admin.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(admin.getByRole('dialog')).toHaveCount(0);
  await pub.reload();
  await expect(pub.locator('.description')).toContainText('updated through the real moderation');
  await expect(pub.getByRole('link', { name: 'WhatsApp', exact: true })).toHaveAttribute(
    'href',
    'https://wa.me/233241234567',
  );
  await page.goto('/post');
  await page.getByLabel('What are you posting?').selectOption('wanted');
  await page.getByLabel('Advert title').fill('Browser wanted study supplies');
  await page
    .getByRole('combobox', { name: 'Category', exact: true })
    .selectOption(fixture.category);
  await page.getByLabel('Budget (GH₵)').fill('75');
  await page
    .getByLabel('Description')
    .fill('Browser fixture wanted request for study supplies in good condition.');
  await page.getByLabel('Campus location').fill('UCC campus');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Select photographs').setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.getByRole('alert').filter({ hasText: 'Photo uploads' })).toContainText(
    'temporarily unavailable',
  );
  await expect(page.locator('.uploaded-photo')).toHaveCount(0);
  await adminContext.close();
  await publicContext.close();
});

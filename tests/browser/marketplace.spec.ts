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
  await page.getByLabel('Menu', { exact: true }).click();
  await page.getByRole('button', { name: 'Toggle light and dark theme' }).click();
  await page.keyboard.press('Escape');
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
  await page.getByRole('button', { name: 'Activate seller tools' }).click();
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

test('search keeps active filters and account menu dismisses with Escape and outside click', async ({
  page,
}) => {
  await page.goto('/explore?max=10000');
  await page.getByRole('searchbox').fill('tutoring');
  await page.getByRole('searchbox').press('Enter');
  await expect(page).toHaveURL(/max=10000/);
  await expect(page).toHaveURL(/q=tutoring/);
  await page.getByRole('link', { name: 'Remove Up to GH₵100.00 filter' }).click();
  await expect(page).toHaveURL(/q=tutoring/);
  await expect(page).not.toHaveURL(/max=/);
  await page.getByLabel('Menu', { exact: true }).click();
  await expect(page.locator('.account-menu')).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(page.locator('.account-menu')).not.toHaveAttribute('open');
  await expect(page.getByLabel('Menu', { exact: true })).toBeFocused();
  await page.getByLabel('Menu', { exact: true }).click();
  await page.getByRole('heading', { level: 1 }).click();
  await expect(page.locator('.account-menu')).not.toHaveAttribute('open');
});

test('anonymous buyer discovers all Campus 360 categories and saves without an account', async ({
  page,
}) => {
  const ids = (fixture as unknown as { flyerIds: Record<string, string> }).flyerIds;
  await page.goto('/');
  await expect(page.locator('.buyer-nav')).toBeVisible();
  await expect(page.locator('.buyer-nav')).toContainText('Market');
  await expect(page.locator('.buyer-nav')).toContainText('Saved');
  await expect(page.locator('.buyer-nav')).not.toContainText('Post');
  await page.goto('/campus-360');
  await expect(page.locator('.campus-banner')).toHaveCount(4);
  for (const [slug, kind] of [
    ['events', 'event'],
    ['promotions', 'promotion'],
    ['announcements', 'announcement'],
    ['businesses', 'business_ad'],
  ]) {
    await page.goto(`/campus-360/${slug}`);
    await expect(page.locator('.flyer-card')).toHaveCount(1);
    await page.locator('.flyer-link').click();
    await expect(page).toHaveURL(new RegExp(ids[kind]));
    await expect(page.locator('.flyer-detail')).toBeVisible();
    await expect(
      page.getByRole('link', {
        name: kind === 'event' ? 'Registration / event link' : 'Visit advertiser’s link',
      }),
    ).toHaveAttribute('href', 'https://example.org/register');
    await expect(page.locator('.detail-content .price')).toHaveCount(0);
  }
  await page.getByRole('button', { name: /^Save advert:/ }).click();
  await page.goto('/saved');
  await expect(page.locator('.flyer-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.flyer-card')).toHaveCount(1);
  await page.getByRole('button', { name: /^Unsave advert:/ }).click();
  await expect(page.getByRole('heading', { name: 'Keep a good find close.' })).toBeVisible();
  await page.goto('/explore');
  await expect(page.locator('.flyer-card')).toHaveCount(0);
  await page
    .locator('.listing')
    .first()
    .getByRole('button', { name: /^Save advert:/ })
    .click();
  await page.goto('/saved');
  await expect(page.locator('.listing')).toHaveCount(1);
  await page.goto('/sell');
  await page.getByRole('link', { name: 'Start selling with MedStash' }).click();
  await expect(page).toHaveURL(/sign-in/);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
});

test('existing seller gets flat navigation and can draft every supported advert type', async ({
  page,
}) => {
  const media = (fixture as unknown as { testMedia: string[] }).testMedia;
  await session(page.context(), 'owner');
  await page.goto('/');
  await expect(page.locator('.seller-nav')).toContainText('My Ads');
  await expect(page.locator('.buyer-nav')).toHaveCount(0);
  await page.goto('/my-adverts');
  await expect(
    page.getByRole('region', { name: 'Create an advert' }).getByRole('link'),
  ).toHaveCount(7);
  await page.getByRole('link', { name: 'Share an event' }).click();
  await expect(page.getByLabel('What are you posting?')).toHaveValue('event');
  await expect(page.getByLabel('Event start (Ghana time)')).toBeVisible();
  await page.goto('/post?kind=invalid');
  await expect(page.getByLabel('What are you posting?')).toHaveValue('product');
  let uploaded = 0;
  await page.route('**/api/v1/uploads/sign', (route) =>
    route.fulfill({
      json: {
        mediaId: media[uploaded++ % media.length],
        uploadUrl: 'http://localhost:3000/test-only-upload',
      },
    }),
  );
  await page.route('**/test-only-upload', (route) => route.fulfill({ status: 200, body: '' }));
  await page.route('**/api/v1/uploads/complete', (route) =>
    route.fulfill({ json: { state: 'ready' } }),
  );
  for (const kind of [
    'product',
    'service',
    'wanted',
    'event',
    'promotion',
    'announcement',
    'business_ad',
  ]) {
    await page.goto('/post');
    await page.getByLabel('What are you posting?').selectOption(kind);
    await page.getByLabel('Advert title').fill(`Campus browser draft ${kind}`);
    if (['product', 'service', 'wanted'].includes(kind)) {
      await page
        .getByRole('combobox', { name: 'Category', exact: true })
        .selectOption(fixture.category);
      await page
        .getByLabel(kind === 'wanted' ? 'Budget (GH₵)' : 'Price (GH₵)', { exact: true })
        .fill('90');
    } else {
      await expect(page.getByLabel('Price (GH₵)', { exact: true })).toHaveCount(0);
      if (kind === 'event')
        await page.getByLabel('Event start (Ghana time)').fill('2030-01-01T12:00');
      if (kind === 'promotion')
        await page.getByLabel('Offer description').fill('Twenty percent off campus printing');
      await page
        .getByLabel(kind === 'event' ? 'Registration link (optional)' : 'External link (optional)')
        .fill('https://example.org/campus');
    }
    await page
      .getByRole('textbox', { name: /^Description/ })
      .fill('Local browser draft covering the full real advert creation API.');
    await page
      .getByLabel(kind === 'event' ? 'Event venue' : 'Campus location', { exact: true })
      .fill('Campus central hall');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    if (kind !== 'service' && kind !== 'wanted') {
      await page.getByLabel('Select photographs').setInputFiles({
        name: `${kind}.png`,
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=',
          'base64',
        ),
      });
      await expect(page.locator('.uploaded-photo')).toHaveCount(1);
    }
    await page.getByLabel('Phone number', { exact: true }).fill('0241234567');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Review advert' }).click();
    if (kind === 'event') {
      await page.getByRole('button', { name: 'Submit for approval' }).click();
      await expect(page).toHaveURL(/submitted=1/);
    } else {
      await page.getByRole('button', { name: 'Save as draft' }).click();
      await expect(page.getByRole('status')).toContainText('Draft saved');
    }
  }
  await page.goto('/my-adverts');
  await expect(page.getByText('Campus browser draft event', { exact: true })).toBeVisible();
});

test('new buyer screens are responsive, accessible and honor reduced motion in both themes', async ({
  page,
}) => {
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    for (const path of [
      '/campus-360',
      '/campus-360/events',
      '/campus-360/promotions',
      '/campus-360/announcements',
      '/campus-360/businesses',
      '/saved',
      '/sell',
    ]) {
      await page.goto(path);
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 950 });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${path} ${theme} ${width}`,
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
  }
  await page.setViewportSize({ width: 390, height: 950 });
  await page.goto('/campus-360');
  for (const banner of await page.locator('.campus-banner').all()) {
    const box = await banner.boundingBox();
    expect(Math.abs(box!.width - box!.height)).toBeLessThan(2);
  }
  expect(
    await page
      .locator('.campus-banner')
      .first()
      .evaluate((e) => getComputedStyle(e).transitionDuration),
  ).toBe('0s');
});

test('brand icons, buyer menu, seller avatar and real notification panels work', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.site-header .wordmark')).toHaveText('medstash.');
  await expect(page.locator('.site-header .mark')).toHaveCount(0);
  await expect(page.getByLabel('Menu', { exact: true })).toBeVisible();
  await expect(page.locator('.seller-avatar')).toHaveCount(0);
  await page.getByRole('link', { name: 'Search MedStash', exact: true }).click();
  await expect(page.locator('#market-search')).toBeFocused();
  const bell = page.locator('.notification-menu > summary');
  await bell.click();
  await expect(page.locator('.notification-content')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.notification-content')).toContainText('Campus announcement');
  await expect(page.locator('.notification-panel')).not.toContainText('Advert approved');
  await page.keyboard.press('Escape');
  await expect(bell).toBeFocused();
  await expect(page.locator('.notification-menu')).not.toHaveAttribute('open');
  await page.route('**/api/v1/notifications', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({ status: 503, json: { message: 'Unavailable' } });
  });
  await bell.click();
  await expect(page.getByText('Loading notifications')).toBeAttached();
  await expect(page.getByText('We couldn’t load your updates.')).toBeVisible();
  await page.unroute('**/api/v1/notifications');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.notification-content')).toContainText('Campus announcement');
  await page.getByLabel('Menu', { exact: true }).click();
  await expect(page.locator('.notification-menu')).not.toHaveAttribute('open');
  await page.keyboard.press('Escape');
  await page.route('**/api/v1/notifications', (route) =>
    route.fulfill({ json: { audience: 'public', items: [] } }),
  );
  await bell.click();
  await expect(page.getByText('No updates yet.')).toBeVisible();
  await page.mouse.click(3, 400);
  await expect(page.locator('.notification-menu')).not.toHaveAttribute('open');
  await page.unroute('**/api/v1/notifications');
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.name).toBe('MedStash');
  for (const icon of manifest.icons) expect((await page.request.get(icon.src)).status()).toBe(200);
  expect((await page.request.get('/favicon.ico')).status()).toBe(200);
  expect(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')).toBe(
    '/icons/apple-touch-icon.png',
  );
  await session(page.context(), 'owner');
  await page.goto('/my-adverts');
  await expect(page.getByLabel('Account menu')).toBeVisible();
  await expect(page.locator('.seller-avatar')).toBeVisible();
  await page.locator('.notification-menu > summary').click();
  await expect(page.locator('.notification-content')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.notification-content')).toContainText('Advert approved');
  await page.keyboard.press('Escape');
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('.notification-menu > summary').click();
    await expect(page.locator('.notification-content')).toHaveAttribute('aria-busy', 'false');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const box = await page.locator('.notification-panel').boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    const violations = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      violations.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')),
    ).toEqual([]);
    if (width === 390 || width === 1440)
      await page.screenshot({ path: '/tmp/medstash-header-' + width + '.png' });
    await page.keyboard.press('Escape');
  }
});

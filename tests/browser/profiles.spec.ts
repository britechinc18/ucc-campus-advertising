import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const fixture = JSON.parse(readFileSync('/tmp/ucc-browser-fixtures.json', 'utf8')) as Record<
  string,
  string
>;
async function session(context: BrowserContext, role: string) {
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
async function field(page: Page, action: RegExp | string, value: string) {
  await page.getByRole('button', { name: action, exact: typeof action === 'string' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('textbox')).toHaveCount(1);
  await dialog.getByRole('textbox').fill(value);
  const consent = dialog.getByRole('checkbox');
  if (await consent.count()) await consent.check();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
}
async function introduction(page: Page, value: string) {
  await page.getByRole('button', { name: /^(Add|Edit) introduction/ }).click();
  await page.locator('.profile-inline-editor textarea').fill(value);
  await page
    .locator('.profile-inline-editor')
    .getByRole('button', { name: 'Save', exact: true })
    .click();
  await expect(page.locator('.profile-inline-editor')).toHaveCount(0);
}

test('seller manages separate profiles and posting autofill preserves explicit overrides', async ({
  page,
  browser,
}) => {
  await session(page.context(), 'profilesOwner');
  await page.goto('/my-profile');
  await expect(page.getByRole('navigation', { name: 'Profile identity' })).toHaveCount(0);
  await expect(page.getByText('Business seller', { exact: true })).toHaveCount(0);
  await field(page, 'Edit name', 'Profile Test Seller');
  await field(page, /^(Add|Edit) Location$/, 'UCC North campus');
  await field(page, /^(Add|Edit) WhatsApp$/, '0543982307');
  await field(page, /^(Add|Edit) Phone number$/, '0241234567');
  await expect(page.getByRole('button', { name: 'Save private draft' })).toHaveCount(0);
  const admin = await browser.newContext();
  await session(admin, 'admin');
  const review = await admin.newPage();
  await page.goto('/my-business');
  await page.getByLabel('Business / advertiser name').fill('Profile Test Business');
  await page.getByRole('checkbox').check();
  await page.getByLabel('Phone number', { exact: true }).fill('0241234567');
  await page.getByLabel('WhatsApp number', { exact: true }).fill('0241234567');
  await page.getByLabel('Location', { exact: true }).fill('UCC campus');
  await page.getByRole('button', { name: 'Save and continue →' }).click();
  await expect(page.getByRole('heading', { name: 'You’re ready to sell.' })).toBeVisible();
  await page.getByRole('button', { name: 'Start posting →' }).click();
  await expect(page).toHaveURL(/my-business/);
  await introduction(page, 'Student-run services and supplies at UCC campus.');
  await field(page, /^(Add|Edit) Location$/, 'UCC Business Centre');
  await field(page, /^(Add|Edit) WhatsApp$/, '0201234567');
  await field(page, /^(Add|Edit) Phone number$/, '0201234567');
  await page.goto('/my-profile');
  await expect(page.locator('.profile-identity-card h2')).toHaveText('Profile Test Seller');
  await page
    .getByRole('navigation', { name: 'Profile identity' })
    .getByRole('link', { name: 'Business', exact: true })
    .click();
  await expect(page.locator('.profile-identity-card h2')).toHaveText('Profile Test Business');
  await field(page, /^(Add|Edit) Facebook$/, '@campusbusiness');
  await expect(page.getByRole('link', { name: '@campusbusiness' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Profile identity' })
    .getByRole('link', { name: 'Personal', exact: true })
    .click();
  await expect(page.locator('.profile-identity-card h2')).toHaveText('Profile Test Seller');
  await expect(page.getByRole('link', { name: '@campusbusiness' })).toHaveCount(0);
  const personal = await page.request.get('/api/v1/me/personal');
  const identity = await personal.json();
  await page.goto(`/post?advertiserId=${identity.id}`);
  await page.getByLabel('What are you posting?').selectOption('service');
  await page.getByLabel('Advert title').fill('Profile autofill campus tutoring');
  await page
    .getByLabel('Description')
    .fill('A complete service description for testing seller contact defaults.');
  await page
    .getByRole('combobox', { name: 'Category', exact: true })
    .selectOption(fixture.category);
  await page.getByLabel('Price (GH₵)').fill('55');
  await expect(page.getByLabel('Campus location', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('Campus location', { exact: true })).toHaveValue('UCC North campus');
  await expect(page.getByLabel('Seller / Business Name')).toHaveValue('Profile Test Seller');
  await expect(page.getByLabel('WhatsApp number', { exact: true })).toHaveValue('+233543982307');
  await page.getByLabel('Phone number', { exact: true }).fill('0271234567');
  // Upload transport is stubbed only to verify identity-bound photo clearing; the mock media is never submitted.
  await page.route('**/api/v1/uploads/sign', (route) =>
    route.fulfill({
      json: { mediaId: fixture.testMedia, uploadUrl: 'http://localhost:3000/profile-upload-test' },
    }),
  );
  await page.route('**/profile-upload-test', (route) => route.fulfill({ status: 200 }));
  await page.route('**/api/v1/uploads/complete', (route) => route.fulfill({ json: { ok: true } }));
  await page.getByLabel('Select photographs').setInputFiles({
    name: 'identity-test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.locator('.uploaded-photo')).toHaveCount(1);

  await page
    .getByRole('group', { name: 'Public identity' })
    .getByRole('button', { name: 'Business', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Photos belong to the current identity');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.locator('.uploaded-photo')).toHaveCount(0);

  await expect(page.getByLabel('Seller / Business Name')).toHaveValue('Profile Test Business');
  await expect(page.getByLabel('Phone number', { exact: true })).toHaveValue('0271234567');
  await expect(page.getByLabel('WhatsApp number', { exact: true })).toHaveValue('+233201234567');
  await expect(page.getByRole('button', { name: 'Restore Profile Defaults' })).toHaveCount(0);
  await expect(page.getByLabel('Seller / Business Name')).toHaveAttribute('readonly', '');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByLabel('Phone number', { exact: true }).fill('0271234567');
  await page.getByLabel('I consent to publish these contact details').check();
  await page.getByRole('button', { name: 'Review advert', exact: true }).click();
  await page.getByRole('button', { name: 'Submit for approval', exact: true }).click();
  await expect(page).toHaveURL(/my-adverts\?submitted=1/);
  await page
    .locator('.advert-row')
    .filter({ hasText: 'Profile autofill campus tutoring' })
    .getByRole('link', { name: 'Manage', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Profile autofill campus tutoring', exact: true }),
  ).toBeVisible();
  await review.goto('/admin/submissions');
  await review
    .locator('.data-row')
    .filter({ hasText: 'Profile autofill campus tutoring' })
    .getByRole('link', { name: 'Review', exact: true })
    .click();
  await review.getByRole('button', { name: 'Approve advert', exact: true }).click();
  await review
    .getByRole('dialog')
    .getByLabel('Reason for the audit trail')
    .fill('Checked autofill and explicit phone override');
  await review.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(review.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await page.getByRole('link', { name: 'Edit advert', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Public identity' })).toHaveCount(0);
  await expect(page.getByLabel('Phone number', { exact: true })).toHaveValue('+233271234567');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByLabel('Advert title')).toHaveValue('Profile autofill campus tutoring');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('Phone number', { exact: true })).toHaveValue('+233271234567');
  await admin.close();
});
test('profile management pages remain accessible at mobile and desktop widths in both themes', async ({
  page,
}) => {
  await session(page.context(), 'lifecycleOwner');
  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme as 'light' | 'dark' });
    await page.addInitScript((value) => localStorage.setItem('ucc-theme', value), theme);
    for (const route of ['/my-profile', '/my-personal-profile']) {
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        if (route === '/my-personal-profile')
          await expect(page.locator('.profile-overview')).toBeVisible();
        else
          await expect(
            page.getByRole('heading', { name: 'My Profile', exact: true }),
          ).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        if (route === '/my-personal-profile' && [390, 1440].includes(width))
          await page.screenshot({
            path: `/tmp/medstash-personal-${theme}-${width}.png`,
            fullPage: true,
          });
      }
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')),
      ).toEqual([]);
    }
  }
});

test('business lifecycle confirms deactivation, reviewed reopening and closure without removing personal identity', async ({
  page,
  browser,
}) => {
  await session(page.context(), 'lifecycleOwner');
  const write = async (path: string, data: unknown) => {
    const result = await page.request.post(`/api/v1/${path}`, {
      headers: { Origin: 'http://localhost:3000' },
      data,
    });
    expect(result.ok(), await result.text()).toBe(true);
    return result.json();
  };
  const profile = await write('me/profile', {
    name: 'Lifecycle Test Business',
    kind: 'business',
    consent: true,
  });
  await write('me/business', {
    name: 'Lifecycle Test Business',
    slug: 'lifecycle-test-business',
    description: 'A student business for testing availability and safe closure.',
    location: 'UCC campus',
    phone: '0241234567',
    whatsapp: '0543982307',
    contactConsent: true,
    defaultsEnabled: true,
    version: 0,
  });
  const admin = await browser.newContext();
  await session(admin, 'admin');
  await page.goto('/my-business');
  await page.getByRole('button', { name: 'Deactivate business', exact: true }).click();
  await page.getByRole('dialog').getByRole('checkbox').check();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Request reactivation', exact: true }),
  ).toBeVisible();
  expect((await page.request.get('/api/v1/businesses/lifecycle-test-business')).status()).toBe(404);
  await page.getByRole('button', { name: 'Request reactivation', exact: true }).click();
  await page.getByRole('dialog').getByRole('checkbox').check();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByText('Reactivation is awaiting administrator review.')).toBeVisible();
  const reviewer = await admin.newPage();
  await reviewer.goto('/admin/profiles');
  await reviewer
    .locator('article')
    .filter({ hasText: 'Lifecycle Test Business' })
    .getByRole('button', { name: 'Approve reactivation', exact: true })
    .click();
  await reviewer.getByLabel('Reason for decision').fill('Owner confirmed business can reopen');
  await reviewer.getByRole('button', { name: 'Confirm decision', exact: true }).click();
  await expect(reviewer.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Deactivate business', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close business', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Type Lifecycle Test Business to confirm')
    .fill('Lifecycle Test Business');
  await page.getByRole('dialog').getByRole('checkbox').check();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page).toHaveURL(/my-profile/);
  await expect(page.locator('.profile-identity-card')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Profile identity' })).toHaveCount(0);
  const context = await (await page.request.get('/api/v1/me/context')).json();
  expect(context.profiles).toHaveLength(1);
  expect(context.profiles[0].kind).toBe('student');
  expect(context.profiles[0].id).not.toBe(profile.id);
  await admin.close();
});

test('admin handover explicitly confirms replacement of an unused automatic personal profile', async ({
  page,
}) => {
  await session(page.context(), 'admin');
  await page.goto('/admin/post');
  await page.getByLabel('Public advertiser name').fill('Verified Assisted Student');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create advertiser & continue' }).click();
  await expect(page).toHaveURL(/post\?advertiserId=/);
  const identity = new URL(page.url()).searchParams.get('advertiserId');
  await page.goto(`/admin/advertisers/${identity}`);
  await page.getByText('Assign verified owner', { exact: true }).click();
  await page
    .getByLabel('Find verified account by name or email')
    .fill('placeholderowner@test.invalid');
  await page.getByRole('button', { name: 'Find account', exact: true }).click();
  await page.getByRole('radio').check();
  const replacement = page.getByLabel('Replace this account’s unused automatic personal profile.', {
    exact: false,
  });
  await expect(replacement).toBeVisible();
  await replacement.check();
  await page
    .getByLabel('Private verification evidence reference')
    .fill('Verified contact and handover consent');
  await page.getByLabel('I verified that this account belongs to the advertiser.').check();
  await page.getByLabel('The advertiser consented to this handover.').check();
  await page.getByRole('button', { name: 'Confirm handover', exact: true }).click();
  await expect(page.getByText('Claimed', { exact: false }).first()).toBeVisible();
  await session(page.context(), 'placeholderOwner');
  const context = await (await page.request.get('/api/v1/me/context')).json();
  expect(context.profiles).toHaveLength(1);
  expect(context.profiles[0].id).toBe(identity);
});

test('focused editors guide input, cancel cleanly and keep visibility beside each optional item', async ({
  page,
}, testInfo) => {
  await session(page.context(), 'profilesOwner');
  await page.goto('/my-profile');
  await expect(page.getByRole('heading', { name: 'Public visibility', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: /^(Add|Edit) WhatsApp$/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('textbox')).toHaveCount(1);
  await expect(dialog.getByText(/country code/)).toBeVisible();
  await dialog.getByRole('textbox').fill('invalid');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await field(page, /^(Add|Edit) WhatsApp$/, '0241234567');
  await page.reload();
  await expect(page.locator('.profile-detail-row').filter({ hasText: 'WhatsApp' })).toContainText(
    '+233241234567',
  );
  await page.getByRole('button', { name: /^(Add|Edit) Snapchat$/ }).click();
  await expect(dialog.getByRole('textbox')).toHaveCount(1);
  await expect(dialog.getByText(/snapchat.com\/add\/username/)).toBeVisible();
  await dialog.getByRole('textbox').fill('@campus_snap');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('link', { name: '@campus_snap' })).toHaveAttribute(
    'href',
    'https://www.snapchat.com/add/campus_snap',
  );
  const visible = page.getByRole('switch', { name: 'Show Snapchat', exact: true });
  await visible.click();
  await expect(visible).toHaveAttribute('aria-checked', 'false');
  await page.reload();
  await expect(visible).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('button', { name: 'Change profile photo' }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Choose profile image')).toHaveAttribute(
    'accept',
    'image/jpeg,image/png,image/webp',
  );
  await expect(dialog.getByText('Cover photo first.', { exact: false })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('button', { name: /^(Add|Edit) Phone number$/ }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('textbox')).toBeFocused();
    await page.screenshot({
      animations: 'disabled',
      path: testInfo.outputPath(`focused-phone-${width}.png`),
    });
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
});

test('profile cards align, dialogs stay compact and only the saved control reacts', async ({
  page,
}, testInfo) => {
  await session(page.context(), 'profilesOwner');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/my-profile');
  await expect(page.getByText('Your seller details, in one place.', { exact: true })).toHaveCount(
    0,
  );
  const heading = await page.locator('.profile-page-heading h1').boundingBox();
  const tabs = await page.getByRole('navigation', { name: 'Profile identity' }).boundingBox();
  expect(tabs!.x).toBeGreaterThan(heading!.x + heading!.width);
  const bottom = await page.locator('.profile-dashboard').evaluate((el) => {
    const left = el
      .querySelector('.profile-left-column')!
      .lastElementChild!.getBoundingClientRect();
    const right = el
      .querySelector('.profile-right-column > .profile-section:last-of-type')!
      .getBoundingClientRect();
    return Math.abs(left.bottom - right.bottom);
  });
  expect(bottom).toBeLessThan(2);
  await expect(page.getByRole('link', { name: /Manage adverts/ })).toHaveCount(0);
  const toggle = page.getByRole('switch', { name: 'Show Instagram', exact: true });
  let finish!: () => void;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route(
    '**/api/v1/me/profile-details',
    async (route) => {
      await gate;
      await route.continue();
    },
    { times: 1 },
  );
  await toggle.click();
  await expect(toggle).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Edit name', exact: true })).toBeEnabled();
  await expect(page.getByRole('switch', { name: 'Show TikTok', exact: true })).toBeEnabled();
  finish();
  await expect(toggle).toBeEnabled();
  let finishBio!: () => void;
  const bioGate = new Promise<void>((resolve) => {
    finishBio = resolve;
  });
  await page.route(
    '**/api/v1/me/profile-details',
    async (route) => {
      await bioGate;
      await route.continue();
    },
    { times: 1 },
  );
  await page.getByRole('button', { name: /^(Add|Edit) introduction/ }).click();
  await page
    .locator('.profile-inline-editor textarea')
    .fill('A short introduction saved without disturbing another editor.');
  const bioSave = page.locator('.profile-inline-editor').getByRole('button', { name: /^Sav/ });
  await bioSave.click();
  await expect(bioSave).toBeDisabled();
  await page.getByRole('button', { name: /^(Add|Edit) Phone number$/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  finishBio();
  await expect(page.getByRole('status')).toHaveText('Saved.');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: /^(Add|Edit) Phone number$/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect((await dialog.boundingBox())!.height).toBeLessThan(330);
  await expect(dialog.getByRole('heading', { name: 'Phone number', exact: true })).toBeVisible();
  await expect(dialog.locator('.form-label')).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('profile-compact-desktop.png'),
    animations: 'disabled',
  });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Profile identity' })
    .getByRole('link', { name: 'Business', exact: true })
    .click();
  await expect(
    page
      .locator('.profile-left-column')
      .getByRole('heading', { name: 'Business details', exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator('.profile-identity-card')
      .getByRole('button', { name: 'Deactivate business', exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator('.profile-right-column')
      .getByRole('heading', { name: 'Business details', exact: true }),
  ).toHaveCount(0);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('button', { name: /^(Add|Edit) Phone number$/ }).click();
    await expect(dialog).toBeVisible();
    expect((await dialog.boundingBox())!.height).toBeLessThan(380);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
});

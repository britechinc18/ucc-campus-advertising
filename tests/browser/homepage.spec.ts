import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, mkdirSync } from 'node:fs';
const fixture = JSON.parse(readFileSync('/tmp/ucc-browser-fixtures.json', 'utf8')) as Record<
  string,
  string
>;
const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
test('homepage follows real discovery routes and preserves buyer and seller actions', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Buy, Sell &Discover on Campus');
  await expect(page.locator('.home-listing-card')).not.toHaveCount(0);
  await expect(page.locator('.home-seller').first()).toContainText('Browser');
  const category = page.locator('#home-category option').nth(1);
  const value = await category.getAttribute('value');
  await page.getByLabel('Filter by category').selectOption(value!);
  await page.locator('#market-search').fill('tutoring');
  await page.getByRole('button', { name: 'Search listings' }).click();
  await expect(page).toHaveURL(/explore\?/);
  expect(new URL(page.url()).searchParams.get('category')).toBe(value);
  expect(new URL(page.url()).searchParams.get('q')).toBe('tutoring');
  await page.goto('/');
  const dest = await page.locator('.home-category-grid a').first().getAttribute('href');
  await page.locator('.home-category-grid a').first().click();
  await expect(page).toHaveURL(new RegExp(dest!.replace('?', '\\?')));
  await page.goto('/');
  await page.getByRole('link', { name: 'Explore Businesses', exact: true }).click();
  await expect(page).toHaveURL(/businesses$/);
  await page.goto('/');
  await page.locator('.home-hero-actions').getByRole('link', { name: 'Post an Advert' }).click();
  await expect(page).toHaveURL(/sell$/);
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
  await page.goto('/');
  await expect(
    page.locator('.home-hero-actions').getByRole('link', { name: 'Post an Advert' }),
  ).toHaveAttribute('href', '/post');
  const save = page.locator('.home-listing-card .save-button').first();
  await save.click();
  await expect(save).toHaveAttribute('aria-pressed', 'true');
  await save.click();
});
test('homepage is polished at nine widths in both themes and for all account types', async ({
  page,
}) => {
  mkdirSync('/tmp/medstash-home-review', { recursive: true });
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('ucc-theme'));
    await page.reload();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto('/');
      await page.locator('.home-hero-art img').evaluate((img: HTMLImageElement) => img.decode());
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      for (const selector of [
        '.home-hero h1',
        '.home-hero-actions',
        '.home-search-band',
        '.home-category-grid',
        '.home-listing-grid',
      ]) {
        const box = await page.locator(selector).boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      }
      expect(
        await page
          .locator('.home-listing-grid')
          .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
      ).toBe(width < 700 ? 2 : width <= 1100 ? 3 : 4);
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        result.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')),
      ).toEqual([]);
      if ([390, 768, 1440, 1920].includes(width))
        await page.screenshot({
          path: `/tmp/medstash-home-review/home-${width}-${theme}.png`,
          fullPage: true,
        });
    }
  }
  for (const role of ['stranger', 'owner', 'business', 'admin']) {
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: 'authjs.session-token',
        value: fixture[role + 'Token'],
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    await page.goto('/');
    await expect(page.locator('.home-hero')).toBeVisible();
    await expect(page.locator('.home-latest')).toBeVisible();
  }
});

import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { contentSchema, contactLinks, fingerprint } from '../src/server/validation';
import { normalizeImage } from '../src/server/storage';
const base = {
  title: 'Textbook tutoring service',
  description: 'Science tutoring available near the campus.',
  categoryId: randomUUID(),
  kind: 'service',
  condition: 'not_applicable',
  priceMode: 'fixed',
  pricePesewas: 5000,
  location: 'Campus',
  phone: '0241234567',
  contactConsent: true,
};
it('normalizes Ghana contacts and constructs encoded contact URLs', () => {
  const value = contentSchema.parse({ ...base, whatsapp: '0241234567' });
  expect(value.phone).toBe('+233241234567');
  const links = contactLinks(value, 'https://example.test/adverts/123');
  expect(links.phone).toBe('tel:+233241234567');
  expect(links.whatsapp).toContain('https://wa.me/233241234567?text=');
  expect(links.whatsapp).toContain(encodeURIComponent('https://example.test/adverts/123'));
});
it('rejects invalid contacts, consent, product photos and conflicting prices', () => {
  for (const changes of [
    { phone: '123' },
    { contactConsent: false },
    { kind: 'product' },
    { priceMode: 'contact', pricePesewas: 100 },
    { priceMode: 'free', pricePesewas: 100 },
    { kind: 'wanted' },
    { pricePesewas: 1.5 },
    { unknown: 'field' },
  ])
    expect(contentSchema.safeParse({ ...base, ...changes }).success).toBe(false);
});
it('normalizes duplicate whitespace and capitalization', () => {
  const a = contentSchema.parse(base);
  const b = contentSchema.parse({ ...base, title: base.title.toUpperCase().replaceAll(' ', '  ') });
  expect(fingerprint(a)).toBe(fingerprint(b));
});
it('rejects active/non-image content regardless of claimed MIME', async () => {
  await expect(
    normalizeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')),
  ).rejects.toMatchObject({ code: 'INVALID_IMAGE' });
  await expect(normalizeImage(Buffer.alloc(5242881))).rejects.toMatchObject({
    code: 'IMAGE_TOO_LARGE',
  });
});
it('re-encodes valid images and strips metadata', async () => {
  const png = await sharp({
    create: { width: 128, height: 128, channels: 3, background: '#114455' },
  })
    .png()
    .withMetadata()
    .toBuffer();
  const output = await normalizeImage(png);
  const metadata = await sharp(output).metadata();
  expect(metadata.format).toBe('webp');
  expect(metadata.exif).toBeUndefined();
});

it('validates flyer metadata, requires artwork and rejects unsafe external links', () => {
  const flyer = {
    ...base,
    kind: 'event',
    condition: 'not_applicable',
    priceMode: 'contact',
    pricePesewas: null,
    mediaIds: [randomUUID()],
    details: {
      startsAt: '2030-01-01T10:00:00Z',
      endsAt: '2030-01-01T12:00:00Z',
      externalUrl: 'https://example.org/register',
    },
  };
  expect(contentSchema.safeParse(flyer).success).toBe(true);
  for (const patch of [
    { mediaIds: [] },
    { details: {} },
    { details: { ...flyer.details, endsAt: '2029-12-31T12:00:00Z' } },
    { details: { ...flyer.details, externalUrl: 'javascript:alert(1)' } },
    { details: { ...flyer.details, externalUrl: 'https://user:password@example.org' } },
    { pricePesewas: 1000 },
    { condition: 'new' },
  ])
    expect(contentSchema.safeParse({ ...flyer, ...patch }).success).toBe(false);
  expect(
    contentSchema.safeParse({ ...flyer, kind: 'promotion', details: { offer: 'Student discount' } })
      .success,
  ).toBe(true);
  expect(contentSchema.safeParse({ ...flyer, kind: 'promotion', details: {} }).success).toBe(false);
  expect(
    contentSchema.safeParse({ ...base, details: { externalUrl: 'https://example.org' } }).success,
  ).toBe(false);
});

it('invalid flyer URLs report validation errors rather than throwing URL parser exceptions', () => {
  expect(
    contentSchema.safeParse({
      ...base,
      kind: 'announcement',
      priceMode: 'contact',
      pricePesewas: null,
      mediaIds: [randomUUID()],
      details: { externalUrl: 'not a link' },
    }).success,
  ).toBe(false);
});

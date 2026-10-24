import { contactFields } from '../lib/seller-profile';
import { enquiryMessage } from '../lib/enquiries';
import { z } from 'zod';
import { socialProfile, type SocialPlatform } from '../lib/socials';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { isFlyer, safeExternalUrl } from '../lib/campus';
import { createHash } from 'node:crypto';
export const id = z.uuid();
export const phone = z
  .string()
  .max(32)
  .transform((s, ctx) => {
    const p = parsePhoneNumberFromString(s, 'GH');
    if (!p?.isValid()) {
      ctx.addIssue({ code: 'custom', message: 'Provide a valid phone number' });
      return z.NEVER;
    }
    return p.number;
  });
export const socialUrl = (platform: SocialPlatform) =>
  z
    .string()
    .trim()
    .max(300)
    .transform((value, ctx) => {
      const profile = socialProfile(platform, value);
      if (!profile) {
        ctx.addIssue({ code: 'custom', message: `Use a complete HTTPS ${platform} profile URL` });
        return z.NEVER;
      }
      return profile.url;
    });
export const contentSchema = z
  .object({
    displayName: z.string().trim().min(2).max(100).optional(),
    contactSources: z.array(z.enum(contactFields)).max(8).optional(),
    profileVersion: z.number().int().min(0).optional(),
    title: z.string().trim().min(5).max(120),
    description: z.string().trim().min(20).max(5000),
    categoryId: id,
    kind: z.enum([
      'product',
      'service',
      'wanted',
      'event',
      'promotion',
      'announcement',
      'business_ad',
    ]),
    condition: z.enum(['new', 'used', 'not_applicable']),
    priceMode: z.enum(['fixed', 'negotiable', 'free', 'contact', 'budget']),
    pricePesewas: z.number().int().min(0).max(100000000).nullable(),
    location: z.string().trim().min(2).max(120),
    phone: phone.optional(),
    whatsapp: phone.optional(),
    socials: z
      .object({
        tiktok: socialUrl('tiktok').optional(),
        snapchat: socialUrl('snapchat').optional(),
        instagram: socialUrl('instagram').optional(),
        x: socialUrl('x').optional(),
      })
      .strict()
      .optional(),
    contactConsent: z.literal(true),
    mediaIds: z.array(id).max(5).default([]),
    details: z
      .object({
        startsAt: z.iso.datetime().optional(),
        endsAt: z.iso.datetime().optional(),
        externalUrl: z
          .string()
          .url()
          .max(1000)
          .refine(
            (value) => safeExternalUrl(value) !== null,
            'Use a complete HTTPS link without embedded credentials',
          )
          .optional(),
        offer: z.string().trim().min(5).max(500).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      v.contactSources &&
      (v.profileVersion === undefined || new Set(v.contactSources).size !== v.contactSources.length)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['contactSources'],
        message: 'Profile links need a version and unique fields',
      });
    if (isFlyer(v.kind)) {
      if (!v.mediaIds.length)
        ctx.addIssue({
          code: 'custom',
          path: ['mediaIds'],
          message: 'Flyers require uploaded artwork',
        });
      if (v.priceMode !== 'contact' || v.pricePesewas !== null)
        ctx.addIssue({
          code: 'custom',
          path: ['priceMode'],
          message: 'Flyers do not use a product price',
        });
      if (v.condition !== 'not_applicable')
        ctx.addIssue({
          code: 'custom',
          path: ['condition'],
          message: 'Flyers do not have a product condition',
        });
      if (v.kind === 'event' && !v.details?.startsAt)
        ctx.addIssue({
          code: 'custom',
          path: ['details', 'startsAt'],
          message: 'An event date and time are required',
        });
      if (v.kind === 'promotion' && !v.details?.offer)
        ctx.addIssue({
          code: 'custom',
          path: ['details', 'offer'],
          message: 'Describe the promotional offer',
        });
    } else if (v.details)
      ctx.addIssue({
        code: 'custom',
        path: ['details'],
        message: 'Flyer details apply only to Campus 360 adverts',
      });
    if (
      v.details?.startsAt &&
      v.details.endsAt &&
      Date.parse(v.details.endsAt) <= Date.parse(v.details.startsAt)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['details', 'endsAt'],
        message: 'The end must be after the start',
      });
    if (!v.phone && !v.whatsapp)
      ctx.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'A public phone or WhatsApp contact is required',
      });
    if (new Set(v.mediaIds).size !== v.mediaIds.length)
      ctx.addIssue({ code: 'custom', path: ['mediaIds'], message: 'Duplicate images' });
    if (v.kind === 'product' && v.mediaIds.length === 0)
      ctx.addIssue({ code: 'custom', path: ['mediaIds'], message: 'Products require a photo' });
    if (v.priceMode === 'free' && v.pricePesewas !== 0)
      ctx.addIssue({
        code: 'custom',
        path: ['pricePesewas'],
        message: 'Free adverts must have zero price',
      });
    if (v.priceMode === 'contact' && v.pricePesewas !== null)
      ctx.addIssue({
        code: 'custom',
        path: ['pricePesewas'],
        message: 'Contact-for-price must omit price',
      });
    if (['fixed', 'budget'].includes(v.priceMode) && v.pricePesewas === null)
      ctx.addIssue({
        code: 'custom',
        path: ['pricePesewas'],
        message: 'Price or budget is required',
      });
    if (v.kind === 'wanted' && v.priceMode !== 'budget')
      ctx.addIssue({ code: 'custom', path: ['priceMode'], message: 'Wanted adverts use a budget' });
    if (v.kind !== 'wanted' && v.priceMode === 'budget')
      ctx.addIssue({
        code: 'custom',
        path: ['priceMode'],
        message: 'Budget applies to wanted adverts',
      });
  });
export type Content = z.infer<typeof contentSchema>;
export const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    kind: z.enum(['student', 'business']),
    consent: z.literal(true),
  })
  .strict();
export const settingsSchema = z
  .object({
    maxActive: z.number().int().min(1).max(100),
    dailyLimit: z.number().int().min(1).max(100),
    durationDays: z.number().int().min(1).max(365),
    maxImages: z.number().int().min(1).max(5),
    maxImageBytes: z.number().int().min(1).max(5242880),
    autoPublish: z.boolean(),
    postingLimitsEnabled: z.boolean().default(true),
  })
  .strict();
export function fingerprint(v: Content) {
  return createHash('sha256')
    .update(
      JSON.stringify(
        [v.title, v.description, v.phone ?? '', v.whatsapp ?? '', v.categoryId].map((s) =>
          s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim(),
        ),
      ),
    )
    .digest('hex');
}
export function requestHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
export function contactLinks(v: Content, url: string, category?: string) {
  return {
    phone: v.phone ? `tel:${v.phone}` : null,
    whatsapp: v.whatsapp
      ? `https://wa.me/${v.whatsapp.slice(1)}?text=${encodeURIComponent(enquiryMessage(v.kind, v.title, url, category))}`
      : null,
  };
}

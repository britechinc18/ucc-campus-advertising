import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from './db';
import { actor, advertiser, audit, one, query } from './store';
import { ensure } from './errors';
import { defaultsSchema, applyPrivacy, checkProfileImage } from './profiles';
import { id, phone, socialUrl } from './validation';
import { profileComplete } from '../lib/seller-profile';
import { profileSocialPlatforms, type SocialPlatform } from '../lib/socials';

const fields = [
  'name',
  'phone',
  'whatsapp',
  'location',
  'bio',
  'description',
  'photoMediaId',
  'logoMediaId',
  'slug',
  'categoryId',
  ...profileSocialPlatforms.map((p) => `social.${p}`),
  ...profileSocialPlatforms.map((p) => `visible.${p}`),
  'visible.photo',
];
const detailsSchema = defaultsSchema.extend({
  version: z.number().int().min(0).optional(),
  description: z.string().trim().max(2000).optional(),
  logoMediaId: id.optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]{3,60}$/)
    .optional(),
  categoryId: id.optional(),
});
export async function patchProfileField(userId: string, input: unknown, sellerId?: string) {
  const inputData = z
    .object({
      kind: z.enum(['student', 'business']),
      version: z.number().int().min(0),
      field: z.string().refine((f) => fields.includes(f), 'Choose an editable profile field'),
      value: z.unknown(),
      contactConsent: z.boolean().optional(),
    })
    .strict()
    .parse(input);
  return db().transaction(async (tx) => {
    const user = await actor(tx, userId, !!sellerId);
    const target =
      sellerId ??
      (
        await one<{ id: string }>(
          tx,
          sql`select id from advertisers where user_id=${userId} and kind=${inputData.kind} and closed_at is null`,
        )
      ).id;
    const identity = await advertiser(tx, user, target);
    ensure(identity.kind === inputData.kind, 422, 'PROFILE_KIND', 'Choose the matching profile');
    const owner = await one<{
      name: string;
      defaults_version: number;
      draft_defaults: unknown;
      approved_defaults: unknown;
    }>(tx, sql`select * from advertisers where id=${target} for update`);
    ensure(
      owner.defaults_version === inputData.version,
      409,
      'PROFILE_CHANGED',
      'This profile changed. Reload before saving',
    );
    const business =
      inputData.kind === 'business'
        ? (
            await query<{ slug: string; state: string; pending: unknown; approved: unknown }>(
              tx,
              sql`select * from business_profiles where advertiser_id=${target} for update`,
            )
          )[0]
        : undefined;
    ensure(business?.state !== 'suspended', 409, 'SUSPENDED', 'Business profile suspended');
    const data = detailsSchema.parse(
      owner.draft_defaults ??
        business?.pending ??
        business?.approved ??
        owner.approved_defaults ?? { name: owner.name },
    );
    const { field, value } = inputData;
    if (field.startsWith('social.')) {
      const platform = field.slice(7) as SocialPlatform;
      const next = { ...data.socials };
      if (value === '' || value === null) delete next[platform];
      else next[platform] = socialUrl(platform).parse(value);
      data.socials = next;
    } else if (field.startsWith('visible.')) {
      const key = field.slice(8) as keyof NonNullable<typeof data.visibility>;
      data.visibility = { ...data.visibility, [key]: z.boolean().parse(value) };
    } else if (field === 'phone' || field === 'whatsapp') data[field] = phone.parse(value);
    else if (field === 'name') data.name = z.string().trim().min(2).max(100).parse(value);
    else if (field === 'location') data.location = z.string().trim().min(2).max(120).parse(value);
    else if (field === 'bio') {
      ensure(inputData.kind === 'student', 422, 'PROFILE_KIND', 'Bio belongs to personal profiles');
      data.bio = z.string().trim().max(500).parse(value);
    } else if (field === 'description') {
      ensure(
        inputData.kind === 'business',
        422,
        'PROFILE_KIND',
        'Description belongs to business profiles',
      );
      data.description = z.string().trim().max(2000).parse(value);
    } else if (field === 'slug') {
      ensure(
        inputData.kind === 'business' && !business,
        409,
        'SLUG_IMMUTABLE',
        'Keep the existing business URL',
      );
      data.slug = z
        .string()
        .regex(/^[a-z0-9-]{3,60}$/)
        .parse(value);
    } else if (field === 'categoryId') {
      ensure(
        inputData.kind === 'business',
        422,
        'PROFILE_KIND',
        'Categories belong to business profiles',
      );
      data.categoryId = value ? id.parse(value) : undefined;
      if (data.categoryId)
        await one(tx, sql`select id from categories where id=${data.categoryId} and active`);
    } else {
      ensure(
        field === (inputData.kind === 'business' ? 'logoMediaId' : 'photoMediaId'),
        422,
        'PROFILE_KIND',
        'Choose the matching profile image',
      );
      const media = value ? id.parse(value) : undefined;
      await checkProfileImage(tx, target, media);
      if (field === 'logoMediaId') data.logoMediaId = media;
      else data.photoMediaId = media;
    }
    if (inputData.contactConsent === true) data.contactConsent = true;
    if ((field === 'phone' || field === 'whatsapp' || field.startsWith('social.')) && value)
      ensure(
        data.contactConsent,
        422,
        'CONSENT_REQUIRED',
        'Confirm that this contact can appear publicly',
      );
    data.visibility = { ...data.visibility, phone: true, whatsapp: true };
    const complete = profileComplete(data);
    if (inputData.kind === 'business' && complete) {
      data.defaultsEnabled = true;
      data.description ??= '';
      data.slug = business?.slug ?? data.slug ?? `business-${target}`;
    }
    await applyPrivacy(tx, target, data.visibility);
    await tx.execute(
      sql`update advertisers set draft_defaults=${JSON.stringify(data)}::jsonb,defaults_version=defaults_version+1,name=${data.name ?? owner.name},privacy=${JSON.stringify(data.visibility)}::jsonb,approved_defaults=case when ${complete && inputData.kind === 'student'} then ${JSON.stringify(data)}::jsonb else approved_defaults end,approved_defaults_version=case when ${complete} then defaults_version+1 else approved_defaults_version end,profile_state=${complete ? 'approved' : 'incomplete'},profile_reason=null,automatic_personal=false where id=${target}`,
    );
    if (inputData.kind === 'business' && complete)
      await tx.execute(
        sql`insert into business_profiles(advertiser_id,slug,approved,state) values(${target},${data.slug!},${JSON.stringify(data)}::jsonb,'approved') on conflict(advertiser_id) do update set approved=excluded.approved,pending=null,state='approved',reason=null`,
      );
    await audit(tx, userId, 'profile_field_saved', target, {
      field,
      version: inputData.version + 1,
    });
    return { data, version: inputData.version + 1, complete };
  });
}

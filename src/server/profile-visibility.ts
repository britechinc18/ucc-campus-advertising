import { sql } from 'drizzle-orm';
// These fragments use the same fixed a/r/p aliases as the existing public visibility rules.
export const approvedDefaults = sql`case when p.kind='business' then (select b.approved from business_profiles b where b.advertiser_id=p.id and b.state<>'suspended') else p.approved_defaults end`;
export const effectiveContent = sql`medstash_effective_content(r.data,${approvedDefaults},p.approved_defaults_version,p.privacy)`;
export const activeIdentity = sql`p.closed_at is null and p.deactivated_at is null`;

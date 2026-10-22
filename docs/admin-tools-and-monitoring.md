# Admin tools, account modes and system usage

## Administrator posting

An active, server-verified administrator can submit unlimited new/renewed adverts in their own profile or on behalf of another advertiser. Administrator submissions do not consume the advertiser's daily allowance and bypass the active reservation ceiling. Image upload daily/count limits and account write throttles also exempt administrators. Per-advert image count/size validation, suspension checks, contact consent, duplicate detection, moderation and normal expiry remain in force.

The server records `postingLimitExempt` in the immutable submission audit event. Approval bypasses the active ceiling only for that exact administrator-submitted revision. Approving an ordinary submission does not waive its quota. Users cannot request this exemption through form fields or a buyer/seller preference. Ordinary advertiser limits and settings are unchanged; no schema migration is needed.

Use **Administration → Post for someone** (`/admin/post`): select an advertiser by name or create an assisted profile after obtaining consent. An assisted advertiser need not have a Google account. The existing posting form collects their advert details and their public phone/WhatsApp contacts. Submissions appear in the existing moderation queue. My Adverts continues to manage the signed-in advertiser's own listings; assisted listings remain manageable through All adverts and Advertisers in the admin console.

## Buyer/seller menus

Activated sellers can switch between buyer and seller navigation from the menu without signing out, reactivating or losing listings. The preference is an HttpOnly, SameSite cookie bound to the current user ID; another account does not inherit it. It changes presentation only. OAuth, permissions and listing ownership are unchanged. Seller activation enters seller mode; existing seller onboarding can resume safely.

Appearance retains the existing light/dark toggle. The separate “Use system theme” menu action is removed. Devices without an explicit theme choice still use the existing initial OS preference.

## System check

`/admin/system` and `GET /api/v1/admin/system` are admin-only. Every request rechecks the database role, even on a cache hit. Responses are private/no-store and never contain credentials, connection strings, object keys, other projects' billing rows or raw provider payloads.

Measurements:

- Database size: `pg_database_size(current_database())`.
- Application table/index bytes: `pg_total_relation_size` over user tables.
- Image bucket: read-only S3-compatible object listing using existing storage credentials. It includes derived images, staging and leftovers; listing is capped at 10,000 objects and eight seconds. Partial totals are explicitly lower bounds. If listing permission/network access fails, only tracked ready-image bytes are shown, labelled as not a billing total.
- Neon: optional authenticated project API supplies delayed network-transfer/compute counters and configured technical ceilings. These are not invoice-aligned billing metrics or free-plan allowances. Deprecated zero-valued synthetic storage counters are not used.
- Vercel: optional authenticated FOCUS billing API returns calendar-month-to-date service quantities and project-attributed charges. Filter strictly on `Tags.ProjectId` for this MedStash project; unrelated project data and unallocated team purchases are excluded. Empty results mean no attributed records, not zero usage. This is not a final invoice.

Successful reports are cached for five minutes per application instance, with concurrent collection deduplicated. Provider requests have bounded response sizes and timeouts. No polling, purchases, plan changes, credential creation or infrastructure writes are performed.

## Optional provider connection

Existing database and object-storage checks work without additional tokens. Full provider monitoring needs these **server-only** variables in the Vercel environment used by the live deployment:

- `NEON_MONITORING_API_KEY`: access to the existing MedStash Neon project `summer-snow-64005723` and its project counters. Use the narrowest read access the provider supports.
- `VERCEL_MONITORING_TOKEN`: Vercel team access that can read billing usage for `team_aq3Rv1q9fHrazQLARIYa7ZPu`. The implementation exposes only project `prj_blRh2DqpaBlRwoo544VNzOFsdDnQ` (MedStash).

Never use `NEXT_PUBLIC_`, commit populated env files, paste tokens in chat, or expose tokens in a browser form. ChatGPT connector authentication is separate from credentials that the deployed website can use. Missing or denied access is explicitly shown as Not connected/Unavailable. Do not upgrade plans merely to enable metrics without the owner's approval.

Plan-specific allowances, invoice adjustments, team-wide subscriptions and free credits may not be returned by these endpoints and are not guessed. The admin page explains this limitation. Provider counters can lag; check the provider's billing dashboard for authoritative invoices and plan allowances.

Sources verified 22 October 2026:

- [Neon project API](https://api-docs.neon.tech/reference/getproject)
- [Neon consumption metrics](https://api-docs.neon.tech/reference/getconsumptionhistoryperprojectv2)
- [Vercel FOCUS billing API](https://vercel.com/docs/rest-api/billing/list-focus-billing-charges)

## Validation

Tests cover admin-owned and assisted exemption beyond configured limits, ordinary seller enforcement, submission idempotency, audit provenance, monitoring authorization, same-origin mode switching, unknown metrics, malformed provider data and project-level billing isolation. Browser journeys cover mode persistence, retained sign-in, assisted advertiser creation → submission → approval → contact, responsive admin screens and accessibility in both themes.

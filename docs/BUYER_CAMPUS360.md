# Buyer experience, Campus 360 and seller activation

## Delivery

Feature branch `feat/buyer-campus360`, based on merged `main`. This enhances the current MedStash application; the live deployment and MedNexus are unchanged. Deliver as an unmerged PR and access-protected Vercel Preview only.

## Buyer and seller surfaces

- Anonymous visitors get Home / Market / Campus 360 / Saved. Mobile/tablet navigation is a floating frosted pill with a restrained inset active destination. Desktop adds a shared search and Start Selling action.
- Seller tools are derived server-side from the existing, unsuspended advertiser profile, not a local role flag. Existing accounts retain identity, ownership, listings and permissions. Seller navigation is Home / Market / Post / Campus 360 / My Ads with conventional flat mobile navigation. Saved remains accessible from the account menu.
- `/sell` explains the workflow and routes through the existing Google OAuth and `/onboarding`. Profile creation is idempotent under the existing user-row lock; repeated/concurrent activation returns the existing profile without changing its name/type. Seller contact consent stays explicit on each advert; no duplicate identity provider or contact database was introduced.
- Existing Market URL `/explore` remains compatible. It shows only product/service/wanted content by default. Buyers can still reach accommodation through the existing category filter and the business directory through Campus 360.

## Campus 360

- `/campus-360` is a visual discovery hub with original square artwork for Events, Promotions, Announcements and Businesses. Four columns on wide screens and two on phones/intermediate tablets. These are logical type-driven categories, not hardcoded advert records.
- `/campus-360/[category]` fetches current approved content with bounded search and cursor pagination; invalid categories return 404. Galleries preserve supplied artwork proportions and do not impose product prices.
- Existing `/adverts/[id]` pages render flyer artwork, description, advertiser, dates in Ghana time, offers, and optional registration/external links alongside the established contact/report/share actions. Missing/expired/unpublished content remains unavailable. Only validated HTTPS external links without embedded credentials are rendered; links open with noopener/noreferrer.
- Homepage includes a real Campus 360 feed or an honest invitation when no approved flyers exist. New category art is interface artwork, not simulated events or business activity.
- Dedicated Campus 360 loading and empty/error states are included.

## Data model and APIs

**No DDL, new tables, new database columns, migrations or production data edits.** Existing revision JSON is extended compatibly:

- `kind`: existing `product | service | wanted`, plus `event | promotion | announcement | business_ad`.
- Optional strict `details`: `startsAt`, `endsAt` (ISO UTC timestamps), `offer` and `externalUrl`.
- Flyers require uploaded artwork, `condition: not_applicable`, `priceMode: contact`, and a null price. Event start and promotional offer are required for their respective forms. Form input dates are explicitly Ghana time (UTC); end must follow start when both are supplied.
- The legacy category foreign key remains intact for all revisions. Flyer forms use the active Services category as their compatible legacy category association, while Campus 360 navigation/filtering is canonical by flyer kind. No live category records are modified.
- `GET /api/v1/adverts` adds `surface=market|campus|all` (default market) and the new kind filters. Home market feeds/featured placements exclude flyer kinds.
- Public visibility also respects flyer `details.endsAt`; expired validity hides the advert and its media as well as search results.
- `GET /api/v1/saved?ids=...` anonymously resolves at most 40 UUIDs to current public details and an unavailable-ID list. It never exposes draft/pending or expired content and deduplicates IDs.
- All creation/edit/submission still uses existing authenticated APIs, ownership checks, upload validation/normalization, active/daily limits, idempotency, duplicate detection and admin-only moderation. No auto-publishing or limit exemption was added.
- Admin console layout/design is unchanged. A small read-only extension to the existing review summary displays the new metadata so moderators can inspect it before approval.

## Anonymous Saved

Only up to 40 unique advert UUIDs are kept under `medstash:saved:v1` in local storage. Nothing is uploaded as an account bookmark list and no seller contacts are persisted locally. Hearts support save/unsave, reload persistence and same-device tab updates. The Saved page explains that bookmarks do not automatically sync between devices. Corrupt/invalid storage is ignored; blocked/full storage produces feedback. Unavailable adverts can be removed without exposing their former private content. Visitors may explicitly clear bookmarks.

## Actual verification

- 51 unit/PostgreSQL tests passed on isolated local `ucc_frontend_test`, including four flyer lifecycle cases with real image normalization and injected test object storage, server-only moderation/ownership, Campus/Market separation, expiry/media privacy, bookmark visibility, metadata/link validation and concurrent/idempotent activation.
- 10 Playwright suites passed on isolated local `ucc_frontend_browser_test`: existing search/contact/report/approval/management/business flows; buyer navigation; all four Campus categories and details; anonymous save/unsave/reload; Google handoff UI; seller tools; real draft APIs for all seven advert kinds and an event submission; public/admin and new-buyer responsive/accessibility scans; square banners and reduced motion.
- For the seven-kind browser form test, upload HTTP responses are intercepted against owner-owned ready local media fixtures. This validates the UI plus real draft/submission APIs; it is not a claim of seven real hosted storage uploads. Real normalization/ownership/media-privacy paths are exercised by the database tests. No browser fixtures were uploaded to Neon.
- Public/new buyer layouts checked at 320/390/768/1024/1440px in light/dark themes. Existing admin screens checked at 320/768/1440px. No horizontal overflow or serious/critical WCAG A/AA violations on scanned screens. This is automated coverage, not full accessibility certification.
- TypeScript, ESLint, formatting and optimized Next.js build passed. A promotion-description test selector was made precise; long mobile announcement text and a tablet navigation gap were corrected during review.

## Preview boundary and remaining integration

The protected preview uses the existing configured Preview database/storage environment for real approved reads, without changing live records or settings. There is no schema difference to migrate. Vercel protection must remain enabled and the public alias must not be reassigned.

Existing Google OAuth callback, `APP_ORIGIN`, `AUTH_URL` and storage CORS remain bound to `https://ucc-campus-advertising.vercel.app`. A separate protected deployment cannot complete all authenticated write/upload journeys under that origin without isolated preview-origin/OAuth configuration. Google login may return to the public site; origin protections must not be weakened to work around this. The new account and posting journeys are tested locally with synthetic database sessions; fresh real Google login and provider-backed Campus flyer uploads on the separate preview remain unverified. Live OAuth, existing admin account, permissions and storage configuration were preserved.

Before release, review the PR and decide whether to authorize isolated preview OAuth/origin configuration for hosted end-to-end testing. Production deployment and merge require approval. No new paid services were added.

## Seller workspace follow-up and configuration attempt

- My Adverts now offers seven format shortcuts into validated `/post?kind=...` defaults. Invalid kinds fall back to products; existing edit data takes precedence. Seller flyer management shows dates, offer and safe external links, preserves artwork proportions, and uses Completed rather than Sold.
- Stable protected review alias: `https://medstash-campus360-preview.vercel.app`. The original public alias is unchanged.
- Created an isolated Neon child branch `campus360-preview-pr15` (`br-snowy-forest-b950qf5b`) for future authenticated preview testing. It is not currently connected to Vercel; no live records were changed. Default account compute settings were used because custom suspend-time settings were rejected by the account. Remove this branch after PR review when authorized.
- Preview configuration remains blocked: Google Console returned **You cannot modify this client** for the saved account attempting to add the preview origin/callback. Neither addition was saved. The client owner must add the stable preview origin and `/api/auth/callback/google` redirect.
- Vercel rejected every branch-scoped environment request with **Project medstash does not have a connected Git repository**. Shared settings were not overwritten. Git integration must be connected before branch overrides can be applied safely, or an isolated preview project must be configured.
- Inherited storage is listed by Neon, but the attempted CORS configuration stopped with NoSuchBucket before writing a rule. Preview uploads remain unconfigured; the live bucket CORS was not changed.
- The earlier PR commit passed both GitHub verification and browser CI. Follow-up checks are recorded in the PR.

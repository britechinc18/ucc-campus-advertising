# Phase 3 — frontend implementation blueprint

Status: visual-review artifacts prepared; production frontend implementation awaits the agreed visual review. Primary visual reference: owner's _Campus Market Complete Design System V2_. Review source and handoff: [design/README.md](design/README.md).

## Product and design invariants

- **UCC Med Market**, a marketplace for the UCC medical-student community. Campus utility leads; avoid a clinical aesthetic.
- Public browsing requires no account. Contacts use advertiser-consented WhatsApp or phone links. No checkout, payment, cart or in-app messaging.
- Mobile-first, both light and dark themes. Match the reference's quiet typography, compact search, photography, teal accent and restrained borders. No gratuitous gradients or animation.
- All posted content requires administrator approval. Real data and status labels only; no sample records, simulated provider success, fake engagement or sales analytics in deployed pages.
- Preserve original backend contracts and authorization. New reads and business-profile fields below are additive, reviewed changes with authorization tests.
- Keep MedNexus untouched. Never expose credentials in browser bundles, logs, screenshots or PRs.

## Routes and behavior

| Route                                           | Screen and required behavior                                                                                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                             | Compact search/category hero, Fresh Finds, Featured, Deals Under GH₵100, Trending; omit empty optional feeds; identify backend trending fallback honestly |
| `/explore`                                      | Search and URL-backed category/kind/condition/location/min/max/sort filters; cursor pagination; mobile filter sheet; desktop sidebar                      |
| `/adverts/[id]`                                 | Accessible gallery, description, seller context, contact links, share/copy fallback, report form, related results, safe-trading note                      |
| `/businesses`                                   | Approved business directory with name/description search performed over the bounded directory response initially                                          |
| `/businesses/[slug]`                            | Approved logo/initials, description, location, contact actions and adverts filtered by advertiser UUID                                                    |
| `/sign-in`                                      | Google sign-in, safe internal return target, unavailable state when OAuth is not configured                                                               |
| `/onboarding`                                   | Name, student/business selection, consent; create profile only once                                                                                       |
| `/post`                                         | Three steps: Details → Photos & contact → Review & submit                                                                                                 |
| `/my-adverts`                                   | Paginated owner adverts, real status counts, allowance, rejection reasons and supported lifecycle actions                                                 |
| `/my-adverts/[id]`                              | Owner detail/revisions; edit a draft or prepare reviewed changes; renew inactive adverts; explicit pending-edit versus live content                       |
| `/my-business`                                  | Read and submit moderated business profile, logo/contact consent, approved/pending comparison and rejection reason                                        |
| `/admin`                                        | Actual operational counts, queue links, recent audit entries and current publishing settings                                                              |
| `/admin/submissions`, `/admin/submissions/[id]` | Pending queue and full revision review, media, advisory duplicate flags, advertiser history, reasoned approve/reject                                      |
| `/admin/adverts`, `/admin/adverts/[id]`         | Search/filter all statuses, approved/pending revisions, suspend, feature/unfeature via supported scheduling, assisted posting                             |
| `/admin/reports`                                | Open/resolved/dismissed reports, related advert evidence, reasoned resolution                                                                             |
| `/admin/advertisers`, `/admin/advertisers/[id]` | Search/list/history, create assisted advertiser, suspend/restore advertiser, verified manual claim to an existing account                                 |
| `/admin/businesses`                             | Review approved/pending business profiles; approve/reject/suspend with reason                                                                             |
| `/admin/categories`                             | Active and inactive category list, create/edit/deactivate; existing slugs immutable                                                                       |
| `/admin/settings`                               | Version-checked posting limits, duration, image limits; approval remains required; conflicts require refreshing current values                            |
| `/admin/audit`                                  | Bounded audit list with pagination and readable action context                                                                                            |

Phone grids remain two columns at 320px. Tablet uses two or three columns; public grids use three at 600–1023px, four on desktop homepages and three alongside Explore filters. Desktop begins at 1024px. Header/footer and all fixed actions respect safe-area insets. On ad detail, fixed contact actions replace bottom navigation. Returning to browsing restores filters and position.

## Shared components and state

- Theme tokens, typography, icon set, buttons/links, form fields/errors, badges, empty/error/loading states, dialogs/sheets, pagination, listing cards, gallery, upload manager and responsive list/table patterns. Use system sans-serif with no remote font requests.
- Theme initializes from OS, then uses a stored override. Apply theme before painting; provide accessible focus and contrast in both themes. Respect reduced-motion preferences.
- Server-render public first-page data through shared authorized service functions; client interactions use typed existing API contracts. Never make public browsing depend on an authenticated session. Use `isAuthenticationConfigured()` before accessing Auth.js.
- Server-only role/profile context drives navigation; server authorization protects every page/action independently. Do not trust a hidden button or client-supplied role. Suspended accounts get an actionable restricted state.
- Search submit changes URL parameters; filters apply as a single sheet action on phones. Reset clears filters. Keep selected filters visible and results count truthful; if total is unavailable, show loaded-result count instead of a fabricated total. Cursor links maintain filters; query changes reset cursors.
- Format integer pesewas as Ghana cedis. Parse decimal input without floating-point rounding errors. Preserve null/contact, zero/free, negotiable, and wanted/budget distinctions. Validate against backend schemas and map field errors safely.
- Gallery uses approved media, fixed aspect ratios, responsive sizes and lazy loading below the fold. Handle unavailable images without a broken-image icon. Enlarged gallery traps/restores focus and supports Escape and keyboard navigation.
- Share uses Web Share when available, clipboard otherwise, with a selectable URL fallback. Reports expose only backend-supported reasons. Prevent repeat clicks and distinguish retryable errors, validation failures and rate limits. Contact events are best-effort and must not delay or prevent the link action.
- Do not add server-side favourites, public ratings, seller verification claims, bulk moderation, permanent advert deletion or advert restoration until APIs explicitly support them.

## Posting and advertiser lifecycle

- Step 1: product/service/wanted, title, category, description, appropriate condition, price mode/amount and location. Wanted uses budget; service condition may be not applicable.
- Step 2: up to configured image limit (hard maximum five), per-image status/retry/remove/reorder, cover first, signed upload then completion. Products require at least one completed image. Ghana phone/WhatsApp normalization, at least one channel, explicit contact consent.
- Step 3: complete content preview, editable step links, current allowance, review/30-day notice, submit. Save validated draft then submit its revision UUID with a stable idempotency key. On lost response retry the same key/revision; on changed revision generate a new key.
- Keep incomplete text locally in `sessionStorage` only, never claim server autosave before validation. Clear on success/sign-out. File objects do not survive reload; retain only completed media references for the same account and ask for reselection of unfinished files. Reconcile local state against current server revision and ownership before reuse.
- Published edits retain the approved version until moderation and retain original expiry. Under-review submissions cannot be edited directly; expose withdraw/wait. Draft saves reserve no quota. New pending/renewal submissions reserve active slots. Edits/rejected corrections do not consume another daily allowance.
- Show published, pending, draft, rejected, expired, withdrawn, suspended and fulfilled states. Map fulfilled to Sold/Completed/Found by kind. Treat timestamp-expired published adverts as expired even before housekeeping.
- Show current five-active/three-daily defaults from server settings, using the Africa/Accra calendar day; handle concurrent submissions and settings changes from authoritative API errors.

## Minimum backend additions

Implement these before wiring affected screens, with shared validation and authorization. Exact response types derive from the existing revision/profile models; avoid parallel client-side business rules.

| Addition                                       | Minimum purpose and behavior                                                                                                                                                                                      |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extend `GET /me/profile`                       | Return active/reserved count, remaining daily allowance and server-derived current role; expose no private administrator data                                                                                     |
| Extend `GET /me/adverts`                       | Optional bounded cursor/status query and actual per-status counts; preserve the current response shape for callers without pagination parameters                                                                  |
| `GET /me/adverts/:id`                          | Owner/admin-authorized full detail and revision history; same non-disclosure behavior as other private reads                                                                                                      |
| `GET /me/business`                             | Own approved/pending business profile, moderation state and rejection context                                                                                                                                     |
| Extend business profile contract               | Optional completed owned `logoMediaId`, phone/WhatsApp and explicit contact consent; return approved fields publicly only; incorporate logo references into visibility and orphan cleanup; no raw bucket exposure |
| `GET /admin/overview`                          | Active unexpired advert count, pending submissions, open reports, new advertisers in current Accra week and bounded recent audit data                                                                             |
| `GET /admin/adverts`, `GET /admin/adverts/:id` | Authorized bounded search/status/category/advertiser reads and complete moderation detail; reuse publication/revision representations                                                                             |
| `GET /admin/advertisers/:id`                   | Authorized profile, relevant adverts, moderation history and claim eligibility; no arbitrary identity lookup endpoint                                                                                             |
| `GET /admin/categories`                        | Authorized list including inactive categories                                                                                                                                                                     |

Use additive migrations only if media references require them. Preserve historical moderation evidence. Approval still validates the complete content and configured settings. All administrator counts/read endpoints must reject non-administrators and suspended users.

## Verification and rollout

1. Review mobile/desktop mockups, including representative dark screens, before production UI coding.
2. Build shared foundation/public marketplace, advertiser flows, admin flows and integration hardening in small branches/PRs based on the latest backend-containing branch. Keep generated previews isolated from public production data.
3. Unit-test money parsing/formatting, status presentation and API error mapping. Add database/HTTP tests for additive reads, counts, role separation, business logo visibility and cleanup protection.
4. Browser-test submission → approval → public visibility → search → contact; rejected edits must retain current public content; test renewal, expiry, quota, duplicate and retry behavior. Fixtures stay in disposable test databases, never deployed seeds.
5. Check phone/tablet/desktop layouts at 320, 390, 768, 1024 and 1440px, both themes, short/long content, image failures, loading/empty/error states, safe areas and reduced motion. Review screenshots alongside the PDF reference.
6. Check keyboard/focus order, modal focus restoration, accessible names/errors, screen-reader announcements, target sizes and WCAG AA contrast. Combine automated checks with manual review; do not equate a passing scan with full accessibility compliance.
7. Run formatting, lint, typecheck, build and meaningful tests. Record commands, real outcomes, skipped tests and provider blockers in each PR. Auth/storage integration remains unverified until configured and exercised with real providers.

Current hosted readiness: Google OAuth and image storage are not configured. Production interfaces show “Sign-in temporarily unavailable” / actionable upload unavailability, never backend configuration details or mock success. No paid services or production deployment are part of this visual-review checkpoint.

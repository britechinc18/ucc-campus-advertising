# Phase 2 backend

> **Phase 3 update:** Additive account/owner/admin reads, owner pagination, report-status/advertiser search and moderated business logo/contact fields are implemented. Existing route shapes remain supported; see [PHASE_3_STATUS.md](PHASE_3_STATUS.md) and `src/server/frontend.ts` for the additions.

The owner approved recommended Phase 1 defaults on 2026-10-21. This phase supplies a backend and a minimal framework placeholder page. The public website and dashboards remain Phase 3; end-to-end frontend integration remains Phase 4. A subsequent owner-authorized delivery published GitHub branches and deployed the isolated Neon/Vercel backend preview; see HOSTED_PREVIEW.md. Google OAuth and image storage remain unconfigured, and no paid-plan upgrade was enabled.

## Local setup

Use Node.js 22 or newer and PostgreSQL 17 (compatible with Neon). Run `npm ci`, copy `.env.example` to a local `.env.local`, and populate server-only values. Next.js reads `.env.local`; CLI scripts intentionally use exported environment variables, or Node/tsx's `--env-file` option. Do not paste secrets into commands saved in Git or share populated files.

`DATABASE_URL` is the pooled runtime URL. `MIGRATION_DATABASE_URL` is a separate operator/migration URL. Runtime uses `pg` + Drizzle with interactive transactions; Neon is PostgreSQL-compatible and its connection string must retain TLS settings. The HTTP-only Neon driver is deliberately avoided because quota operations require locks and transactions.

Run `npm run check:config` to validate the required application configuration without printing values. Run `npm run db:migrate` with the migration variable supplied. Migrations seed the singleton settings row and provisional categories. Generated migrations and additional reviewed SQL include an approved-revision ownership foreign key, full-text search GIN index and initial data. These SQL additions must be preserved when reviewing future generated migrations; Drizzle snapshots do not represent custom indexes/constraints. Never use `drizzle-kit push` against a shared database. Run `npm run dev` to start the placeholder and APIs.

## Authentication and administrators

Create Google OAuth web credentials externally. Authorized callback: `<APP_ORIGIN>/api/auth/callback/google`; configure approved local/preview origins deliberately. Supply `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, a cryptographically random `AUTH_SECRET` of at least 32 characters, `AUTH_URL` and `APP_ORIGIN`. Only Google profiles with `email_verified === true` may sign in; successful verified sign-in records email verification. Sessions are stored in PostgreSQL. Roles are read fresh from PostgreSQL on every protected operation; suspended users cannot use the APIs. UI login and account-management screens are Phase 3.

After the designated owner signs in, an operator with database credentials identifies their UUID privately and runs `npm run admin:grant -- <user-uuid> --confirm`. The script requires an active verified account and records an audit event. No bootstrap password or public role-assignment endpoint exists. Use identity-provider MFA for administrators. Google OAuth itself is not live-verified in this environment.

Self-service advertisers create `/me/profile` once with `name`, `kind: student|business` and `consent: true`. Admin-created advertisers start unclaimed. An administrator can claim one for an existing verified user using `/admin/advertisers/:id/claim`, supplying `userId`, `contactVerified: true`, `consent: true` and an `evidenceReference`. This records an administrator's **manual** contact verification; the service does not perform SMS/phone verification. Do not claim on the basis of email matching alone. Existing advertiser profiles cannot be silently merged.

## Rules implemented

- Five active/reserved adverts and three accepted new submissions per Ghana calendar day by default; configurable maximums with version-checked admin settings.
- Pending new adverts/renewals reserve slots. Drafts do not. Edits and rejected corrections do not use another daily allowance, but they are rate-limited. Withdrawals do not refund daily usage.
- Published content remains unchanged during edit review. Submissions are immutable; editing a draft creates a replacement revision. Rejecting an edit leaves approved content public.
- Publication starts a 30-day duration; edits retain it. Renewing an inactive advert requires a new review and daily charge, except corrections to that renewal. Stale edit approvals cannot republish expired adverts.
- All posts, including assisted posts, require approval. Trusted auto-publishing is disabled by schema and input validation; no silent quota override endpoint is provided.
- Same-advertiser normalized text/contact or image-checksum duplicates are blocked. Cross-advertiser exact text matches appear as advisory moderation flags. This is basic detection, not semantic or exhaustive spam detection.
- Owner, role and suspension checks apply within transactions. Advertiser-row locks serialize quota changes, and explicit UUID idempotency keys prevent submission retries from double counting. Current settings are rechecked at approval.
- Public advert/detail/home/media queries use approved unexpired content. No-store responses prevent shared caches retaining removed adverts. Background housekeeping is not required for expiry correctness.

## API conventions

Prefix: `/api/v1`. JSON writes require `Content-Type: application/json`, a maximum 32KB body and `Origin` exactly matching `APP_ORIGIN`. Auth.js handles its own OAuth/session routes. Authenticated calls use secure session cookies managed by Auth.js. Error envelopes have `code`, safe `message`, `requestId` and validation field details when appropriate. Internal SQL, parameters and credentials are never returned or logged. Rate-limit responses include retry guidance.

| Method and path                                        | Payload or behavior                                                                                                   |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| GET /categories, /home                                 | Public category list and discovery sections                                                                           |
| GET /adverts                                           | `q`, category UUID, kind, condition, location, business advertiser UUID, min/max integer pesewas, sort, limit, cursor |
| GET /adverts/:id                                       | Approved detail and encoded phone/WhatsApp links                                                                      |
| GET /media/:id                                         | Approved public WebP, or authorized owner/admin preview; always no-store                                              |
| GET /businesses, /businesses/:slug                     | Approved directory data; pending edits never replace approved text                                                    |
| POST /adverts/:id/reports                              | reason: spam/duplicate/fraud/prohibited/other; optional detail                                                        |
| POST /adverts/:id/events                               | type: view/contact; approximate aggregate engagement only                                                             |
| GET /me/profile                                        | Own profile, current settings and today's submission usage                                                            |
| POST /me/profile                                       | name, kind, consent                                                                                                   |
| GET /me/adverts                                        | Up to 100 own adverts with revision history; dashboard pagination beyond this is not implemented                      |
| POST /me/adverts                                       | Validated content; creates draft and revision UUIDs                                                                   |
| PATCH /me/adverts/:id                                  | Full replacement content for an editable draft/new revision                                                           |
| POST /me/adverts/:id/submit                            | revisionId; required `Idempotency-Key` UUID header                                                                    |
| POST /me/adverts/:id/renew                             | Full content for inactive advert renewal draft; submit separately                                                     |
| POST /me/adverts/:id/withdraw, /fulfill                | Withdraw or mark fulfilled, cancel outstanding review                                                                 |
| POST /uploads/sign                                     | contentType, bytes; optional advertiserId for admins                                                                  |
| POST /uploads/complete                                 | mediaId; validates and re-encodes staged image                                                                        |
| POST /me/business                                      | slug, description, location; queues profile revision                                                                  |
| GET /admin/submissions, /reports, /advertisers, /audit | Bounded admin queues, optional offset                                                                                 |
| GET /admin/settings, /businesses                       | Settings or pending business profiles                                                                                 |
| POST /admin/advertisers                                | name, kind, consent; creates unclaimed seller                                                                         |
| POST /admin/adverts                                    | advertiserId, content; submit through the same lifecycle routes                                                       |
| POST /admin/advertisers/:id/claim                      | Verified manual ownership assignment described above                                                                  |
| PATCH /admin/advertisers/:id                           | suspended boolean, reason; public visibility changes immediately                                                      |
| POST /admin/submissions/:id/approve, /reject           | Revision UUID, reason required                                                                                        |
| POST /admin/adverts/:id/suspend                        | reason required; cancels pending revisions                                                                            |
| PATCH /admin/settings                                  | expectedVersion, reason and all settings fields; autoPublish must remain false                                        |
| PATCH /admin/reports/:id                               | status: resolved/dismissed, resolution                                                                                |
| POST /admin/categories                                 | Optional id; name, slug, active. Existing slugs remain stable                                                         |
| POST /admin/businesses                                 | advertiserId, profile; assisted business submission                                                                   |
| POST /admin/businesses/:id                             | decision: approve/reject/suspend, reason                                                                              |
| POST /admin/adverts/:id/feature                        | position, startsAt, endsAt (ISO timestamps)                                                                           |
| POST /internal/maintenance                             | Scheduler Bearer secret; no browser Origin requirement                                                                |

Content includes title, description, categoryId, kind, condition, priceMode, pricePesewas (integer or null), location, phone and/or whatsapp, contactConsent: true, and mediaIds (up to five UUIDs). Product adverts require at least one validated image; wanted/service adverts may omit images. A wanted advert uses priceMode `budget`; contact-for-price uses null; free uses zero. Ghana local phone input becomes E.164. Deals below GH₵100 include known offer prices strictly below 10,000 pesewas. No payment or messaging service is invoked by contact links.

Search uses parameterized PostgreSQL full-text matching and stable cursor pagination with an ID tie-breaker, including microsecond publication timestamps. Price ordering puts unknown prices last. Search is whole-term matching initially; prefix/trigram suggestions remain a measured future enhancement. Trending uses bounded recent aggregate engagement, which can change between pages; it is an approximate popularity order. Fresh results are used and identified when engagement is absent. Feature results obey the same visibility rules.

## Image storage

The S3-compatible adapter targets a **private** bucket. R2 is a candidate; no account or paid service has been created. Before provisioning, verify current pricing, commercial terms and billing requirements. Supply endpoint, bucket, region and server-only access keys using `.env.example` names. Grant only required bucket access. Configure CORS to permit PUT from exact application origins with content-type/content-length as required by the signed request. Never enable public bucket listing or raw-object access.

Signing produces a five-minute upload URL for the expected content length. Finalization checks actual bytes (five MB hard cap), JPEG/PNG/WebP magic bytes, valid still-image dimensions and a 20-megapixel decode limit. Sharp strips metadata and generates a bounded WebP derivative. Only completed owned images may attach to revisions. Uploads are rate-limited and capped at 30 per seller/day. Public image delivery goes through a visibility-checked API rather than a public raw URL; evaluate bandwidth/runtime costs before launch. Storage calls are behind an injectable adapter and tested with an in-memory fake; live R2/CORS behavior is not yet verified.

Maintenance cleans up unattached assets older than a day in batches and removes raw staged originals after signed links expire. Attached historical revisions preserve moderation evidence. The backend does not implement a blanket deletion policy for historical evidence: the owner must approve retention/deletion policy before launch. Finalization holds a database transaction during bounded image processing/storage; assess request duration and pool usage with real storage before production scale. For interrupted finalization, deterministic derived keys are overwritten on retry; maintenance handles unused staged/derived keys.

## Abuse controls and operational limits

Set independent random `ABUSE_HASH_SECRET` and `MAINTENANCE_SECRET` values (32+ characters). PostgreSQL rate buckets work across serverless instances. On Vercel, anonymous identity uses its overwritten `x-vercel-forwarded-for` header and a keyed hash; local/non-Vercel execution shares a `local` bucket until a trusted proxy adapter is configured. Do not deploy behind another proxy without configuring trusted client addressing. IP controls cannot prevent all determined abuse and shared campus IPs may need tuned limits or a challenge service after observation. Do not add a client-controlled IP header as a workaround.

Reports are deduplicated per advert/hash/day and never automatically hide an advert. Metrics are approximate, capped per client/advert and do not prove sales. Scheduler calls require an independent Bearer secret. Vercel uses authenticated GET requests and `CRON_SECRET`; manual schedulers can use POST/GET with `MAINTENANCE_SECRET` as a fallback. See DEPLOYMENT.md for configuration. Retention of reports, audit and engagement history still needs an approved policy. No user-facing frontend, CAPTCHA integration or alerting service is included in Phase 2. No production-ready claim is made before Phases 4 and 5.

## Verification

`npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` and `npm test` are local checks. `npm test` explicitly skips PostgreSQL integration tests unless `TEST_DATABASE_URL` is supplied; skipped tests must never be described as passed. For the full database suite, run `npm run test:integration` with an **isolated disposable** PostgreSQL URL whose database name ends in `_test`. The script migrates that database then runs tests, and the suite truncates its application tables. Never point it at shared or production data. Do not enable a production reset command.

The integration suite tests actual PostgreSQL transactions and migrations, with mocked login sessions for HTTP boundary tests. Google OAuth and real object storage remain separate manual provider checks. Test evidence and branch history are recorded in PHASE_2_STATUS.md. The GitHub branch stack is published with six draft PRs; a Neon-connected backend preview is live. See DEPLOYMENT.md for current remote links.

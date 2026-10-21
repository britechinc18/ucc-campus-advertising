# Hosted backend preview

Verified on 2026-10-21. The owner requested a live backend preview before frontend implementation. This is a development preview, not a completed classifieds website or verified commercial launch.

## Open the current build

- [Backend placeholder page](https://ucc-campus-advertising.vercel.app)
- [Database readiness](https://ucc-campus-advertising.vercel.app/api/v1/health)
- [Categories](https://ucc-campus-advertising.vercel.app/api/v1/categories)
- [Advert search](https://ucc-campus-advertising.vercel.app/api/v1/adverts)
- [Review PR stack](https://github.com/britechinc18/ucc-campus-advertising/pulls)

The homepage intentionally remains the Phase 2 framework placeholder. Public APIs currently return seven provisional categories and zero adverts/businesses. No fake advertisers, adverts, completed sales or engagement were created to fill the preview.

## Resources and isolation

| Resource                   | Verified configuration                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| GitHub                     | `britechinc18/ucc-campus-advertising`; six draft stacked PRs; main retains the planning baseline        |
| Deployed source            | `57773bfc20e9e69997d05444313fbf5bb7e39581`, branch `chore/backend-preview-deployment`                   |
| Vercel team                | `Britechinc`, `team_aq3Rv1q9fHrazQLARIYa7ZPu`                                                           |
| Vercel project             | `ucc-campus-advertising`, `prj_blRh2DqpaBlRwoo544VNzOFsdDnQ`                                            |
| Verified deployment        | `dpl_2KnSgnBnMcUnw5qmH5tv6defYry1`, READY, REST target `staging` (Preview environment)                  |
| Deployment URL             | `ucc-campus-advertising-9zievsw0c-britechinc.vercel.app`                                                |
| Stable alias               | `ucc-campus-advertising.vercel.app`, assigned to that verified staging deployment                       |
| Application region/runtime | Frankfurt `fra1`, Node.js 24, Fluid Compute with managed `pg` pool lifecycle                            |
| Neon organization          | Existing `Bright` organization, Free plan                                                               |
| Neon project               | `ucc-campus-advertising`, `summer-snow-64005723`                                                        |
| Neon region/version        | `aws-eu-central-1`, PostgreSQL 17                                                                       |
| Database                   | `ucc_advertising`                                                                                       |
| Isolated preview branch    | `backend-preview`, `br-rapid-dream-b9ca1kqx`                                                            |
| Reserved empty main branch | `main`, `br-gentle-base-b9bre9p5`; application migrations were applied only to the child preview branch |
| Compute                    | Preview min/max 0.25 CU; Free-plan scale-to-zero behavior retained                                      |

No MedNexus repository, database, deployment or credentials were modified. No plan upgrade, card, domain purchase or optional paid integration was enabled. Existing Vercel account billing still governs usage; do not interpret this as a promise of unlimited free hosting. Confirm commercial-use eligibility and account quotas before advertising to real businesses.

## Environment and credentials

Seven server-only variables are configured for the Vercel **Preview** environment: DATABASE_URL, AUTH_SECRET, ABUSE_HASH_SECRET, CRON_SECRET, MAINTENANCE_SECRET, APP_ORIGIN and AUTH_URL. Database/auth/abuse/scheduler secrets were saved as sensitive values. The stable alias is the configured application/auth origin. No production database URL or migration-owner password was added to ordinary app runtime.

DATABASE_URL uses Neon's pooled endpoint and a dedicated `ucc_runtime` role. The role has application-table privileges and append/read-only access to audit events. Hosted checks confirmed it cannot create public schema objects, update audit events or inherit `neon_superuser`. Operator migrations use `ucc_owner`, not the web runtime role. Connection strings and passwords are deliberately absent from source, screenshots and this document. Local `.vercel/project.json` is ignored.

Google OAuth client ID/secret and image-storage credentials are not configured. The health endpoint accurately reports `databaseReady: true`, `authenticationConfigured: false`, `imageStorageConfigured: false`. Private/auth APIs return an explicit 503 until Google is configured; this is not evidence that real sign-in or posting has been tested live.

## Migration transport

Both committed Drizzle migrations were applied to the fresh preview branch in one transaction through the authenticated Neon SQL transport. Workspace CLI credentials and direct TCP networking were unavailable for Neon; the existing schema/driver were preserved.

`scripts/export-migrations.ts` uses Drizzle's own migration reader to export the exact SQL, SHA-256 hashes and journal timestamps. Before applying, a hosted query confirmed zero application tables and no migration ledger. The transaction created the same `drizzle.__drizzle_migrations` layout and records as Drizzle's PostgreSQL migrator. The hosted ledger contains both expected hashes, seven categories and the five-active/three-daily/thirty-day default settings.

The export helper is read-only and intended for a freshly provisioned database transport. It is not a reset or idempotent database updater. For an existing database, use the normal controlled `npm run db:migrate` flow with a direct operator connection. Do not rerun the entire initial export on an existing branch, run the test reset suite against this hosted preview or apply these initial migrations to MedNexus.

## Actual verification results

| Verification                                           | Result                                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Local typecheck, lint, formatting and production build | Passed after Vercel pool integration                                                                      |
| Disposable local PostgreSQL suite                      | 35 tests passed                                                                                           |
| GitHub CI for deployed commit                          | [Run 39689268235](https://github.com/britechinc18/ucc-campus-advertising/actions/runs/39689268235) passed |
| Vercel build/state                                     | Build completed; READY, target staging, Frankfurt                                                         |
| Hosted migration metadata                              | Two Drizzle records; expected hashes and defaults verified                                                |
| Public homepage                                        | 200, framework placeholder content                                                                        |
| Health                                                 | 200, database ready, private no-store response                                                            |
| Categories/adverts/home/businesses                     | 200; seven categories, empty listings/directory and accurately labeled fresh trending fallback            |
| Missing advert                                         | 404 safe NOT_FOUND response                                                                               |
| Invalid public page size                               | 422 validation response                                                                                   |
| Private adverts/auth providers                         | Expected 503 AUTH_UNAVAILABLE while Google is absent                                                      |
| Foreign-origin profile write                           | 403 ORIGIN response                                                                                       |
| Maintenance without/wrong secret                       | 401 UNAUTHORIZED                                                                                          |
| Maintenance with configured secret                     | 200; no expired or orphaned data to clean                                                                 |

The hosted HTTP smoke runner made **14 successful assertions** across those cases. It supplied the maintenance secret privately with terminal echo disabled and printed only safe results. No WhatsApp message, phone call, real OAuth login or image upload was performed. Browser UI journeys remain Phase 4.

## Deployment limitations and next steps

1. Build the responsive frontend in Phase 3; the current homepage is not a storefront or dashboard.
2. Configure a real Google OAuth web client for the stable origin and callback `/api/auth/callback/google`, then verify sign-in and the audited operator-only admin bootstrap. Never use invented credentials.
3. Select/configure private image storage and verify signed uploads, CORS and re-encoding with the actual provider. Product posting requires a validated image.
4. Vercel rejected Git repository linking with `repo_no_access`. This preview was deployed from the verified committed source files through the Vercel API; GitHub source/PR publication is complete, but automatic Vercel builds from Git pushes are not connected. Grant Vercel's GitHub app access to this repository before relying on automatic deploys.
5. Preview cron jobs are not the production scheduler. The authenticated maintenance endpoint was manually verified; plan automatic scheduling alongside a deliberate production release and retention policy.
6. Finalize moderation/privacy/prohibited-item policies, review Vercel commercial-use eligibility, configure a separate production database/environment and rehearse recovery before public launch.

The API initially defaulted an omitted target to a production-labeled deployment (`dpl_DontbXvfDuyVynfVwC1TS3aZguzt`), which lacked production-scoped app secrets. It is superseded by the verified staging deployment; the stable alias points to staging. No production database or production secret values were provisioned. For subsequent API preview deploys, explicitly use `target: staging` (the API rejects `target: preview`), even though some MCP documentation describes omission as preview. Do not promote the preview as a completed public release.

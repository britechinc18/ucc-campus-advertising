# Phase 4 — private image storage integration

Verified 2026-10-22. This supplements the historical Phase 3 delivery report.

## Delivered

Neon private object storage is configured on the existing isolated backend-preview branch. The private `ucc-advert-images` bucket uses Frankfurt storage, path-style S3 addressing, and a dedicated scoped runtime credential. Five storage environment variables are installed in Vercel **Preview**; both credential fields are sensitive. Credentials are never committed or exposed to browser code.

Bucket CORS permits signed PUT uploads only from `https://ucc-campus-advertising.vercel.app`, with the content-type header. Objects remain private; public image delivery still checks the current advert approval/publication status through the application. Upload validation, WebP normalization, ownership and staged-object cleanup remain enforced.

Neon documentation currently includes 5 GB storage per project on Free, with shared free egress limits. No paid plan, card, upgrade or separate storage subscription was enabled. Monitor usage before launch.

## Actual checks

- **44 unit/PostgreSQL tests passed**, using the separate local test database, including a regression test for path-style signed uploads without an invalid automatic empty-body CRC32 checksum.
- **8 real Neon S3 checks passed:** authenticated bucket access, exact CORS, signed browser-compatible PUT, byte-exact read, anonymous object denial, anonymous listing denial, allowed-origin preflight and unrelated-origin denial.
- **5 browser/application checks passed with real Neon storage:** upload/finalization, owner WebP preview, anonymous denial before approval, public delivery after local administrator approval, and immediate public denial after fulfillment.
- TypeScript, ESLint and Prettier checks passed.

The browser provider checks use synthetic local database sessions and an isolated local PostgreSQL database; they do not establish real Google OAuth success. No sample adverts or fixture identities were inserted into the hosted database.

An isolated child branch `image-storage-integration` (`br-square-flower-b9tefmv0`) holds the tiny test objects and its own credential, separate from runtime storage. It has no PostgreSQL compute endpoint. These test resources are retained for review; no destructive cleanup operation was performed.

## Reproduction

Use private environment files for S3 configuration. Never copy credentials or signed URLs into Git, chat or CI artifacts.

- `scripts/configure-storage-cors.ts`: requires an explicit matching `STORAGE_CONFIGURE_BRANCH` and exact HTTPS `STORAGE_CORS_ORIGINS`; updates only the selected bucket CORS.
- `scripts/probe-storage.ts`: requires `STORAGE_PROBE_CONFIRM=isolated-test-bucket` and a matching `STORAGE_PROBE_BRANCH`; writes tiny probe objects only into an isolated test bucket.
- `scripts/check-storage-browser.ts`: requires the same test-storage guards and a local application/fixture environment. Uses real storage but local synthetic sessions.

## Remaining

1. Configure Google Web application OAuth credentials as `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in Vercel **Preview**, then redeploy. Callback: `https://ucc-campus-advertising.vercel.app/api/auth/callback/google`.
2. Sign in with the intended verified administrator account and grant that specific account via the audited `admin:grant` process.
3. Verify real hosted Google sign-in, advertiser submission, image finalization, approval, search and seller contact destinations together.
4. Review/merge the existing PR stack and resolve the blueprint launch/retention decisions before commercial launch. Vercel Git integration remains disconnected; deployments currently use verified source files through the API.

Phase 4 remains in progress until these provider-backed hosted checks pass. MedNexus was not changed.

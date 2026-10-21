# Backend preview deployment

The owner requested deploying the current backend before frontend work. This is an explicit change in delivery order: perform deployment preparation now, while Phases 3 (frontend) and 4 (browser integration) remain outstanding. A successful backend preview is not a launch-ready classifieds website.

## Current access and blockers

GitHub access is working through the owner connection `britechinc18`, with the ChatGPT Codex Connector installation authorized. The [repository](https://github.com/britechinc18/ucc-campus-advertising) now contains the planning baseline and all backend source branches. The owner created it public; its visibility has not been changed. No MedNexus repository was touched.

Six draft PRs are open in order: [foundation #1](https://github.com/britechinc18/ucc-campus-advertising/pull/1), [schema/auth #2](https://github.com/britechinc18/ucc-campus-advertising/pull/2), [lifecycle #3](https://github.com/britechinc18/ucc-campus-advertising/pull/3), [moderation #4](https://github.com/britechinc18/ucc-campus-advertising/pull/4), [media/discovery #5](https://github.com/britechinc18/ucc-campus-advertising/pull/5), [deployment #6](https://github.com/britechinc18/ucc-campus-advertising/pull/6). They target their preceding branch. None has been merged. Main retains the approved planning baseline; import `chore/backend-preview-deployment` for the full backend preview.

Publication used GitHub's account-scoped Git API because workspace CLI credentials still select the earlier account. Every remote source tree was verified identical to its local branch snapshot. The API generated new commit identities; original local histories are preserved under `refs/archive/ucc-pre-publication/`, and working branches now track their corresponding published remote branches. Future writes must continue using the `britechinc18` account connection.

Neon and Vercel integrations were found and offered for installation/connection. Neither connection has been confirmed. No Neon project, database branch, Vercel project or deployment exists yet. No connection strings, API keys or billing changes have been requested in chat. Use account authorization and protected environment-variable configuration instead of posting credentials.

## Prepared configuration

- `.nvmrc` and `engines.node` select Node.js 24, the locally verified runtime.
- `vercel.json` selects Next.js, `npm ci`, `npm run build` and a daily 03:00 UTC maintenance GET. Expiry correctness is independent of cron timing.
- API routes explicitly use Node.js; the application API allows up to 60 seconds for bounded upload processing, subject to the selected Vercel plan's limits.
- Vercel's `CRON_SECRET` authenticates automatic scheduled GET requests; `MAINTENANCE_SECRET` remains a fallback for manually scheduled POST/GET requests. Configure both to the same strong secret on Vercel for consistency with the full config checker.
- `/api/v1/health` reports database/schema readiness and boolean authentication/storage configuration flags. A 200 response means the database schema is ready, not that real OAuth or storage calls have been verified. It returns 503 for missing/unreachable/unmigrated database state, with no credential/error details.
- Missing Google configuration produces an explicit 503 `AUTH_UNAVAILABLE` on private/API authentication entry points while public browsing remains usable.
- `.github/workflows/verify.yml` performs typecheck, lint, formatting, real PostgreSQL tests and production build for PRs/main. It uses a disposable runner-local PostgreSQL 17 service, with no production secrets. Local equivalents have been verified. The first remote CI run reached container initialization and failed on Docker health-check quoting; the workflow was corrected to use double quotes, and its next remote outcome must be recorded rather than inferred.
- `.vercel/`, all populated `.env` files, build output and dependencies are ignored. `.vercelignore` also excludes tests and local secret files from uploaded deployment context.

## Cost and ownership decisions

Checked official provider pages on 2026-10-21:

- [Neon pricing](https://neon.com/pricing): Free plan available with resource limits; current page states no credit card required. Confirm the actual account tier and available branch/compute/storage allowance before creating the project.
- [Vercel Hobby](https://vercel.com/docs/plans/hobby): restricted to personal, non-commercial use. The planned platform includes business advertising, so do not assume Hobby is eligible for the actual advertising service. Inspect the connected team's plan and confirm any paid requirement with the owner before selecting or upgrading it. An isolated private backend preview does not establish eligibility for commercial launch.
- [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing): Hobby supports daily schedules; use a daily job for this low-volume backend. Pro has more frequent schedules, but none is needed initially.

No paid plan, card, upgrade, domain purchase or metered resource has been enabled by this work. Use a free `*.vercel.app` subdomain if deploying to an eligible account. Keep this project's resources and accounts separate from MedNexus.

## Repository and PR sequence

Completed source-publication sequence (repository currently public as created by its owner):

1. Add its URL as `origin` and push the accepted planning `main` baseline.
2. Push the existing focused backend branches and the `chore/backend-preview-deployment` branch. No force push is needed.
3. Open draft PRs in stack order: foundation → schema/auth → lifecycle → moderation → media/discovery → deployment preparation. Each PR targets the preceding branch until reviewed/rebased/merged, so changes remain reviewable.
4. Review CI results before treating the remote build/tests as verified. Do not claim a merge or PR URL that does not exist.

Import the deployment-preparation branch into a **new** Vercel project for this backend preview; do not repoint an existing site's deployment. Keep the production branch `main`, and use a branch preview for inspection until the PR stack is reviewed. Generate a stable branch alias so the configured application origin does not change on every commit. If the team's plan supports preview protection, keep the incomplete backend preview protected and document any protection bypass used by automated checks; never disable account-wide protections to test it.

## Neon setup and migration release

Create a dedicated `ucc-campus-advertising` Neon project in a region selected to align with the Vercel compute region and Ghanaian users; EU Frankfurt is a candidate, not a provisioned choice. Leave all existing projects untouched. Use an isolated development/preview branch for this initial backend preview. Do not bind future branch previews or test tools to the eventual production database.

Supply the pooled connection string to Vercel as `DATABASE_URL`. Retain TLS settings. Supply a separate migration/operator connection as `MIGRATION_DATABASE_URL` only to the trusted migration process; it is not required by the deployed application and should not be shipped to browser code or ordinary build jobs. Use a separate least-privilege runtime role if account capabilities allow it; avoid database-owner credentials in the web runtime.

Run `npm run db:migrate` once against the selected branch using a supported trusted connection. It applies Drizzle history and both migrations, including custom ownership/search/seed SQL. Migration scripts must not run automatically on each Next.js build or serverless invocation. Do not use `drizzle-kit push`, database resets or production test URLs. The full test runner truncates data and must never target a shared Neon branch.

Verify table/settings existence using safe metadata checks and the deployed health endpoint; do not print connection strings or dump user/contact data. A successful local PostgreSQL test does not prove hosted Neon connectivity. Workspace direct TCP access may require the managed environment's supported network configuration; use the confirmed Neon integration's supported migration/SQL capabilities or a trusted deployment operator rather than bypassing network policy.

## Vercel environment matrix

All variables below are **server-only** and must never use `NEXT_PUBLIC_`. Configure per-environment values through protected provider settings. Build-time migrations are disabled, so an unconfigured build can succeed without demonstrating runtime readiness.

| Variable                                | Backend preview                                                                                | Later production                             |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------- |
| DATABASE_URL                            | Pooled URL for isolated preview branch                                                         | Pooled URL for separate production branch    |
| APP_ORIGIN                              | Exact stable preview origin, including https and no path                                       | Canonical production origin                  |
| AUTH_URL                                | Same stable preview origin                                                                     | Same canonical production origin             |
| AUTH_SECRET                             | Independent random secret, at least 32 characters                                              | Distinct random secret                       |
| AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET     | Needed for actual Google sign-in; may stay absent for anonymous-only preview                   | Required for registered posting/admin access |
| ABUSE_HASH_SECRET                       | Independent random secret, at least 32 characters, for anonymous reports/events                | Distinct random secret                       |
| CRON_SECRET / MAINTENANCE_SECRET        | Same random secret, at least 32 characters; scheduled jobs run on supported deployment targets | Distinct production secret, same pair        |
| S3_ENDPOINT / S3_REGION / S3_BUCKET     | Private isolated storage if testing product images                                             | Private production storage                   |
| S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY | Restricted preview storage credentials                                                         | Separate restricted production credentials   |
| MIGRATION_DATABASE_URL                  | Trusted migration operator only; do not add to ordinary app runtime                            | Trusted production release operator only     |

Do not invent Google credentials. If they are not configured yet, anonymous browsing and the health endpoint can be demonstrated, while authenticated posting/admin workflows remain unavailable. Product posting also requires real configured image storage. Services/wanted can omit images once sign-in is available. The storage interface exists, but no R2 account has been provisioned by this work.

Vercel automatically schedules cron jobs for production deployments, not every branch preview. For a branch preview, invoke the authenticated maintenance endpoint manually to verify it; database-read expiry still works without scheduled jobs. Do not promote an unreviewed branch to production merely to activate cron.

## Post-deploy verification and recovery

Record the actual deployment URL, source commit, Neon project/branch identifiers (non-secret), Vercel team/project identifiers, environment scopes and executed checks after provisioning. Verify:

- Placeholder page and `/api/v1/health` over HTTPS; databaseReady must be true after migrations.
- Anonymous categories, empty advert list and home return valid JSON with no-store. Do not seed fake public advertisers or engagement just to fill the page.
- Foreign-origin writes are denied; unauthorized private access is 401 when auth is configured, or a clear 503 while auth is absent.
- Scheduled/manual maintenance rejects missing/wrong secrets and accepts the configured secret. Do not expose its secret in URLs, browser screenshots or logs.
- Once Google and storage are configured, verify actual sign-in, audited admin bootstrap, staged upload validation and approval/contact-link behavior. Browser UI journeys remain Phase 4.

Use additive schema migrations. Before any future migration of nonempty production data, confirm available Neon backup/PITR/export retention and the actual recovery procedure for the selected plan. Do not assume a Git revert restores data. For application regressions, select a previously verified deployment with schema compatibility checked. No production restore rehearsal or live rollback is claimed in this preparation.

## Verification of this preparation

Local `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm run build` passed. The updated isolated PostgreSQL test suite passed **35 tests** (the prior 33 plus readiness/unconfigured-auth and Vercel scheduled-GET tests). On the production-built local server, health/categories/adverts returned 200; private adverts and auth providers returned the intended 503 without Google configuration; maintenance returned 503 without a configured scheduler secret. Tests do not establish cloud connectivity. GitHub CI was triggered; its initial container-initialization failure is recorded above. Hosted Neon migrations and Vercel deployment remain unexecuted until those account connections are available.

## Authorization history

Initial GitHub attempts failed because the CLI selected the earlier account, then because the correct owner connection lacked a repository app installation. The owner installed the ChatGPT Codex Connector, after which an actual file write succeeded. Source and PR publication are now complete; no further GitHub reconnection is requested.

Neon and Vercel still report as not installed in the latest directory check. No hosted database, Vercel resource, deployment or paid account change has been made. Their installation/account authorization is the remaining external dependency.

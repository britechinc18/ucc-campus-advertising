# Phase 3 — implementation and hosted verification

Verified on 2026-10-22. The public site now serves the implemented frontend:

**https://ucc-campus-advertising.vercel.app**

This is the existing isolated Neon/Vercel **preview environment**, now with the marketplace frontend. It is not a claim that provider setup or commercial launch readiness is complete.

## Delivered

- PDF-based UCC Med Market visual system; light/dark themes with OS default and persisted override; phone/tablet/desktop layouts and accessible shared navigation, forms, dialogs and feedback.
- Public home feeds, categories, URL-backed Explore filters/sort/pagination, advert detail/gallery, share/copy, anonymous reports, WhatsApp/phone contact, related results, business directory/profiles and safe-trading guidance.
- Google sign-in interface and unavailable state; onboarding; owner dashboard/status filters, revision history, withdrawal/fulfillment/renewal, three-step posting, validated drafts, explicit contact consent, signed uploads with retries/reordering and idempotent submission retries.
- Moderated business descriptions, locations, logos and contacts; approved profiles remain public during edit review. Logo ownership/public visibility/orphan cleanup use the existing private media model.
- Responsive admin overview, pending review, advert management, reports, advertisers/history, assisted profiles/posts, verified manual claims, business moderation, categories, version-checked settings, audit history, advert/advertiser suspension and scheduled/ended featured placements.
- Additive bounded/private APIs for frontend reads, owner pagination/counts, allowances, admin search/history/counts and own business profiles. Existing routes remain compatible; no database migration was needed.

All deployed listing/profile/count data comes from the backend. No design samples, invented activity, fixture accounts or sample adverts were inserted into Neon.

## Review branches

These draft PRs form a review stack on the design-review branch; they have not been merged into `main`:

| PR                                                                    | Delivery                                                             | Base                          |
| --------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------- |
| [#8](https://github.com/britechinc18/ucc-campus-advertising/pull/8)   | Authorized frontend reads and moderated business media               | `feat/frontend-design-review` |
| [#9](https://github.com/britechinc18/ucc-campus-advertising/pull/9)   | Public marketplace, shared UI, themes and sign-in interface          | `feat/frontend-api-reads`     |
| [#10](https://github.com/britechinc18/ucc-campus-advertising/pull/10) | Advertiser dashboard and posting/business flows                      | `feat/public-marketplace`     |
| [#11](https://github.com/britechinc18/ucc-campus-advertising/pull/11) | Admin dashboard, repeatable browser verification and delivery status | `feat/advertiser-dashboard`   |

Complete source: `feat/admin-dashboard`. Source deployed: **4976a08b288cbecba2a522f2c60347cb4ce0c5f5**. Later changes on the branch only refine test fixtures/checks and document verification; application source is unchanged.

## Actual verification

| Check                                                                                 | Result                                                                                                                                                                     |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                                                   | Passed                                                                                                                                                                     |
| `npm run lint`                                                                        | Passed without warnings                                                                                                                                                    |
| `npm run format:check`                                                                | Passed                                                                                                                                                                     |
| `npm run build`                                                                       | Passed; all application routes built as dynamic routes                                                                                                                     |
| `node --env-file=/tmp/ucc-frontend-test.env --import tsx scripts/test-integration.ts` | **43 tests passed**, using a separate disposable local PostgreSQL 17 database named `ucc_frontend_test`; migrations applied to that database only                          |
| `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`                     | **6 browser suites passed**, using a separate `ucc_frontend_browser_test` database with synthetic database-session fixtures                                                |
| Hosted preview checks                                                                 | Authenticated Vercel fetch verified home/Explore/businesses/sign-in/health before changing the stable alias                                                                |
| Stable alias checks                                                                   | Eight read-only HTTP checks passed: home, Explore, businesses, help, sign-in, post, admin and health. Streaming private-route redirects additionally verified in a browser |
| Hosted mobile interaction checks                                                      | Light/dark empty state, no sample listings, no horizontal overflow, persisted theme override and filter-dialog open/Escape verified on the actual public alias             |

Browser suites cover public search/filter/contact links/reporting; submission → admin approval → public search/price → fulfillment/public removal; report resolution/settings/role rejection; theme/focus/onboarding; responsive layouts and automated accessibility; business edit approval separation and unavailable upload feedback. Tests assert contact link destinations and do not send WhatsApp messages or place calls.

Public layout checks cover 320, 390, 768, 1024 and 1440px in both themes. Admin screens are checked at 320, 768 and 1440px. Automated WCAG A/AA scans found **no serious or critical violations in checked screens**. This does not establish full accessibility compliance or replace assistive-technology/manual testing. Real Google OAuth and real object-storage uploads were not exercised.

Two early browser selectors were corrected: nested select labels required accessible combobox selectors, and an upload alert assertion needed to exclude Next.js's route announcer. Long category names initially overflowed narrow phones; compact category labels and constrained chips fixed it. Final checks above were run after these corrections. Session identities and secrets remain in private temporary files and are not committed or uploaded as artifacts.

## Deployment

- Vercel team: `team_aq3Rv1q9fHrazQLARIYa7ZPu` (Britechinc).
- Project: `prj_blRh2DqpaBlRwoo544VNzOFsdDnQ` (`ucc-campus-advertising`).
- Deployment: **dpl_5vMd8UvvriEyZkz8qh6LKtbyLgdV**, status **READY**, target **staging** (Vercel Preview environment), Node 24, Frankfurt/fra1.
- Deployment URL: `https://ucc-campus-advertising-7s0xxbfau-britechinc.vercel.app` (Vercel-protected preview URL).
- Public stable alias: `https://ucc-campus-advertising.vercel.app` (verified without a bypass link).
- Deployed from 68 committed application/configuration files through the Vercel API. Design images, prototypes, browser fixtures and local credential files were excluded.
- Previous stable deployment retained for rollback: `dpl_2KnSgnBnMcUnw5qmH5tv6defYry1`.
- No migrations, production database edits, paid services or MedNexus changes were made.

The Vercel project still has no Git connection. PRs do not automatically deploy; a verified source-file deployment was used. The health endpoint retains its compatible `mode: backend-preview` label even though this preview now serves the frontend.

## Remaining provider setup

Hosted health still reports `databaseReady: true`, `authenticationConfigured: false`, `imageStorageConfigured: false`.

1. **Google OAuth:** configure `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` privately in the project's **Preview** environment. Callback: `https://ucc-campus-advertising.vercel.app/api/auth/callback/google`. Origin: `https://ucc-campus-advertising.vercel.app`. Existing Auth.js/session integration is retained; connected ChatGPT/GitHub accounts do not supply these Google application credentials.
2. **Private S3-compatible image storage:** configure `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` in Preview. Configure exact-origin signed PUT CORS as described in BACKEND.md. No storage account, bucket or paid plan was created. Do not put credentials into chat, Git or browser code.
3. Redeploy after adding provider configuration, then exercise real Google login, uploads/finalization, advertiser submission and administrator approval with the configured providers. An operator must grant the intended administrator after their verified account exists, using the documented `admin:grant` process.
4. Before a real commercial launch: complete the outstanding retention policy and hosting-plan eligibility decisions in the existing blueprint/deployment docs, review/merge the PR stack, and complete provider-backed integration testing. No paid upgrade has been enabled.

Visitors can browse now. Advertiser/admin pages deliberately lead to the unavailable sign-in screen until OAuth is configured. The empty homepage is correct because the hosted database has no approved adverts.

## Reproduce browser tests safely

Only use an isolated **local** PostgreSQL database whose name ends `_test`; the fixture script truncates application tables. Never use shared Neon data. Supply configuration through a private local environment file, including the local test database URL and synthetic Auth.js/Google fixture values. Do not use real provider secrets in CI.

```sh
# In a configured local disposable test environment:
npm ci
npm run db:migrate
npm run test:browser:seed
npm run build
npm run test:browser
```

`playwright.config.ts` starts the app if required, uses one worker, refuses a remote base URL and disables trace/screenshot artifacts containing session state. On this managed machine, `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium` selects the provided browser. Elsewhere install the matching browser with `npx playwright install chromium`. The CI browser job uses synthetic local-only values and its own ephemeral PostgreSQL service. It does not verify live provider credentials.

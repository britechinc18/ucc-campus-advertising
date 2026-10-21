# UCC Campus Advertising Platform

Campus classifieds for University of Cape Coast medical students and businesses. Independent of MedNexus. Visitors browse freely and contact sellers by WhatsApp or telephone; no carts, payments or in-app transactions.

**Status: Phase 2 backend implemented and locally verified. Phase 3 frontend has not started.** The current page is a framework placeholder, not the public website. The backend source is published on GitHub in six draft review PRs. The [hosted backend preview](https://ucc-campus-advertising.vercel.app) is connected to an isolated Neon database. Google sign-in and image storage are not configured yet.

- [Live preview, resource IDs and verification results](docs/HOSTED_PREVIEW.md)
- [Deployment runbook](docs/DEPLOYMENT.md)
- [Backend setup and API reference](docs/BACKEND.md)
- [Phase 2 results and remaining work](docs/PHASE_2_STATUS.md)
- [Project blueprint](docs/PROJECT_BLUEPRINT.md)
- [Approved defaults and outstanding decisions](docs/DECISIONS.md)
- [Phased delivery plan](docs/DELIVERY_PLAN.md)

Use Node.js 24 and PostgreSQL 17. Install with `npm ci`; copy `.env.example` to a private local environment file and follow the backend guide. Use `npm run db:migrate`, then `npm run dev` with the required server-only environment variables supplied. The backend preview is deployed from `chore/backend-preview-deployment`; hosted resource details and limitations are recorded in HOSTED_PREVIEW.md.

Checks: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`. `npm test` skips database tests without an explicit test URL. To migrate and exercise a disposable PostgreSQL database, set `TEST_DATABASE_URL` (database name must end in `_test`) and run `npm run test:integration`. The suite truncates test application tables.

Published feature branches form a [six-PR review stack](https://github.com/britechinc18/ucc-campus-advertising/pulls). The complete current source is on `chore/backend-preview-deployment`; `main` retains the approved planning baseline until review/merge. Do not point development, test or preview tools at production databases. No real credentials belong in source control.

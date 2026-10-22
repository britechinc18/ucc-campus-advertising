# MedStash

Campus classifieds for University of Cape Coast medical students and businesses. Independent of MedNexus. Visitors browse freely and contact sellers by WhatsApp or telephone; no carts, payments or in-app transactions.

**Status: Phase 3 frontend implemented and deployed to the existing isolated preview.** [Open MedStash](https://ucc-campus-advertising.vercel.app). The public marketplace, advertiser dashboard and admin dashboard use the Phase 2 backend. Private Neon image storage is configured; Google sign-in still needs provider configuration. Private pages show a clear unavailable sign-in state until then. No sample adverts are seeded into the hosted database.

- [Phase 3 implementation, verification and remaining provider setup](docs/PHASE_3_STATUS.md)
- [Phase 3 mockups, PDF and offline prototype](docs/design/README.md)
- [Frontend implementation blueprint](docs/PHASE_3_BLUEPRINT.md)
- [Live preview, resource IDs and verification results](docs/HOSTED_PREVIEW.md)
- [Deployment runbook](docs/DEPLOYMENT.md)
- [Backend setup and API reference](docs/BACKEND.md)
- [Phase 2 results and remaining work](docs/PHASE_2_STATUS.md)
- [Project blueprint](docs/PROJECT_BLUEPRINT.md)
- [Approved defaults and outstanding decisions](docs/DECISIONS.md)
- [Phased delivery plan](docs/DELIVERY_PLAN.md)

Use Node.js 24 and PostgreSQL 17. Install with `npm ci`; copy `.env.example` to a private local environment file and follow the backend guide. Use `npm run db:migrate`, then `npm run dev` with the required server-only environment variables supplied. The complete frontend source is on `feat/admin-dashboard`; current deployment and provider limitations are recorded in PHASE_3_STATUS.md.

Checks: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`. `npm test` skips database tests without an explicit test URL. To migrate and exercise a disposable PostgreSQL database, set `TEST_DATABASE_URL` (database name must end in `_test`) and run `npm run test:integration`. The suite truncates test application tables.

Published backend, design and frontend branches form a [stack of draft review PRs](https://github.com/britechinc18/ucc-campus-advertising/pulls). The complete current source is on `feat/admin-dashboard`; `main` retains the approved planning baseline until review/merge. Do not point development, test or preview tools at production databases. No real credentials belong in source control.

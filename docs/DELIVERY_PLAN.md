# Phased delivery and review plan

## Current status

Phase 1 was completed and explicitly approved by the owner on 2026-10-21. Phase 2 backend implementation and local verification are recorded in [PHASE_2_STATUS.md](PHASE_2_STATUS.md). Phase 3 has not started. No cloud resources, remote repository, deployment or contact with advertisers. No MedNexus files changed. GitHub remote branches and pull requests remain pending a repository destination.

**Phase 1 gate satisfied:** the owner explicitly confirmed approval of Phase 2 using recommended defaults ("Yes it does"). Work remains limited to Phase 2 in this delivery; Phases 3–5 are not bundled into it.

## Branch and PR workflow

Use `main` as the reviewed baseline and short-lived focused branches. Do not combine all phases into one PR. Open draft PRs for review, explain behavior and validation, and record limitations. Merge with required review/checks; do not push directly to main. Do not claim a PR exists until a remote has been configured and the PR URL is available. The initial planning branch is `docs/phase-1-blueprint`; its baseline is committed. Backend branches are stacked locally for review, with separate feature commits. No local feature branch has been merged into `main`.

Suggested planning PR description:

> Defines the UCC Campus Advertising platform scope, proposed Next.js/Neon/Drizzle architecture, moderation and quota behavior, data model, API boundaries, responsive UX, security and phased acceptance criteria. Records owner decisions and an explicit approval gate before backend work. Documentation review only; no application tests apply and no services were provisioned.

## Phase 2 — backend, after approval

Deliver small dependent PRs:

1. `chore/app-foundation`: minimal Next.js/TypeScript/Tailwind toolchain, server-only configuration validation, lint/typecheck/test setup, placeholder env names and ignore rules. No feature UI.
2. `feat/schema-auth`: Drizzle schema and reviewed migrations, selected auth adapter, advertiser ownership and safe admin bootstrap.
3. `feat/adverts-lifecycle`: validated drafts/revisions, atomic quotas and idempotency, duplicate protection and expiry predicates, owner APIs.
4. `feat/moderation`: approval/rejection, assisted posting, suspension, settings, reports, audit and role enforcement.
5. `feat/media-discovery`: staged uploads and validation, public search/category/business/discovery APIs, durable abuse controls and maintenance endpoint.

Include meaningful rule tests with each PR rather than postponing them. Phase exit requires migrations and PostgreSQL integration checks, authorization and concurrency evidence, API contracts and known limitations documented. Credentials must remain external to source control.

## Phase 3 — frontend

Separate PRs for public shell/home/navigation and discovery; advert details/contact/sharing/reporting; advertiser submission/dashboard; admin moderation/settings/assisted posting and business management. Build mobile-first, then tablet/desktop grids. Use synthetic fixtures clearly identified as development data; never seed fake production engagement. Verify keyboard access, responsive layouts and form errors. Do not claim end-to-end integration before Phase 4.

## Phase 4 — integration

Wire all forms and views to shared services/APIs. Add focused browser journeys for submission/approval/public visibility, safe edits, rejection, expiry, reporting, search and contact-link generation. Check direct URL access and cache invalidation for unapproved/suspended/expired content. Test concurrent quota requests against real PostgreSQL and all roles against private routes. Complete image and directory moderation flows; record actual results and unresolved issues.

## Phase 5 — deployment preparation

Prepare GitHub PR/check workflow, Vercel project settings, Neon isolated preview/production setup, environment variable matrix with placeholder values, migration release job, image storage permissions, scheduler setup and free subdomain. Verify current provider terms/pricing before account or billing changes. Document bootstrap, moderation operations, quotas, backup/restore and rollback. Protect production from preview writes and do not run destructive resets. Record executed smoke checks and the actual deployment URL only after deployment exists.

## Verification ledger

Phase 1 performed documentation checks only. Phase 2 executed local static checks, a production build, real PostgreSQL integration tests and a public-API HTTP smoke check; see PHASE_2_STATUS.md for results and limitations. No live provider, browser journey or deployment validation is claimed. Proposed checks in later phases are not results.

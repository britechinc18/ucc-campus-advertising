# Phase 2 delivery status

Date: 2026-10-21. Owner approval: explicit confirmation to start Phase 2 using the Phase 1 recommended defaults. Scope is backend implementation only; the Next.js homepage is a minimal framework placeholder. MedNexus was not accessed or modified.

## Implemented

- Next.js/TypeScript/Tailwind foundation, locked dependencies, server-only API boundary, configuration checks and formatting/lint/typecheck/test commands.
- Drizzle PostgreSQL schema and two committed migrations, auth adapter tables, categories/settings seeds, search index and database-enforced approved-revision ownership.
- Auth.js database sessions and Google verified-email sign-in adapter, fresh role/suspension checks and an audited operator-only admin bootstrap command. Auth logging exposes error types rather than credential/token/SQL details.
- Self-service and administrator-assisted drafts, advertiser profiles, manually verified/audited claiming, immutable submitted advert revisions, approval/rejection, withdrawal, fulfillment, suspension, expiry and renewal.
- Advertiser-row locking, atomic quota reservations and Ghana-day counters, UUID idempotent submission retries, configurable versioned limits, exact duplicate detection and advisory cross-seller flags. Trusted auto-publishing remains disabled.
- Public search/filter/cursor/detail/home endpoints, feature curation, approximate trending metrics, contact-link generation and moderation-safe business directory APIs.
- Reports, audit events, origin checks, bounded JSON validation, private no-store responses, durable PostgreSQL rate buckets and authenticated maintenance.
- Private S3-compatible upload adapter, bounded byte/signature/dimension checks, Sharp re-encoding/metadata stripping, ownership checks, approved-media delivery and orphan cleanup.

## Executed verification

Environment: Node.js v24.19.0; isolated local PostgreSQL 17 container. No Neon production database was used.

| Check                                                                             | Actual result                                                                                       |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                                               | Passed                                                                                              |
| `npm run lint`                                                                    | Passed, no warnings                                                                                 |
| `npm run format:check`                                                            | Passed                                                                                              |
| `npm run build`                                                                   | Passed; static placeholder plus dynamic auth/API routes                                             |
| `npm run test:integration` with explicit isolated test URL                        | 33 passed: 28 PostgreSQL integration/API boundary tests and 5 validation/image unit tests           |
| Same migration/test runner against a newly created empty disposable test database | Migrations applied and all 33 tests passed                                                          |
| Reapplying migrations to the existing test database                               | Passed without reapplying completed migrations                                                      |
| Production Next.js server public HTTP smoke                                       | Categories, advert list and home returned 200 JSON with no-store; foreign-origin write returned 403 |
| `npm audit --omit=dev --audit-level=high`                                         | Reported 0 vulnerabilities in installed production dependencies                                     |

Integration cases include concurrent daily/capacity limits, duplicate blocking, retry replay, rejected corrections, stale edit expiry, 30-day publication duration, renewal, Ghana calendar-day allocation, concurrent approvals, cross-owner/admin denial, lowered limits, account/seller suspension, public visibility, equal-price/null-price and microsecond timestamp pagination, business revisions, consented assisted claiming, private media, report deduplication/rates, large/foreign-origin requests, safe database conflict errors, maintenance authentication and database ownership constraints.

HTTP authorization tests use mocked session resolution while testing real domain queries and PostgreSQL. Image storage tests use an injected in-memory object store while using real Sharp decoding. These do not establish live Google OAuth, R2, CORS, Neon or production deployment correctness. The HTTP smoke check used the built Next.js server and an isolated test database; it exercised anonymous APIs, not a real OAuth login or browser journey. No WhatsApp message or phone call was sent.

## Local review history

The accepted planning baseline is on `docs/phase-1-blueprint` and is also the local `main` baseline. Backend changes form a local stack:

1. `chore/app-foundation`: framework, toolchain and owner approval record.
2. `feat/schema-auth`: schema, migrations, auth and bootstrap.
3. `feat/adverts-lifecycle`: domain rules, quotas and initial race tests.
4. `feat/moderation`: moderation/settings/business services.
5. `feat/media-discovery`: public APIs, private media, HTTP integration, verification and setup notes, including follow-up hardening and expanded tests.

No backend branch is merged to main. No GitHub remote, remote branch or PR has been created. The requested GitHub destination remains outstanding. The local stack can be pushed and reviewed in order once a remote is supplied; review the focused commits as well as branch diffs.

## Remaining work and limits

- Supply a separate GitHub repository destination to push branches and open actual PRs.
- Configure and verify Google OAuth, Neon and private image storage in owner-controlled accounts. No provider credentials, live resources, billing or deployment exist in this delivery. Verify current pricing/eligibility before provisioning.
- Verify live storage signing/CORS, network behavior, real OAuth callbacks and admin bootstrap. Test storage runtime duration, connection-pool usage and delivery costs before launch. The finalization service currently holds a transaction during bounded image processing/storage.
- Provide prohibited-item, moderation/takedown, privacy and retention policies and any required university branding permission before launch. Business profiles use approved/pending JSON snapshots with action audits rather than a separate business revision-history table.
- Owner advert history currently returns up to 100 adverts and directory/selected admin queues up to 50 records; extend pagination if usage reaches those bounds. Search is whole-term PostgreSQL full-text matching; semantic/fuzzy duplicate matching, CAPTCHA and alerting are not implemented. Existing rate limits are suitable for initial low-volume use but require observation on shared campus networks.
- Advert-level suspension intentionally cancels pending review; no automatic reinstatement or quota bypass is exposed. Historical attached images are retained pending an approved evidence-retention policy. Raw staged and unattached asset cleanup is bounded and retryable.
- Phase 3: public responsive website and advertiser/admin dashboards. Phase 4: actual frontend integration, browser workflows, cache/accessibility checks. Phase 5: GitHub/Vercel/Neon release configuration, free subdomain, production operations and deployment/recovery verification.

These later phases have not been implemented or presented as tested. See [BACKEND.md](BACKEND.md) for setup and endpoint contracts.

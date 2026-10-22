# Free-tier budget and image review — 22 October 2026

## Verified allowances

Official current sources take precedence over older search snippets. Neon increased database storage from 0.5 GB to **1 GB per project on 2 October 2026**; existing projects received the increase automatically. The connected project reports `free_v3` and a 1,073,741,824-byte branch ceiling.

| Provider             | Resource                            | Included allowance   | Window                                     |
| -------------------- | ----------------------------------- | -------------------- | ------------------------------------------ |
| Neon Free            | Database storage                    | 1 GB/project         | Stored capacity                            |
| Neon Free            | Object storage                      | 5 GB/project         | Stored capacity                            |
| Neon Free            | Database compute                    | 100 CU-hours/project | Monthly                                    |
| Neon Free            | Public outbound transfer            | 5 GB/project         | Monthly, shared with object-storage egress |
| Neon Free            | Branches                            | 10/project           | Concurrent capacity                        |
| Vercel Hobby         | Fast Data Transfer                  | 100 GB               | Hobby usage window                         |
| Vercel Hobby         | Fast Origin Transfer                | 10 GB                | Hobby usage window                         |
| Vercel Hobby         | CDN requests / function invocations | 1 million each       | Hobby usage window                         |
| Vercel Hobby         | Active CPU                          | 4 CPU-hours          | Hobby usage window                         |
| Vercel Hobby         | Provisioned memory                  | 360 GB-hours         | Hobby usage window                         |
| Vercel Blob on Hobby | Stored blobs                        | 1 GB-month           | Average monthly stored size                |
| Vercel Blob on Hobby | Blob transfer                       | 10 GB                | Included usage                             |
| Vercel Blob on Hobby | Simple / advanced operations        | 10,000 / 2,000       | Included usage                             |

Storage capacity does not refill monthly: retained data continues occupying it. Compute/transfer are activity allowances. Vercel Hobby has no fixed calendar billing cycle; most exceeded features may require waiting 30 days. Team/shared usage and provider units must be checked in the provider dashboard. The admin reference table is a documented plan reference, not a claim of remaining balance or a fabricated live meter.

Hobby is intended for personal, non-commercial use. Check eligibility before a commercial marketplace launch. No upgrade, trial, purchase, plan change or automatic billing increase was performed.

## Actual account checks

The Neon project is the existing MedStash project `summer-snow-64005723`. A read-only project check returned 4,370,701 bytes of database transfer and 4,502 compute seconds for the current provider consumption period, 1 October–1 November 2026. These are delayed operational counters, not an invoice or a complete object-storage transfer measurement. Do not present this point-in-time check as real-time data.

The connected Vercel billing API returned HTTP 404 `costs_not_found` for the queried October period. A correctly scoped project observability query returned HTTP 402 `payment_required`, explicitly requiring Observability Plus on Pro/Enterprise. Creating a token alone cannot remove that plan restriction. No paid telemetry was enabled. The runtime still needs its own credentials for supported provider counters; the ChatGPT connector cannot be embedded in the website as a runtime credential.

TinyFish was tried for the requested runtime token setup. Its saved browser reached Vercel's signed-out landing page. No credential was created. A user-approved secure sign-in handoff was provided. The user subsequently asked to pause this connection; provider-token setup remains pending and was not included in this release. Never print tokens, embed them in source control or widen token scope to other projects.

## Storage decision

Keep the existing private Neon object storage for now:

- It already works with the existing upload, ownership and approval rules.
- Its free capacity is 5 GB, compared with Blob's 1 GB-month.
- A private Blob proxy would still incur store-to-function and function-to-browser transfer; moving providers alone does not remove transfer pressure.
- Direct public Blob URLs would require a separate publication/revocation design to protect unapproved and withdrawn artwork. Do not make the current private bucket public or expose drafts to obtain CDN savings.
- Blob is a future option when image download volume justifies a deliberately designed public media pipeline. It has independent transfer and operation limits and is not unlimited.

## Implemented optimizations

- Marketplace/flyer cards request responsive 360px or 720px WebP images. The aspect ratio is preserved; no flyer cropping is introduced. Detail pages retain the original normalized full-size image.
- Original normalized uploads already strip EXIF, cap dimensions at 1600px and use WebP. Direct signed uploads already bypass the Vercel upload body.
- Ready immutable image objects have a bounded 8 MiB warm-instance byte cache; resized variants have a separate bounded 4 MiB cache. Both expire after five minutes and do not become durable or shared public storage.
- Every image request still executes the existing visibility/ownership checks before cache access or a conditional response. Withdrawal, expiry, suspension and unapproved images retain their access rules.
- Private ETag revalidation avoids returning unchanged image bodies. Responses are `private, no-cache`, never public/CDN cached. Browser revalidation is required on reuse.
- Historical moderation evidence is retained. Existing maintenance only cleans unattached abandoned media after its grace period; no blanket deletion was introduced.
- No monitoring polling, schema migrations, query-stat resets or extensions were added. `pg_stat_statements` is not installed on the live database, so no production query statistics were invented or reset.

A read-only measurement of the five current published demo photographs/flyers found 415,132 bytes at original normalized size, 102,352 bytes for 360px card variants and 257,634 bytes for 720px variants. The 360px sample reduced response bytes by approximately 75%; this is a sample result, not a promise of a 75% reduction in monthly charges.

This reduces repeat object reads on warm instances and card-response bytes; cold instances still read storage, database authorization still costs queries, image resizing uses function CPU, and outgoing downloads still count toward provider allowances. These optimizations do not guarantee staying within every free quota under arbitrary traffic.

## Demo flyers and admin limits

The two existing flyer IDs were retained and published through normal revision submission and approval, using the admin exemption. They remain `DEMO / ARCHIVE`, preserving original artwork, August 2025 dates, attribution and warnings against historical registration links. Their historical date remains in `startsAt`; the metadata publication-validity end was omitted so the explicitly archived gallery samples can be displayed for the normal 30-day advert lifetime. They are not claimed as upcoming events.

Admin Settings now labels the editable limits as **Standard advertiser limits** and explicitly explains the admin exemption. The selling introduction likewise avoids telling an administrator that normal posting limits apply. Normal users' quotas remain intact.

## Sources

- https://neon.com/pricing
- https://neon.com/blog/neon-free-plan-1-gb-per-project
- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/vercel-blob/usage-and-pricing
- https://vercel.com/docs/observability/observability-plus

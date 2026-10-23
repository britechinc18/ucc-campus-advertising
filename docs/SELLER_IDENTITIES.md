# Personal and business identities

An authenticated owner may have one student/personal advertiser and one business advertiser. Existing IDs, adverts, uploads, profile URLs and moderation history remain unchanged. Migration 0002 replaces the single-user unique constraint with a unique `(user_id, kind)` index; unclaimed assisted advertisers remain valid.

`GET /api/v1/me/context` now includes `profiles`. Its legacy `profile` remains the first existing identity for display compatibility, or the requested `advertiserId`. Mutations do not silently choose between multiple identities: `POST /api/v1/me/adverts?advertiserId=<id>` identifies the owner, while a single-profile request may omit the query parameter. Upload signing carries `advertiserId` in its existing body. Business edits select the owner's unique business identity. All explicit identities are checked on the server.

Personal and business submissions share daily and active limits. The owner user row serializes submissions; existing per-advertiser usage rows are summed, preserving historical usage. Administrator submissions retain their exemption. Media remains bound to its original advertiser. Existing adverts cannot change identity.

The business directory searches approved content on the server, in bounded pages. `/campus-360/businesses` shows profiles first; `?view=adverts` retains the business flyer gallery. `/businesses` and existing business slugs continue working. Approved business names may be revised through the existing moderation workflow; pending names stay private.

## Release and rollback

Test 0002 on an isolated child of the live database before deployment. Compare existing advertiser/advert/revision/media/business ID sets before release. Apply migrations with the direct database connection; do not change runtime OAuth or hosting secrets. The change is additive for existing data and compatible with the old single-profile application until dual identities are created.

Deploy the tested application after migration. If rolling back application code after users create second identities, use a forward fix or retain the dual-identity-compatible server. Do not restore the old single-user constraint or delete identities to force a rollback.

# Seller profiles and linked contact defaults

Seller activation creates a personal identity automatically, including business-first activation. Browsing and Google sign-in alone do not activate selling. Migration 0003 backfills only existing sellers missing a personal identity; login email never becomes public profile data.

Each owner has one current personal and one optional current business. Closed identities retain their ownership/history but leave the current-identity unique index. Shared daily usage continues aggregating historical owner identities, so closing/replacing a business does not reset allowance.

Personal defaults have a private draft and an approved public version. Business defaults extend the existing `business_profiles.pending/approved` JSON rather than copying them into another record. Profile versions protect saves and moderation from stale changes. A complete profile requires name, WhatsApp, phone, location and publication consent; incomplete personal drafts can remain private. Legacy adverts remain usable without inventing missing saved profile defaults.

New advert content can carry `contactSources` (field names) and `profileVersion`. Omitted metadata retains legacy snapshot behavior. Explicitly customized fields are never replaced by a profile edit. The public resolver uses approved profile defaults only once that approved version is at least the advert's recorded profile version; until then the advert's independently reviewed snapshot is retained. Contact/privacy filtering is shared across discovery, details, media authorization and sharing.

Hiding a linked channel applies immediately, even before other profile changes are approved. Adverts losing all public contacts receive a persistent privacy hold. Making contacts visible again does not clear that hold: the seller must submit the existing advert for review/restoration, preserving expiry. Advert-specific overrides remain independent and are identified in the profile editor.

Business deactivation hides storefront and adverts without resetting expiry/usage. Reactivation requires admin review. Closing withdraws active adverts, cancels open submissions, reserves the old slug and retains moderation history, allowing one replacement business. The personal profile and login account remain intact.

## Interfaces

- `GET/PUT /api/v1/me/personal`: personal profile plus version; writes `{profile,version,submit}` (`submit:false` saves an incomplete private draft).
- `GET /api/v1/me/context`: available current identities, reusable private defaults and versions, shared usage.
- Existing `POST /api/v1/me/business` and admin business editor: additive socials/visibility/category/defaultsEnabled/version fields.
- `POST /api/v1/me/business/lifecycle`: `{action:deactivate|reactivate|close,confirm:true,name?}`; closure requires the current business name.
- `GET /api/v1/admin/profiles`: bounded personal profile and reactivation queues. `POST /admin/personal/:id` reviews an exact profile version; `POST /admin/reactivations/:id` reviews reopening.

## Release

Use an isolated Neon child for migration validation. Compare existing advert/profile/media IDs and URLs, allowing only the intended automatic personal backfill and additive snapshot metadata. Existing approved advert content is otherwise preserved. Deploy the tested build after migration. Do not remove closed history or restore the old user-only uniqueness rule when rolling back; use a forward fix if profiles or bindings have already been created.

## Seller interface and ownership handover

`/my-medstash` links the personal editor, optional business editor and existing My Adverts. The existing three posting steps remain unchanged. Photos & Contact fills available saved defaults, tracks field-level overrides (including explicit blank values), and offers confirmed restoration. Existing advert identity is fixed. Switching an unsaved advert to another identity preserves details and customized contacts but requires confirmation to clear photos for re-upload under the new owner identity. Profile edits made while posting never overwrite saved defaults.

An admin can assign an assisted personal identity to an account with an unused automatic personal placeholder only with explicit replacement confirmation and the existing verified-contact, consent and evidence checks. An unused placeholder has no saved defaults, adverts, media, daily usage or storefront. It is closed rather than deleted. Substantive personal profiles and second business identities remain conflicts. Claiming a business ensures a personal profile exists, without exposing it publicly or changing assisted advert IDs, URLs or history.

Private profile saves and personal review decisions retain submitted snapshots in the admin audit trail. Public APIs never return private defaults, contact source metadata or private handover evidence.

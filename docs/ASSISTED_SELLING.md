# Assisted selling and verified handover

Administrators use **Post for someone** to select a student/business or create an unclaimed advertiser with recorded permission. Student profiles proceed to posting. New business profiles open the business editor, where the administrator can submit the owner's name, description, logo and consented contacts for review before adding adverts. Existing businesses are accessible from the advertiser's details and the posting selector.

Public business/catalogue pages show the owner's approved brand and contacts; the operating administrator remains in private audit/creator fields. Normal moderation, publication, upload visibility and admin posting exemptions remain in effect.

## Handover

From an unclaimed advertiser's details, **Assign verified owner** searches signed-in, email-verified, active accounts by name/email (minimum two characters, at most 20 results). Search results and verification references are admin-only. `GET /api/v1/admin/advertisers/:id/claimants?q=...` exposes only the limited account picker fields after authorization.

The administrator records a private evidence reference and explicitly confirms ownership and consent. `POST /api/v1/admin/advertisers/:id/claim` retains the existing body contract. The server locks the target user and source advertiser, rejects an existing identity of the same kind, and preserves all advert/media/business IDs. An existing personal seller can claim a business, and vice versa. A repeat handover to the same verified account is idempotent; it does not duplicate audit events. Accounts with an identity conflict require manual resolution, never an automatic merge.

Assisted business editing uses the existing `POST /api/v1/admin/businesses` service, now exposed through a full form at `/admin/businesses/:advertiserId/profile`. No new authentication provider, public verification endpoint, payment service or monitoring credential is introduced.

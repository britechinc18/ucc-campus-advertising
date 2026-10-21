# Decisions for owner review

The owner explicitly approved Phase 2 using the recommended defaults on 2026-10-21 ("Yes it does"). These defaults now guide implementation. Account provisioning, GitHub destination, branding and launch policies remain outstanding; approval does not supply provider credentials.

| Decision | Recommended default | When needed |
| --- | --- | --- |
| GitHub destination and access | New independent private repository `ucc-campus-advertising`; owner provides organization/account and preferred visibility | Before remote PR creation |
| Advertiser authentication | Auth.js + Google sign-in; allow non-UCC business accounts; no paid SMS authentication initially | Before Phase 2 auth |
| Eligibility | Allow registered advertisers; any student verification badge requires actual evidence; decide whether posting is restricted to UCC medical students and approved businesses | Before Phase 2 authorization |
| Administrator identity | Owner-designated verified account, database-assigned role; identity-provider MFA; no public admin signup | Before Phase 2 auth |
| Assisted posting | Admin records consent and creates unclaimed advertiser profile; claiming requires verified contact and admin approval | Before Phase 2 ownership |
| Capacity and daily quota meaning | Pending new adverts reserve one of five slots; daily three counts accepted new adverts/renewals on Africa/Accra date; corrections/edits separately rate-limited | Before Phase 2 quotas |
| Expiry and renewal | 30 days from publication; edit retains expiry; renewal counts as a new submission and needs approval | Before Phase 2 lifecycle |
| Lowering limits | Preserve current published adverts; block additional slots until compliant; recheck pending approvals | Before Phase 2 settings |
| Admin exceptions | No silent bypass; explicit reason and audit for overrides; admin-created submissions still require approval | Before Phase 2 moderation |
| Edited adverts | Keep approved version live while new immutable revision awaits moderation | Before Phase 2 revisions |
| Storage/provider billing | R2 candidate; verify current free allowance, delivery design and billing requirements before selection | Before Phase 2 uploads |
| Price modes | Fixed, negotiable, free, contact-for-price; wanted adverts use budget. Under GH₵100 means known offer price strictly below GH₵100 | Before Phase 2 validation |
| Images | Maximum five images at five MB input each, validated/re-encoded; optional images for wanted/services | Before Phase 2 validation |
| Contacts and consent | At least one public phone/WhatsApp contact, normalized E.164, explicit publication consent | Before Phase 2 validation |
| Categories and areas | Start with books/study materials, electronics, clothing, accommodation, food, services and wanted; owner approves actual campus area vocabulary | Before Phase 3 content |
| Moderation policy | Owner supplies prohibited items, report contact and response process; restrict regulated medical goods and patient data | Before launch |
| Branding and affiliation | Working project name; no UCC logo or implied official endorsement without permission | Before Phase 3/launch |
| Featured/trending rules | Free admin curation; recent aggregate engagement for trending; no promoted-placement payments | Before Phase 3 discovery |
| Privacy/retention | Minimize logs and contact data; owner chooses retention, deletion requests and moderation evidence policy with applicable Ghana obligations reviewed | Before launch |
| Hosting eligibility/cost | Verify Vercel plan permits this commercial classifieds use; present any unavoidable cost and alternatives before provisioning | Before deployment |
| Later trust policy | Auto-publishing disabled initially; define eligibility, revocation and audit before enabling in a separate approved change | Later phase |

The highest-impact approval choices are authentication/eligibility, assisted ownership, quota interpretation, expiry/renewal and storage. No cloud account, credential, billing arrangement or GitHub repository is assumed to exist.

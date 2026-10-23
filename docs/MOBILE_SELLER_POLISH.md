# Mobile and seller polish

- Fix the stretched save circles caused by a legacy mobile `min-width: 44px` conflicting with smaller card and gallery heights. Lock both dimensions, reset padding, retain an enlarged invisible tap area on product cards.
- Align mobile back/save controls at 12px from the top. Back is an accessible icon link that preserves return-to-browsing behavior.
- Overlay the rounded information panel by 20px onto the natural photograph. Multiple-photo thumbnails float above the panel; full images keep natural proportions and the fullscreen viewer uses contain.
- Reduce the desktop seller button and publication/expiry text. Update home support copy and remove the medical-student-only community wording from all user-facing source.
- Mobile Market and Campus 360 names replace the header wordmark; Saved keeps the wordmark. Simplify Campus 360 introduction without changing its feeds or functionality.
- Seller names link to `/sellers/[id]` with paginated approved, unexpired adverts. Suspended accounts and adverts remain hidden using the existing discovery visibility predicate. No email, account ID or private profile metadata is published.
- Optional social URLs live in existing advert-revision JSON alongside public contact details: no database migration or data rewrite. They are editable in the posting form, included in review, persisted in drafts and submitted through existing moderation. Public links render only from approved content. HTTPS profile URLs are restricted to TikTok, Snapchat, Instagram and X/Twitter hosts; credentials, spoofed hosts, arbitrary paths and unsafe schemes are rejected. Tracking parameters are stripped. Empty social fields remain optional.
- Brand glyphs are from Simple Icons (CC0), sourced from https://github.com/simple-icons/simple-icons/tree/develop/icons . No generated images.

Validation includes URL normalization/rejection tests, moderation and suspension integration coverage, the full existing responsive geometry suite with circle and panel-overlap assertions, and browser submission/approval/social-link/seller-page coverage.

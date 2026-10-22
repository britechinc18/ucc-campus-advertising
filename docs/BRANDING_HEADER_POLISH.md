# Final branding and header polish

This refinement preserves the existing routes, marketplace layout, seller activation, Google OAuth, uploads, posting limits, moderation and admin console. No schema changes or new dependencies.

## Branding and header

The supplied approved circular logo is cropped from its surrounding whitespace and resized into 32px favicon, 180px Apple touch, and 192/512px application icons. A web manifest references the application icons. The original logo artwork is preserved; the header/footer use the lowercase `medstash.` wordmark without the old generic shopping-bag badge. No service worker or offline functionality is introduced.

Mobile buyer header: wordmark, search, bell, three-line menu. Seller header: wordmark, search, bell, Google profile picture with initials fallback. Desktop keeps horizontal navigation, search and existing posting/selling actions. Appearance controls live in the menu to reduce header clutter. The search shortcut targets and focuses the existing Market/Campus search input. One repeated homepage community slogan and the duplicate My Adverts heading-level Post button were removed; the existing format shortcuts, navigation and desktop Post action remain.

## Notifications

The app had no notification/read-state infrastructure. `GET /api/v1/notifications` derives a bounded activity feed from existing records, with private/no-store caching:

- Anonymous buyers and signed-in non-sellers see only current approved Campus 360 announcements, through the established public visibility rules.
- Active sellers additionally see their latest advert review decisions from the last 30 days and expiry updates within the previous 7 / next 3 days. Flyer validity dates are respected. Every private read verifies the session user, suspension and ownership on the server; query parameters cannot select another seller.
- Nothing is automatically marked unread. There are no fake messages, unread dots, badges, notification emails, or push subscriptions. This is an activity panel, not a persistent notification inbox.
- Updates are fetched only when the bell opens. The panel includes loading, honest empty, failure and retry states, Escape/outside-click dismissal and focus return. Opening either menu closes the other; navigation closes the panel. Public announcements link to advert details and private updates link to owner management.

## Verification

Results are recorded in the pull request. Tests include seller notification isolation, suspended-account rejection, review/expiry events, ignored user-selection query parameters, public announcements, bell loading/error/retry/empty states, menu keyboard behavior, seller avatar fallback, search focus, icon/manifest availability and responsive/accessibility coverage. Existing lifecycle and browser journeys remain included. Local browser identities are synthetic and uploads in form tests use existing owned media fixtures; a fresh real Google login is not claimed.

Deploy through the existing live configuration after the authorized merge. Keep database credentials, OAuth settings and storage CORS unchanged.

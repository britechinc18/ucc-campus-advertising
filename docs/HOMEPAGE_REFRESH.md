# Homepage editorial refresh

Branch: `feat/homepage-editorial-refresh`. Review-only PR and protected Vercel Preview. Do not merge, change the public alias or deploy live without the user's new approval for this phase.

## Scope

Homepage only, plus a conditional homepage header variant and one reusable furniture glyph. Explore, Campus 360, listing details, authentication, posting, advertiser/admin dashboards and their routes retain their layouts and logic. No schema, API, authentication, Neon, storage, environment or dependency changes. Approved circular logo/icons remain intact. Existing mobile navigation is preserved.

## Design and real data

- Mockup-inspired two-column desktop hero, compact intentional mobile hero, forest-green search band, actual category grid, Latest on MedStash, student-business editorial banner and three restrained trust indicators.
- Existing theme tokens power light/dark surfaces and contrast. Restrained hover/touch feedback respects reduced motion.
- Homepage header keeps the logo and Campus 360 access, adds Explore and Businesses links, desktop appearance/sign-in controls and the appropriate posting action. Other pages keep their existing navigation. Sellers retain menus and My Ads through existing navigation.
- Search submits the real query/category to `/explore`; categories use exact active database names and IDs. Guest/non-seller posting goes through `/sell`; active sellers go to `/post`. No required buyer sign-in.
- Latest listings come from the existing approved, current Market query, bounded to eight. Existing cards/details/local Saved are reused, with real seller names and publication age. Demo-labelled adverts get an explicit Demo badge/disclaimer. No fabricated products, prices, sellers, ratings or activity.
- Separate listing/category failures are handled independently. Existing route skeletons remain; empty and error states use the current components. Homepage reads are reduced from the previous multiple discovery feeds to one bounded listing query plus categories; viewer identity uses the existing request cache.
- Two generated editorial illustrations are optimized to WebP (about 86/76 KiB at 1440px). They are separate from real advert imagery and explicitly described as editorial illustrations. Hero image has reserved space, responsive sizes and priority; business image loads lazily. No new font or animation library.

## Verification and preview boundary

Local PostgreSQL tests and browser suite results are recorded in the PR. Homepage coverage includes search/category routes, posting actions, local Saved, guest/student/seller/business/admin views, all nine widths (320/375/390/430/768/1024/1280/1440/1920), both themes, reduced motion, overflow checks and serious/critical WCAG A/AA scans. Existing marketplace/moderation journeys remain in the complete browser run.

The initial browser run used the old Fresh Finds heading assertion; it was updated to Latest on MedStash. The missing report in its dependent test was resolved by rerunning the complete seeded suite. Hero typography and mobile tap targets were refined after screenshot review.

Local screenshots use clearly synthetic disposable fixtures and may show No photo where fixtures have no media. Hosted screenshots, when supplied, use existing approved content without database mutations. No hosted fixtures are added. Fresh Google login and authenticated preview uploads are not claimed: preview authentication/origin configuration remains tied to the established live site, as documented in the previous phase. This homepage task does not change those settings.

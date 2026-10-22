# MedStash premium frontend preview

## Scope and visual direction

An original consumer-marketplace redesign on `feat/premium-marketplace-redesign`, stacked on `feat/medstash-brand`. It retains the MedStash name, UCC audience and classified-advertising model. No cart, checkout, payments, escrow, invented sellers, listing counts or hosted fixture listings were added.

The visual system uses a self-hosted variable Manrope font, forest-green actions, warm neutral backgrounds, generous typography/spacing, 12/18/24px corner treatments, restrained borders and meaningful surface elevation. Both themes use shared semantic tokens in `src/app/premium.css`; existing responsive layout fallbacks remain in `globals.css`.

Shared styling covers public browsing, advert details, galleries, businesses, onboarding, advertiser management, posting and uploads, admin moderation/settings/reports, dialogs, feedback and errors. The new homepage has a split editorial hero, search, all-category rail, real discovery feeds and editorial collection links. Editorial photos are explicitly distinguished from available adverts. Empty feeds remain honest empty states.

## References examined before implementation

- [Apple Store](https://www.apple.com/store): quiet hierarchy, product-led composition, whitespace, simple navigation and clear discovery sections.
- [Nike](https://www.nike.com/): strong editorial image/copy pairings and pathways into collections.
- [Linear](https://linear.app/): consistent typography, subtle borders, restrained state feedback and progressive disclosure.
- [Saleor Storefront](https://github.com/saleor/storefront): server-first App Router composition, reusable product surfaces and accessible mobile-first steps. Retained this app's own backend and auth rather than importing Saleor or commerce flows.
- [Enterprise Commerce](https://github.com/Blazity/enterprise-commerce): URL-backed browsing, facets and predictable navigation. Retained existing search infrastructure rather than adding Shopify/Algolia services.

Public reference pages/repository READMEs were inspected through the connected content-fetch tool. No reference source code or brand layouts were copied.

## Interaction changes

- Search retains current category/price/location filters, resets pagination, and supports native GET submission.
- Active filters have individually removable links with accessible names; category selection gives Explore a contextual heading.
- Account menu closes on Escape/outside click/navigation and restores focus on Escape.
- Multi-step posting moves keyboard focus to the new step heading.
- Enlarged galleries support left/right arrows as well as the existing buttons, focus trap and Escape dismissal.
- Image load treatment, listing-image zoom, button feedback, dialog/menu entrances, gallery fades and skeleton states use CSS; interactions generally take 160–260ms. Editorial hover zoom is a slower, small movement. Reduced-motion preferences disable all animation and transitions.
- Self-hosted WebP editorial images and a local font eliminate runtime requests to Unsplash/Google Fonts. Private advertiser media continues using the current visibility-checked media API without public caching.

## Assets

Editorial inspiration, not actual adverts:

- Laptop: [image source](https://images.unsplash.com/photo-1496181133206-80ce9b88a853).
- Headphones: [image source](https://images.unsplash.com/photo-1505740420928-5e560c06d30e).
- Books: [image source](https://images.unsplash.com/photo-1544947950-fa07a98d237f).
- Photos used under the [Unsplash license](https://unsplash.com/license), resized/encoded locally as WebP.
- [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope), variable weight 200–800; distributed SIL Open Font License retained at `public/fonts/OFL.txt`.

## Verification

- TypeScript, ESLint, Prettier and optimized Next.js build passed.
- **44 unit/PostgreSQL tests passed**, isolated local `ucc_frontend_test` database.
- **7 Playwright suites passed**, isolated local `ucc_frontend_browser_test` database, synthetic sessions. Coverage includes search/filter/detail/contact/reporting, submission → approval → discovery → fulfillment, admin permissions/reports/settings, themes/dialog focus/onboarding, responsive layouts/accessibility, business moderation and upload-unavailable feedback, plus new menu dismissal/filter-preservation regressions.
- Public layouts checked at 320, 390, 768, 1024 and 1440px in both themes; admin pages checked at 320, 768 and 1440px. Automated WCAG A/AA checks found no serious/critical violations on scanned screens; this is not a full accessibility certification.
- Visual review captured desktop/mobile home, dark home, sign-in, tablet posting, admin and 900px Explore; Manrope loaded and checked screens had no horizontal overflow. The tablet Explore breakpoint was corrected during review.
- **30 additional checks passed** for posting, My Adverts and business management at 320/390/768/1024/1440px, both themes and reduced motion. An initial apparent overflow was a stale local-server CSS artifact after rebuilding; the final checks used a restarted server.
- Provider-backed uploads were verified in the previous storage phase, not rerun against hosted data during this frontend change. Google sign-in already works on the current public site; no claim is made of a new end-to-end hosted login/upload test on this preview.

## Deployment boundary

Deploy only to Vercel **Preview** (`target: staging`) in the existing MedStash project, using the committed source. Retain Vercel deployment protection. Do not assign the public `ucc-campus-advertising.vercel.app` alias, promote, merge, change environment variables, change authentication configuration, or migrate the database.

This preview reads real application data through the existing backend. Existing Google OAuth callback, application origin and storage CORS remain bound to the public site. Google sign-in may return to that public origin, and authenticated write/upload flows inside the separate preview are constrained by those existing origin settings. These workflows were verified in the isolated local browser environment; enabling them end-to-end on a separate hosted preview would require explicitly authorized isolated auth/origin configuration. No safeguards were relaxed to make preview writes pass.

All credentials, fixture identities and browser session state remain outside Git and deployment artifacts. MedNexus is unchanged. The PR remains unmerged and the current public site remains on its existing deployment.

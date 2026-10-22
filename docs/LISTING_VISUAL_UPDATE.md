# Listing imagery and typography update

Reference: https://campus-market.rebeccaasaam.chatgpt.site

## Changes

- Shared Home, Market, Saved and related-listing cards use responsive 4/3/2 columns at desktop (1024px+), tablet (600–1023px) and mobile widths. Thumbnails use 1.13, 1.06 and square aspect ratios respectively.
- Categories come from the existing category record in the shared discovery query. The existing location text and link-to-advert behavior are retained; a pin and the actual publication date appear below the price. Conditions appear on thumbnails; the existing save control and featured/wanted indicators are retained.
- Product and Campus 360 detail photographs flow at their original proportions, without fixed-height or minimum-height frames. Detail information is beside the gallery above 767px and below it on smaller screens. The enlarged viewer uses contain.
- DM Sans 400, 500, 600 and 700 are served locally, using the same font files as the reference. Their SIL Open Font License is in public/fonts/DM-Sans-OFL.txt. Legacy intermediate/heavy font weights are normalized to the loaded weights. The logo artwork is unchanged.
- Shared type, spacing and theme colors are applied by marketplace.css, loaded after the existing theme styles. No adverts, images, accounts, contact workflows or database records were changed. No migration is needed.

## Verification on 22 October 2026

- Production build including TypeScript: passed.
- ESLint: passed.
- Vitest: 16 passed; 42 database tests skipped because no test database was configured.
- Whitespace/diff and formatting checks: passed.
- Added a repeatable browser regression covering all five widths, both themes, Home/Market/Saved, portrait/landscape/square photograph ratios and the enlarged viewer. It is typechecked but has not run successfully in this environment.
- React review: shared components retain existing state, event and navigation behavior; no new client-side fetching or dependencies were introduced. Category data is included in the existing query, not fetched per card.

## Visual verification still required

The requested 320, 390, 768, 1024 and 1440px checks in light/dark themes have **not** completed. Local Chromium could not launch: its socket creation was denied by the execution environment. The cloud browser could inspect the hosted reference, but could not reach the local development server (ERR_CONNECTION_REFUSED). No before/after screenshots were successfully produced.

Use a configured local disposable database and the existing browser-test workflow to verify Home, Market and Saved; open portrait, landscape and square photographs. Check grid columns, actual thumbnail dimensions, full location readability, no horizontal overflow, correct font weights, natural gallery height, and save/navigation/contact behavior. Capture matched before/after screenshots on the same data. Temporary visual fixture routes were removed from the application and are absent from the production build.

Changes are local on feat/listing-images-typography. They have not been deployed.

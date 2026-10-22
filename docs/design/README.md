# Phase 3 visual review — UCC Med Market

This records the **visual-review checkpoint** from the accepted Phase 3 plan. The owner subsequently approved implementation; see [current implementation and deployment status](../PHASE_3_STATUS.md). The primary reference is the owner's _Campus Market Complete Design System V2_ (13 pages). The brand remains **UCC Med Market**.

## Review the designs

- Open [UCC-Med-Market-Design-Review.pdf](UCC-Med-Market-Design-Review.pdf) for the mobile and desktop review pack, including dark themes and all three posting steps.
- Download [ucc-med-market-prototype.zip](ucc-med-market-prototype.zip), extract it and open `review.html` for the interactive prototype. It works offline; no installation or credentials are required.
- Alternatively, serve this directory with `python -m http.server 4173 --bind 127.0.0.1`, then open `http://localhost:4173/review.html`.
- Use the screen selector, navigation links and moon/sun button. Explore filters, reporting, the posting steps and advert-management sheets are demonstrable. Controls that need real services explain that this is a preview.

Every advert, person, business, contact number, activity entry and dashboard count in this artifact is **fictional design content**. The files are outside `src` and `public`; they are not routed into the Next.js application, make no API calls, and cannot submit, publish, report or contact anyone. Nothing in this checkpoint changes the hosted marketplace, database, authentication or image storage.

The remaining admin views are specified in [PHASE_3_BLUEPRINT.md](../PHASE_3_BLUEPRINT.md). The visual pack establishes their shared shell/list/form design, not a finished UI for every administrative operation. These artifacts are not evidence of production integration or accessibility compliance.

## Visual decisions

| Area         | Decision                                                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Reference    | PDF V2 supplies visual direction; backend remains the source of truth for behavior                                                  |
| Palette      | Canvas `#F7F8F5`, surface white, ink `#172724`, brand `#126E61`, border `#DDE5DF`, warm accent `#B98747`                            |
| Dark palette | Canvas `#101C1B`, surface `#1B2B29`, ink `#EDF3EF`, muted `#B2C3BA`, accent `#93D9C5`, border `#3A5048`                             |
| Type         | System sans-serif; body 14–16px, metadata 12–13px; compact phone cards may use 11px location metadata                               |
| Spacing      | 4px foundation; 12/16px phone gutters, 24px tablet gutters, bounded 1200px desktop content                                          |
| Shapes       | 6–10px control/photo radii; subtle borders; shadows reserved for overlays                                                           |
| Grid         | Two phone columns at 320–599px; three tablet columns at 600–1023px; four desktop home columns, three Explore columns beside filters |
| Navigation   | Five bottom tabs below 1024px; desktop top navigation; detail replaces tabs with contact actions                                    |
| Theme        | OS preference initially, persistent manual override; no page transition animation                                                   |

## Sample photography

Embedded photographs are design placeholders from Unsplash. They are not adverts, product endorsements, campus photographs or representations of actual users. They must not seed production. Original source pages:

- Headphones: https://unsplash.com/photos/PDX_a_82obo (image ID `photo-1505740420928-5e560c06d30e`)
- Laptop: https://images.unsplash.com/photo-1496181133206-80ce9b88a853
- Books: https://images.unsplash.com/photo-1544947950-fa07a98d237f
- Phone: https://images.unsplash.com/photo-1511707171634-5f897ff02aa9
- Shoes: https://images.unsplash.com/photo-1542291026-7eec264c27ff
- Backpack: https://images.unsplash.com/photo-1553062407-98eeb64c6a62

The source bytes are embedded in `photos.js` so visual review works offline and sends no third-party image requests. Production uses approved advertiser media through the existing visibility-checked media API.

## Reproduce the review artifacts

In an environment with Python, Playwright, PyMuPDF and Chromium installed:

```sh
python docs/design/export_review.py --chromium /usr/bin/chromium
python docs/design/check_interactions.py
```

The exporter starts a loopback-only temporary HTTP server, renders the screen set, checks horizontal overflow and image decoding, writes `checks.json`, builds the PDF, and packages the offline prototype ZIP. Generated screenshots are written to a temporary directory by default. It never starts Next.js, reads environment credentials or contacts the backend. Browser interactions and final source checks are recorded separately in `VERIFICATION.md`.

## Checkpoint

Review the visual direction before production frontend coding. The requested checkpoint comes from the accepted plan's statement: **“Before implementation, prepare branded mobile and desktop high-fidelity mockups for visual review.”** The owner subsequently approved implementation, delivered in PRs #8–#11. These design artifacts remain the visual reference; current readiness is recorded in PHASE_3_STATUS.md.

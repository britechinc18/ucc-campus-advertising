# Photo-led buyer experience

Implements the supplied reference across Home, Market and advert details. Existing account navigation stays in place, without copying the reference's floating bottom bar. The original logo artwork moves from the header to the footer; the text wordmark remains in the header.

Home uses a photographed workspace with a theme-aware fade for legible text and one search form. Market uses a search/filter toolbar, a keyboard-accessible filter dialog and circular category icons with labels. Category selection preserves the current search and other filters and resets pagination. Existing product cards retain their 4/3/2 columns, data and save behavior.

Mobile advert details show the original image above a rounded information panel. The gallery keeps natural image proportions, thumbnails, fullscreen viewing, and save behavior. Description, price, condition, location, seller and contact actions stay with the listing information. No new seller ratings or invented claims.

## Photograph provenance

- Delivered asset: `public/editorial/workspace.webp`
- Photographer: Olivier Amyot, @user90807060
- Original photo: https://unsplash.com/photos/sunlit-home-office-desk-with-computer-and-books--IhR-UgqUTc
- Source image: https://images.unsplash.com/photo-1770003354577-82b2a2d09d19
- Source labels the image a photograph taken on SONY ILCE-7CM2, published 2 February 2026, free under the Unsplash License: https://unsplash.com/license
- Visually inspected: real sunlit workspace with laptops, books, plants and chair. No synthetic image generation, no claim that this workspace or its contents are for sale on MedStash.
- Converted from a 1600px-wide source to WebP quality 86 without upscaling; responsive Next Image delivery. CSS fades the photograph only for text contrast in the current theme.

## October 23 homepage carousel and promotions

The workspace hero is preserved. A second campus slide rotates every 180 seconds, with manual touch swipe, desktop pointer drag and left/right arrow keys whenever the hero is visible (without requiring hero focus); visible arrows, dots and pause controls are removed. Rotation pauses while hovered, focused, hidden or reduced motion is requested. A lightweight CSS transform moves the image rail sideways over 1.1 seconds; text and search stay in place. Search state persists across slides. The second heading now deliberately spans two lines without a reserved blank line. Campus imagery sits on the right of a shorter contrast fade. The hero and both promotional cards share the soft sage surface (`--soft`). Transparent image masks feather the campus and promotional photographs into that surface, extending photos beneath the text without stretching. Masks are applied to the photo containers, preserving `object-fit: cover` and natural proportions. The old under-GH₵100 feed and plain selling invitation are replaced with two image-backed promotions; the deals link filters prices strictly below GH₵300.

Real photographs, downloaded from their Unsplash image URLs and compressed to WebP without upscaling:

- `public/editorial/campus.webp`: Maxx Sas, University of Ghana clock tower (not UCC). [Source and Unsplash License](https://unsplash.com/photos/white-building-with-a-clock-tower-and-red-roof-GlWlvffqs0I). Original image ID `photo-1770721666606-102254a29fff`, downloaded at 1800px wide.
- `public/editorial/selling.webp`: TheRegisti, smartphone beside a backpack. [Source and Unsplash License](https://unsplash.com/photos/a-person-holding-a-smart-phone-next-to-a-backpack-EYqbHrKRH6Y). Original image ID `photo-1639217173507-e1bb2a4a8938`, saved at 1000px wide.
- The deals card reuses the existing licensed real headphones photograph `sound.webp`.

### Real dusk photo for dark mode

`public/editorial/campus-dusk.webp`: Afrank4436, [Academic City University campus building illuminated at dusk](https://commons.wikimedia.org/wiki/File:Academic_City_University_campus_building_illuminated_at_dusk.jpg), 25 March 2021. [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Cropped (left 0, top 1400, width 3266, height 1900), resized to 1400px and compressed WebP quality 82. The adapted image is distributed under the same license. This is a separate real evening campus scene, not a synthetic day-to-night edit of the University of Ghana tower. A footer link exposes the source, license and changes in `/editorial/credits.txt`.

## Current hero and promotional treatment

The workspace slide retains its original canvas-coloured fade. The campus slide retains the sage fade in light mode and restores the earlier canvas fade in dark mode. Its title is now “Find it on campus.”, with “Buy, sell and discover what students have to offer.” directly below, without a reserved second heading line. The two promotional cards use full mint and teal editorial backgrounds, with no CSS fade over a separate photo panel. The owner authorized these generated decorative assets after reusable photo search; prompts and provenance are recorded in PROMOTION_ASSETS.md. The under-GH₵300 filter and existing selling link are preserved.

## Flat object heroes — 23 October 2026

Both hero slides use transparent editorial product arrangements on flat, theme-aware surfaces. No hero gradient, mask, photographic rectangle or image filter remains. Object-fit contain preserves proportions. Two-line heading slots align the short second title with the first title’s last line; subtitle and search stay at identical positions. Existing three-minute rotation, swipe, mouse drag, arrow keys, pause-on-focus and reduced-motion behavior remain. The approved promotional cards are unchanged.

## Grounded studio hero and mobile layout

Reuse the approved transparent editorial objects with subtle studio lighting and a soft contact shadow underneath. The shadow is limited to the depicted objects; the card has no elevation. Light and dark palettes retain readable copy. On phones, separate the copy/search from a larger centered product arrangement below, with an explicit Search button. Subtitle and search positions remain consistent across slides. No new image downloads, generated assets or dependencies.

## Homepage collections, flyers and footer

Deals now say under GH₵100 and link to max=9999 pesewas (strictly below GH₵100). Collection cards use licensed web photographs of medical textbooks, electronics and a shop counter, with short captions and the existing category links. These editorial illustrations do not claim current inventory or business participation; provenance is available through Photo credits. Removed the introductory label and filler copy. Home Campus 360 shows full rounded flyers with kind, advertiser name and actual publication date outside the image, preserving accessible advert links and saved controls. Other flyer grids retain their existing layout.

Footer contains the review/direct-contact notes, discovery, FAQ, safe trading, privacy and report links. Official email/phone/socials render only when configured through MEDSTASH_CONTACT_EMAIL, MEDSTASH_CONTACT_PHONE and MEDSTASH_{INSTAGRAM,TIKTOK,X}_URL; no invented contact details. New FAQ and privacy pages describe current behavior without retention or compliance promises.

## Focused discovery and seller welcome

Campus 360 removes introductory prose and the redundant directory link, keeping search, categories and the feed. Campus feeds and category galleries use the homepage’s compact rounded flyer treatment with kind, advertiser and publication date. The shared business directory places its introduction below search; both entry points include an image-backed profile callout using the existing licensed shop photograph. Saved removes the storage note; Recently viewed moves its mobile title into the header, removes explanatory filler and keeps Clear history. Menu prioritizes seller tools, Saved, recent browsing and account controls, with Help last.

Anonymous Start selling links now go directly to the simplified Google welcome. A required checkbox links to the platform rules and privacy notice; the server action rejects a missing agreement before starting OAuth. Profile creation still requires its existing consent, now taken from the actual checkbox value. Signed-in users keep their existing onboarding and seller-mode paths. No authentication provider, ownership, posting quota or database schema changes.

## Compact directory and category pages

Remove the shared directory introduction from both business entry points. The shared business profile callout is narrower (up to 820px), shorter and centers its smaller copy and action with slightly more space above than below. Saved listings have 24px top spacing on desktop and 20px on phones. Campus category pages begin with category navigation and search, removing visible breadcrumbs, page heading and descriptive copy while retaining a screen-reader heading, active category state, directory/adverts toggle and pagination.

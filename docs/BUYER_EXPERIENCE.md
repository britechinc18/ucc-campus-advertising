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

The workspace hero is preserved. A second campus slide rotates every 180 seconds, with swipe, previous/next, slide selectors and pause controls. Rotation pauses while hovered, focused, hidden or reduced motion is requested. Search state persists across slides. The old under-GH₵100 feed and plain selling invitation are replaced with two image-backed promotions; the deals link filters prices strictly below GH₵300.

Real photographs, downloaded from their Unsplash image URLs and compressed to WebP without upscaling:

- `public/editorial/campus.webp`: Maxx Sas, University of Ghana clock tower (not UCC). [Source and Unsplash License](https://unsplash.com/photos/white-building-with-a-clock-tower-and-red-roof-GlWlvffqs0I). Original image ID `photo-1770721666606-102254a29fff`, downloaded at 1800px wide.
- `public/editorial/selling.webp`: TheRegisti, smartphone beside a backpack. [Source and Unsplash License](https://unsplash.com/photos/a-person-holding-a-smart-phone-next-to-a-backpack-EYqbHrKRH6Y). Original image ID `photo-1639217173507-e1bb2a4a8938`, saved at 1000px wide.
- The deals card reuses the existing licensed real headphones photograph `sound.webp`.

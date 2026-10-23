## Release preference

The owner requests that completed MedStash changes be merged and deployed by default after appropriate checks. Do not stop at a draft or preview unless explicitly requested or a concrete release blocker remains.

# User design and image requirements

Apply these requirements to all UI work in this repository. They reflect the user's
22 October 2026 video reference and explicit instruction to avoid AI slop.

## Five lessons demonstrated in the reference video

1. Avoid gradients with no communicative purpose. Prefer a restrained, flat brand
   accent; use a gradient only when it serves a specific design purpose.
2. Avoid assigning unrelated colors to every metric or icon. Make the content the
   focus. Reserve color for consistent meaning, such as status, selection or action.
3. Establish visual hierarchy. Do not give every metric or card identical size and
   weight. Prioritize the main information and subordinate supporting information.
4. Use shadows only where something floats. Keep ordinary page sections flat;
   use spacing and subtle borders for grouping. Reserve elevation for overlays,
   popovers and other surfaces that actually sit above the page.
5. Replace generic greeting filler with useful context. Prefer a relevant date,
   period, status or task information over a default 'Welcome back' heading.

These are purpose-driven rules, not a requirement to copy the video's dashboard
layout into a marketplace. Preserve useful repeated product-card geometry.

## Images: explicit user requirement

- Do not generate or use AI-generated listing images, people, testimonials or evidence of activity.
- Specific owner exception (23 October 2026): if matching reusable photos cannot be found, generated editorial backgrounds are authorized for the two homepage promotional cards (gadgets on mint; backpack and phone on teal). The owner also authorized the same transparent-object treatment for both hero slides. Keep this exception limited to these decorative homepage assets; actual listings and campus photos remain authentic.
- Use real photographs or other authentic images supplied by the user or sourced
  from the web. The user has authorized web image search.
- Check provenance and usage permission; retain source and attribution information
  where required. Do not assume a web image is licensed for reuse.
- Do not fabricate product imagery, people, testimonials or evidence of activity.
- Use consistent thumbnail frames and preserve original proportions when showing
  the full image. Never distort an image to fill a layout.

Before delivering UI work, review visual hierarchy, color meaning, elevation,
copy usefulness, image provenance, and mobile/desktop behavior against these rules.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

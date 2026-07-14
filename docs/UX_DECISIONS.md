# UX Decisions

This document records approved interaction and layout decisions that are not
fully captured by the original Figma file. Treat these as maintenance rules
unless a later direction explicitly replaces them.

## Works Browser

- The two primary works modes are `Featured` and `Index`. The Index route uses
  `#works-index`; `#works-list` remains a legacy input only and is normalized
  to `#works-index`.
- Index retains the selected `grid` or `list` mode through the `view` query
  parameter. Returning to Works from another primary section must restore the
  last selected mode and filter.
- Opening a work detail preserves its source page in `from`. Closing the detail
  with the close button or Escape, and moving through detail pager links, must
  return to that source with the matching Index state and saved scroll position.
- Detail close uses same-document history only when the stored navigation marker
  matches the original source in the current browser session; otherwise it
  replaces the route with that source. Do not add a delayed hard-reload fallback
  or a separate opacity exit animation, because either can create a second
  navigation or black transition.
- The Index right panel owns the work list scroll. Wheel input anywhere on the
  Works page should scroll that panel while the category rail remains fixed.
- The featured star is a standalone yellow icon placed at the card's upper
  right. Do not add a glass, border, shadow, or other container behind it.
- On touch or coarse-pointer devices, grid cards must not flip or delay the
  first tap. The first tap opens the work detail directly.
- On phones, Index grid uses two columns whenever there is room for two cards;
  do not degrade the grid to one oversized card. Index list titles are smaller
  than the desktop title scale, while category labels remain legible at the
  approved mobile size.
- Filtering to a short category must not shift the Works header, top switch or
  category rail down the page. Keep the page shell at least viewport-height
  while the work result area changes.

## Responsive Navigation

- On mobile, keep the top blackout mask below the Works title and keep the
  pause/autoflight button clear of the bottom navigation.
- Mobile bottom navigation must remain within the viewport with no horizontal
  overflow. Reduce mobile label sizes before changing the desktop layout.
- Desktop bottom navigation and work-view tab sizing are not a mobile tuning
  target and should remain unchanged when making mobile-only adjustments.
- On phones, the Contact label and its arrow must both remain visible. The
  navigation surface has equal outer padding; do not leave unused space on its
  right edge.
- Navigation labels use the two-line vertical replacement motion on hover or
  keyboard focus. The label itself must not shift horizontally or vertically.
  The Contact arrow uses the matching diagonal replacement motion inside its
  clipped button.
- The Works mode switch uses the same glass family as the bottom navigation,
  with a sliding selected surface. It is shown only for Works, and its labels
  retain the same vertical text replacement interaction.
- Index and work-detail pages use one shared back-to-top control. The Index
  instance is scoped strictly to Index and never appears in Featured. It stays
  above the bottom blur/navigation, scrolls the active page or nested panel,
  and changes glyph and hover contrast for light versus dark media beneath it.

## Homepage Motion And Performance

- Featured plays its entry only on the first visit of a browser session. Warm
  Featured/Index switches and returns from detail pages reuse the existing
  surface and must not flash a black loading state or replay the entry.
- Featured mouse-wheel movement uses one velocity accumulator: wheel input adds
  an immediate depth impulse, then that velocity decays into a controlled
  inertial tail. Do not reintroduce a second target-velocity/lerp buffer. Card
  hover exposes the source image at full brightness and gives immediate click
  affordance.
- The pause/autoflight control remains beside bottom navigation on desktop and
  moves above it on narrow screens. It must stay clear of work-card click and
  hover targets.
- Index wheel forwarding targets the right-panel scroller while the category
  rail stays fixed. Keep it passive and animation-frame-coalesced; do not add
  a blocking per-wheel synchronous update.
- Initial Index entrance motion is limited to the first visible cards. Idle
  cards should not retain a permanent blur filter, `will-change` layer or
  avoidable 3D/compositing work.
- At laptop and tablet widths, keep intentional whitespace around the works
  rail and card grid. Do not solve density by making the desktop layout fill
  every available pixel.
- The Featured canvas must show several recognisable cards on mobile while
  retaining deliberate whitespace. Keep mobile cards smaller and sparser than
  the old oversized layout, but keep the camera close enough for several cards
  to be visible on first paint.
- Canvas media diversity and route prefetch are separate budgets. The current
  canvas pools are up to 8 unique covers on mobile and 10 on desktop, with a
  deterministic mobile rotation to reduce adjacent repeats. Background route
  warmup remains limited to 3 details on mobile and 2 on desktop; do not reduce
  visible media diversity merely to reduce route prefetching.
- Featured entry flight is a first-session-only effect. The initial visit may
  show the page-colored progress state while textures load, but the first
  rendered canvas frame becomes visible immediately. Featured/Index changes and
  detail returns must not add work-view fades, loader fades, replayed entry
  motion or a second black transition.
- Featured cards are direct links to their matching work detail and use the
  site media radius. The canvas retains pointer and wheel depth control after
  entry.
- The Featured auto-flight control appears only in Featured. It aligns with
  the bottom navigation, does not move on hover, and shares the same glass
  material as the detail close control.

## Work Detail Media

- Fullscreen video uses `Close`, not `Stop`. Close and Escape leave only the
  fullscreen player and return to the current work detail; they must not route
  directly to the works browser.
- Fullscreen video separates playback and dismissal hit zones. Clicking inside
  the rendered video toggles play/pause. Pointer movement over the backdrop
  outside the video shows `Close`, and clicking that backdrop closes the
  fullscreen player. The bottom playback controls are excluded from the close
  zone and retain their own click behavior.
- Fullscreen video needs visible rounded clipping and a fixed inset around the
  video. Keep playback controls clear of the video frame rather than overlapping
  it.
- The back-to-top control appears only after scrolling, sits near the work
  content rather than the browser edge, uses the pager arrow rotated upward,
  and must not translate on hover.
- In detail Notion media layouts, horizontal and vertical media spacing share
  `--notion-media-layout-gap`, currently `16px` (`var(--space-4)`). Preserve
  explicit Notion spacer blocks and ordinary text spacing.
- Ordinary inline detail media remains unframed. Its separation comes from the
  authored layout, shared gap and media radius rather than a border around every
  card. If one dark or low-contrast asset loses its edge against the page, use
  only a localized, very subtle inner outline instead of framing the full media
  group.
- Tool icons use small rounded corners. In dark detail views, visually black
  tool icons may be inverted to avoid disappearing into the background.
- Clicking an image in a detail body opens the image lightbox. Its backdrop is
  dark and blurred; the image is inset from the viewport, uses the fullscreen
  media radius, and has a 1px translucent white outline. Backdrop click and
  Escape close it; no close button is shown.
- Do not leave a browser focus ring, white outline or other transient border
  around fullscreen media after opening or closing it.
- Entering fullscreen video is an intentional play action. Start the video
  with sound enabled after that action; muted preview playback is allowed only
  where browser autoplay policy requires it.
- The mute control always mirrors the media element's current `muted` state.
  Synchronize it from media events such as `volumechange`, including after any
  asynchronous playback transition; do not infer the icon from the requested
  playback state alone.
- Before inline or fullscreen video is ready, reserve the final media aspect
  ratio. Render a blurred poster/cover fallback and a visible loading state;
  never show an unexplained black rectangle. Once metadata is available, keep
  an explicit Play affordance visible until playback begins.
- Inline video Play fades in at the lower-left after loading. While the pointer
  is inside the video it follows with a soft inertial response without hiding
  the media, and after pointer leave it eases back to the lower-left rather than
  snapping. Poster brightness and scale also ease in and out; the approved
  implementation uses the shared expressive easing with approximately 760ms
  for brightness and 900ms for scale. Preserve the reduced-motion fallback.
  Fullscreen controls must remain visible while loading and their time bubble
  must stay inside the track at both start and end positions.
- The fullscreen scrub timeline uses real frames sampled across the video, or
  individually cropped cells from a provided sprite sheet. A poster is only a
  loading or failure fallback and must not be repeated as the completed
  timeline. Thumbnail generation starts only while the fullscreen player is
  active so closed detail pages do not preload video solely for the timeline.
- The old standalone `Stop` affordance is not part of the detail page. Video
  pause/stop controls may appear only within the active video surface or its
  fullscreen controls and must not change the route.
- Detail media preserves authored Notion column layouts on mobile. Two- and
  three-column groups should remain multi-column where their content permits;
  do not globally flatten the detail body into a single vertical stack.
- The detail close button and the Featured auto-flight control use one shared
  glass treatment with blur, saturation and restrained inner light. Hover may
  brighten the surface but must not translate it; the X remains white and
  must not turn black.

## About And Contact

- The first About paragraph is sourced from `src/components/about/about-page-content.tsx`
  and must remain valid UTF-8 text, including the curly apostrophe and em dash.
- Contact and social blocks use the same approved vertical rhythm. Do not make
  one block's spacing unique without an explicit layout request.
- The `Send Message` label is black, `18px`, and uses `font-weight: 520`.
  Its glare hover treatment may animate the surface but must not blur or outline
  the label text.
- Primary Contact navigation and the email social action both target
  `wqxyuhuai@163.com`.

## Content Sync And Video Posters

- Project video posters are generated during project sync after the project
  body JSON is published, then retained in the project content JSON for public
  rendering. Avoid relying on the first video frame as the visual poster.
- Use `npm run content:update-all` for a complete published-content refresh.
  Use `npm run content:update-projects` for project-only updates. Both preserve
  the publish checkpoints required for project video posters.
- Maintain poster fields for every published project video. Where a dedicated
  frame is unavailable, use the project cover as the temporary poster rather
  than a blank or black media frame.

## Shared Radius And Glass

- `--radius-site-sm` is the public small-corner token and is currently
  `0.5rem` (8px). Use it for ordinary cards, form inputs, media, video
  previews, lightbox placeholders and loading states. A media surface must
  retain its radius while its image or poster is loading.
- Navigation and deliberately larger glass controls keep their established
  component radius. Do not use the small radius token to flatten their
  silhouette.
- Do not replace glass with a plain transparent fill. Glass controls require
  backdrop blur, restrained saturation/brightness, a low-contrast border and
  subtle inner light consistent with the Featured pause control.

## Verification

- Check the Works Index at desktop and `430 x 932` mobile widths after changes
  to Works navigation, grid cards, masks, or the bottom navigation.
- If a CSS edit is not reflected locally after a reload, restart the dev server.
  If the generated stylesheet remains stale, stop the server, clear the
  generated `.next` directory, then restart before judging the result.

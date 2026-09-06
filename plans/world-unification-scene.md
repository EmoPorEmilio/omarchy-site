# Continuous world composition — scene integration proposal

Status: plan only. No runtime, style, asset, or deployment changes are part of this document.

## Intent and constraints

Confirmed request: the Barrens shading must reach the entire homepage; Quattro's background must interact with the 3D scene and page so the result reads as one continuous artwork. Preserve the current two worlds and their reversible portal journey. The following treatment, technical boundaries, and budgets are recommendations for the next implementation pass, not additional confirmed requirements.

Recommend one document-wide atmospheric composition behind transparent content sections, with a small set of authored terrain/lighting overlays that connect the hero to the lower page. Keep the current transparent hero renderer. Treat the canvas as the foreground objects within that composition, rather than the rectangle containing the whole artwork.

## What currently breaks continuity

- `src/lib/stage-one-world.ts` creates an alpha renderer, clears to transparent, and leaves the scene background empty. This is a useful starting point: empty canvas pixels already reveal the DOM atmosphere.
- Barrens has two separate geometry-only fog treatments: `FogExp2` and a postprocessing distance mix toward `#060b12`. The postprocessing term is explicitly multiplied by scene alpha. Neither can shade text, empty page pixels, or content below the canvas.
- The renderer uses ACES tone mapping, exposure 1.15, and sRGB output. CSS gradients are display colors. Reusing identical hexadecimal values in shader and CSS does not automatically produce an identical displayed shade.
- `.landing-hero::before` owns a hero-only gradient. `.landing-directory`, `.landing-watch`, and `.landing-footer` each paint a different opaque background. These reset the atmosphere at content boundaries, even when their colors belong to the same palette.
- The desktop canvas is inset 34% from the left and 94/74px from top/bottom. At 1440×900 its host is about 950.4×732. Shader changes alone cannot extend beyond that region.
- CSS Quattro glows are anchored to arbitrary percentages of the hero. The sun and mountains are projected through a camera that changes with aspect and travel. Those light fields can therefore drift apart.
- Page state switches `data-world` at the world commitment, while renderer colors blend with a separate computed world mixture. Background images/gradients do not interpolate as a continuous world transition just because `background-color` has a transition.
- The two fallback WebPs contain the page background baked into their scene crop. They are opaque photographs of the old composition. A new shared background behind them would reveal a rectangle or mismatched light field unless the exports change too.

## Options considered

| Approach | Advantages | Limits | Decision |
| --- | --- | --- | --- |
| Larger CSS gradients only | Small patch, no new GPU work | Changes color but retains the detached diorama feeling; lacks authored terrain and depth | Insufficient as the final treatment |
| One viewport/full-document shader canvas | Directly shares shader noise and gradients | Adds a second rendering lifecycle or greatly enlarges existing render targets; full-document buffers are inappropriate; viewport-fixed art can slide independently of content | Do not use for this iteration |
| One tall baked image per world | Strong art direction, simple display | Crops badly across layouts, expensive when oversized, cannot align the moving sun, weak responsive adaptation | Use small layered assets rather than one image |
| Shared DOM atmosphere plus authored transparent terrain layers and the existing alpha canvas | Broad composition control, reusable static fallback, no extra 3D scene, meaningful connection between art and content | Needs coordinate/state contracts and carefully prepared exports | Recommended |

## Proposed art composition

### Barrens

Make the entire page a cold, low-saturation landscape. A broad charcoal-blue fog field should enter behind the hero portal, descend through the directory, and thin around the videos. It should remain recognizably present at the footer rather than becoming a plain dark panel.

Carry the scene's stepped forms outward as large, low-contrast shadow terraces at the page edges. Use two or three connected silhouettes rather than scattered decorative squares. Their density should be highest near the diorama's lower contour, break into larger quiet forms near the directory, and diminish toward the footer. Preserve the existing foreground island, camera, and road/portal geometry in the first pass.

Behind text, the landscape becomes flatter and darker; it is still part of the same atmosphere. Small cool highlights can follow section rules and the foundation mark, echoing the scene's beacon illumination. Do not place a strong beacon glow behind body copy or make every card luminous.

### Quattro

Use the sun as the source of the entire page's light: a warm coral horizon centered on its projected location, a violet/magenta middle distance, and cold indigo/cyan shadow edges. The current vivid foreground objects stay the high-frequency focal point.

Extend a few connected stepped ridges behind and to the sides of the scene. Their diagonal direction should continue into the directory as broad shadow bands, not as a literal road running beneath paragraphs. A quiet violet-to-magenta ribbon can travel down the right margin and reappear around the foundation link and footer. Keep cyan chiefly on the opposite shadow edge, giving the page a directional relationship rather than a collection of unrelated colored blobs.

Place restrained texture and broad color variation across the page. The desired psychedelic quality comes from layered chromatic depth, complementary edges, and unusual atmospheric color; avoid constant hue rotation, animated noise, or a saturated wash over the text.

### Shared composition rules

- Hero → directory → videos → footer must have continuous base atmosphere. Section dividers and spacing remain the structural boundaries; opaque section-sized paint should not create boundaries.
- Keep readable dark fields underneath text and media captions using localized, soft scrims. Actual video imagery can remain opaque.
- Avoid duplicated suns, clouds, billboards, cars, or portals in decorative layers. The hero contains those objects; the page carries their light, shadow, and landscape character.
- Do not require physical 3D perspective to remain valid while scrolling through several screens of editorial content. The continuation is a deliberately authored landscape composition, not a simulated ground plane extending indefinitely.

## Layer and ownership contract

Proposed new page component: `WorldAtmosphere`, mounted once inside `.landing`, before the content. It is decorative, `aria-hidden`, and noninteractive.

1. Base fill: one document-wide world color beneath all content.
2. Atmospheric color fields: two world layers crossfaded by opacity; hero horizon, broad vertical falloff, and edge lighting. Give each an explicit visual role.
3. Terrain/shadow ornaments: transparent, localized assets anchored to the hero end, directory, and footer. They may overlap section boundaries. Their outer edges must fade or terminate intentionally.
4. Fine grain: one small static, seamless luminance texture at low opacity. No animated SVG turbulence filter or per-frame noise generation.
5. Existing hero canvas: foreground geometry and its actual contact shadows, fog, bloom, and portal.
6. Content and localized reading scrims: above the decorative layers. Existing controls stay above the hero canvas.

The full-document container establishes placement, but should not be promoted into a giant GPU compositing layer. Prefer localized absolutely positioned children with bounded heights. Do not apply `will-change`, `filter: blur`, or a compositing transform to the whole document-height atmosphere.

Suggested ownership boundaries:

- Page agent: `WorldAtmosphere`, section transparency, reading scrims, responsive placement, footer continuity, and DOM layer ordering.
- Scene/runtime agent: projected sun/portal/ground-edge anchors, optional matching fog sampling, alpha-safe fallback capture, and shared world transition publication.
- Art agent: original terrain overlays and a subtle grain tile, with desktop/mobile arrangements. Reuse existing geometry as silhouette reference; no new Blender car pass.
- Coordinator: a small shared atmosphere configuration module defining named world palette roles and transition values, to prevent independent color drift across agents.

## Coordinates and state

Define a single `worldMix` in [0,1], where 0 is Barrens and 1 is Quattro. Publish it from the existing experience state using the same reversible formula as the scene. Include a threshold-darkness value separately; do not infer it from the committed-world class.

Use `worldMix` to crossfade the two atmosphere layers. Keep semantic `data-world`, remembered preference, and accessible link colors tied to the existing committed world. This lets artwork blend without changing persistence semantics or making halfway themes a new application state.

For the hero, publish normalized projected anchors only while the camera moves or the layout changes:

- Sun center and a useful halo extent in hero coordinates.
- Portal center for a restrained Barrens atmospheric emphasis.
- A ground/terrain anchor near the lower contour of the island for decorative continuity.

Convert canvas normalized position to hero position using the actual host offset and dimensions:

`heroX = hostLeft + canvasX * hostWidth`

`heroY = hostTop + canvasY * hostHeight`

Cache layout bounds on resize/layout changes. Do not read bounding rectangles every animation frame after writing CSS. The existing camera/layout machinery already knows the hero and host dimensions and should be the source where possible.

Do not map the entire document using a single percentage height: content reflow would move the hero's horizon. Anchor lower ornaments to measured section starts or their own relatively positioned section wrappers, while sharing the continuous base layer. Use ResizeObserver for genuine content/layout changes, never a scrolling layout-read loop.

During travel, suppress projected halo tracking when its 3D source leaves the visible frustum or crosses behind the camera. Fade its contribution under the threshold veil and return to the destination anchor. Never allow projected coordinates near the camera plane to create a huge offscreen CSS gradient.

A page-wide threshold veil may be useful to join canvas and DOM at crossing. If used, it is a short opacity change on a bounded viewport overlay, contains no blur, blocks no input, and respects reduced motion. It must not recreate the removed compulsory introduction.

## Matching fog to the page

Start by matching the displayed fog endpoint to the local atmospheric tone around the receding terrain. Keep fog strongest on far geometry and preserve the near portal silhouette. Do not darken the whole scene until it loses the intended complementary color.

A constant fog endpoint can remain sufficient if the surrounding atmosphere is locally uniform. If a visible edge persists, extend the existing warmed postprocessing shader to sample a small shared atmosphere lookup texture or equivalent smooth field at the same hero coordinate. Blend far geometry toward that local atmosphere color instead of one constant color. Keep the shader graph stable and update uniforms/texture contents only.

This is a second-stage seam correction, not a prerequisite for the initial DOM composition. The scene does not need to render the entire page background. Sampling and CSS display must share color-space assumptions; validate the final displayed result, not just matching hex strings. Avoid applying the same atmosphere twice to transparent pixels or adding bloom as an opaque dark border.

## Assets and fallback

Recommended assets: one seamless monochrome grain tile; two or three Barrens transparent terrain/shadow overlays; two or three Quattro transparent ridge/light overlays. Use deliberately simple SVG paths for hard stepped silhouettes and small raster alpha textures for irregular haze. Author variants only when the mobile composition materially needs them. No licensed external imagery is required.

Regenerate fallback scene images with transparent background from the actual render output, including an explicit check that postprocessing preserves halo alpha without black fringes. Do not create transparency by color-keying the current screenshot. The backdrop should remain the same DOM composition for live 3D, fallback, reduced motion, and no-JavaScript presentation.

If direct alpha export proves unreliable, render the hero scene and background together as an explicit responsive fallback composition, and accept a separate fallback layout only after visual review. A CSS mask on today's opaque still is an interim concealment technique, not the recommended final asset.

Preserve 951×732 framing initially so existing `STILL_PORTALS` remains valid. If a camera or crop changes, update that projection contract and test click alignment at desktop and mobile dimensions together. Regenerate the social JPEG from the final combined hero, not from a transparent asset alone.

## Performance and accessibility boundaries

- Keep one hero renderer and existing stable buffer dimensions. No full-document render targets, extra shadow lights, or new persistent animation loop.
- Static gradients/textures carry the below-fold art. Limit any animated color crossfade to active world travel; stop updating properties once settled.
- Retain current offscreen renderer suspension. Background continuity must work while the hero is not rendering.
- Initial asset target: a few hundred kilobytes total compressed atmospheric decoration, reviewed against actual quality rather than treated as a hard user budget. Watch decoded texture size and giant composited layers, not just download size.
- Keep mobile artwork simpler: fewer ornaments, broad visible atmosphere, no scroll parallax. Respect reduced motion with immediate world atmosphere changes or the existing reduced transition behavior.
- Decorative layers must never intercept pointer events, cover keyboard outlines, change document height, or become reading-order content.
- Check body text contrast against the brightest actual background under it, in both worlds and the transition midpoint. A global average background color is insufficient.
- Preserve a CSS-only base atmosphere for SSR, crawlers, failed asset requests, and blocked WebGL. Persistence should select an appropriate complete world without a forced intro.

## Dependency order and acceptance

1. Agree palette roles, layer ordering, coordinate units, and the worldMix/veil contract before parallel edits.
2. Build a static desktop composition across the entire page in both worlds, retaining existing canvas poses. Review hero-to-directory and directory-to-watch continuity first.
3. Author terrain overlays to bridge those specific gaps; avoid making assets before their role and crop are known.
4. Connect projected hero anchors and reversible world blending. Keep lower-page ornaments static during normal scrolling.
5. Correct any fog/alpha seam that remains; then export transparent fallback scenes and a matching social image.
6. Adapt mobile placement and validate no-WebGL/reduced-motion presentation.

Acceptance frames: 1440×900 and a wide desktop hero; a full-page desktop image in each world; a viewport centered across every section boundary; a 390px-wide full-page view; both portal directions at approach, threshold, and settlement; a fallback hero in both worlds. Compare the live renderer and fallback at the same dimensions.

Accept when the horizon light visibly belongs to the sun, terrain shadow language continues below the hero, no rectangular canvas/still boundary is visible, section boundaries do not reset the atmosphere, text remains comfortably legible, and returning to either world restores one coherent composition. Verify no new first-use shader stall, no buffer resizing during reveal, no idle background animation work, and no horizontal overflow.

# One homepage, two complete worlds — motion and presentation plan

Status: recommendation for design agreement, not implementation authorization. This document changes no source. It preserves the latest approved interaction: a fresh visit opens the readable homepage in The Barrens; portal activation initiates travel to Quattro; subsequent visits restore the remembered world. `bleak` remains the internal identifier for The Barrens.

## Intended experience

The page should feel illuminated by the scene it contains. In The Barrens, the hero, directory, media and footer share dark, restrained, desaturated materials. In Quattro, sunset warmth, violet depth and cyan edge light extend beyond the canvas into those same sections. Layout, navigation and content remain stable. The world changes through one continuous presentation timeline, with the physical portal remaining the cause of the change.

Recommendation: keep one hero WebGL/WebGPU scene and extend its art direction through lightweight page atmosphere and semantic color tokens. A full-height GPU canvas or additional animated scenes below the fold are unnecessary for this pitch and would substantially increase rendering cost. This is a shared lighting system across a normal scrolling page, not a request for scroll-driven world switching.

## What the current implementation already provides

| File | Existing responsibility | Consequential limitation |
| --- | --- | --- |
| `src/lib/experience-controller.ts` | Deterministic progress, phases, committed world, car travel, copy reveal and skip/seek endpoints | `thresholdProgress` describes the crossing, but there is no explicit absolute page/scene presentation weight |
| `src/lib/stage-one-world.ts` | Owns controller and RAF; derives `q` from direction and threshold progress; interpolates light/fog/saturation; exchanges geometry at commit | DOM does not receive the derived weight; portal material color still branches at `q > .5`; darkness veil exists only inside the canvas |
| `src/components/WorldCanvas.tsx` | Publishes `.landing` and document world attributes, hero reveal, accessible portal, static fallback and initialization lifecycle | `data-world` selects a complete CSS palette at commit; it cannot express intermediate atmosphere |
| `src/styles/stage-one.css` | Barrens/Quattro token overrides plus hero, directory, watch and footer atmosphere | Gradient lists switch discretely; only landing background/color have a separate 350 ms CSS transition; media filters and some colors remain independent of world |
| `src/styles/portal-interaction.css` | Loader, portal interaction and fallback art | Several green/dark/text values are fixed; fallback still switches by URL, without a shared visual blend |
| `src/routes/index.tsx` | Server-rendered Barrens page, complete content and section hierarchy | Existing section boxes need a common atmosphere treatment; content should remain server-visible |

Current manual travel is 3,600 ms. Approach ends at 900 ms, crossing at 1,500 ms, geometric commit at 1,200 ms, reveal begins at 2,400 ms and settle phase begins at 2,900 ms. Forward car movement continues until completion. The 6,700 ms intro is now an explicit development diagnostic only; it must not return as automatic startup behavior.

Current `tick()` returns before advancing the controller whenever the host is offscreen or the document is hidden. That saves GPU work, but scrolling out of the hero during travel also freezes the page’s logical transition and its focus/visibility state. A coherent full-page theme requires separating those decisions.

## Recommended shared presentation contract

Keep discrete identity and continuous appearance separate:

- `committedWorld` continues to control scene membership, destination label and persistence. It changes once at the physical crossing. Do not derive identity from a CSS transition or rounded color value.
- Add a pure, framework-independent presentation evaluator, preferably `src/lib/world-presentation.ts`, consumed by both runtime and component. Its output includes `quattroMix` (absolute 0 = Barrens, 1 = Quattro), `thresholdVeil`, and any agreed atmosphere intensity. Existing snapshot phase/progress remain the input; do not create a second elapsed-time clock.
- A shared endpoint definition describes semantic DOM colors and scene light/fog endpoints. The adapters can use different technical color representations, but both receive the same scalar in the same frame. Palette values must be art-directed against the actual scene stills; copying one RGB value into every medium is not a substitute for matching perceived light.
- Publish a presentation sample through the existing state callback, either as an added snapshot field or a small explicit callback payload. Pick one route during implementation and use it consistently. Avoid re-deriving direction and easing independently inside CSS, Solid and Three.

Recommended starting choreography for review: broaden the atmosphere transition beyond the narrow 600 ms geometry crossing. For manual travel, evaluate a single smooth progression from 450 to 1,950 ms, with its midpoint at the unchanged 1,200 ms commit. Reverse travel uses `1 - progression`, so both directions have the same response. The diagnostic intro can use the same ±750 ms window around its own commit. This timing is a proposed art-direction adjustment, not an approved new duration.

This gives early light movement during approach, conceals the scene exchange at the crossing, and lets the destination atmosphere finish developing into arrival. At 2,400 ms the copy starts returning into an already coherent destination. Preserve the 3,600 ms total, car motion through the final frame and the existing reveal overlap. Do not add an activation hold or a separate post-travel theme animation.

Compute `thresholdVeil` once from the existing crossing shape. Use it fully in the scene where it hides geometry replacement. A related, much weaker attenuation may affect decorative DOM atmosphere around the hero; it must not black out body copy, controls or the whole scrolling page. The exact DOM attenuation is pending visual review.

## DOM and scene adaptation

Recommendation: write frame-level presentation properties directly to the `.landing` root once per published frame. Include `--world-mix` and resolved semantic colors. Do not send every interpolated token through component-level signals or rebuild the page subtree. Keep endpoint CSS selected by `data-world` for SSR, static fallback and no-JS behavior; remove inline presentation overrides on cleanup.

For text, borders and surfaces, interpolate paired semantic tokens using a deliberate perceptual color path. Resolve the values in the shared presentation adapter rather than relying on dozens of independent CSS transition timers. Remove the existing 350 ms theme transition while timeline-driven properties are active; otherwise the DOM continually chases an already animated value and lags behind the scene. Local hover transitions may remain.

For complex backgrounds, keep two static atmospheric layers with complementary opacity from the same world weight. Gradients themselves should not be replaced at the commit. Prefer several section-sized layers to a single page-height filtered or constantly blurred texture. Use corresponding horizon/light positions and gradual section boundaries so directory and footer do not read as unrelated rectangular skins. The hero’s transparent canvas edge should meet a deliberately matching backdrop.

Inventory all major visual roles, including:

- Page canvas, raised surfaces, rules, headings, body copy and secondary text.
- Hero backdrop, directory atmosphere, watch atmosphere and footer atmosphere.
- Portal cue, focus ring, CTA, nav status and loader presentation.
- Media thumbnail saturation, shading and hover treatment. Current `watch-feature` filters are fixed and a hover restores saturation regardless of world; Barrens hover should remain Barrens.

Do not apply `filter: grayscale(...) brightness(...)` to the entire `.landing`. It would alter text contrast, logos and the already graded GPU scene together, as well as creating a large compositing surface. Apply grading to decorative media and select actual readable text/surface tokens. Recommendation: keep the canonical green logo recognizable, with more restrained surrounding green accents in The Barrens. Whether the brand itself should desaturate is a design decision, not a motion requirement.

In `stage-one-world.ts`, feed the shared `quattroMix` into the current key/ambient/rim/fill/sunset/road lighting, fog and shader saturation. Replace the portal material’s binary color branch with interpolation. Preserve the stable light list and warmed shader graph: a world change must not rebuild materials, add/remove lights, compile a new pipeline or resize GPU attachments. Scene group membership remains a single switch under the threshold veil; rendering both full scenes throughout the blend is not recommended.

## Scrolling, interruption and accessibility

Advance a busy journey while the document is visible even if the hero has scrolled offscreen. Publish DOM presentation and complete identity/persistence normally, but skip `pipeline.render()` outside the scene’s visibility margin. When the scene re-enters, render the latest pose once; never replay missed frames or rewind the world. Idle offscreen scenes should perform no GPU draws. Hidden documents can retain the current pause policy, resetting the timestamp on visibility return so hidden time does not produce a giant jump.

Separate presentation publication from camera projection/render work sufficiently to make that policy explicit. A single active RAF during the short journey is sufficient; settled pages should return to demand rendering. Do not add a scroll listener that updates page colors continuously or pins the reader inside the hero.

Keep the semantic portal button and projected target. Duplicate activation during travel remains ignored. If keyboard activation hides the portal, move focus to Finish journey; on completion restore the portal only when it is still visible and the user has not deliberately moved focus elsewhere. If they scrolled away or tabbed to another section, do not pull them back or focus an offscreen target. Scope any temporary `inert` state to copy actually concealed by the hero choreography; directory/footer links remain usable.

Reduced motion settles the requested world immediately with exact endpoint colors and scene state. No page-wide darkness pulse, camera travel or atmosphere tween. A preference change mid-journey should atomically settle using the existing skip contract. Screen readers receive one destination announcement after commit/completion, not frame updates; any announcement must be concise and avoid duplicating a newly focused button label.

Crawler/no-JS behavior stays a complete Barrens document with visible art and hidden loader. Returning visitors restore their saved world before enabling the human preparation loader. Static failure mode uses coherent endpoint palette and art and keeps immediate portal switching; no second fallback animation is needed for this pitch. Never persist an interpolated intermediate state or replace saved preferences during warmup captures.

## Dependency-aware implementation sequence

1. Agree full-page endpoint art direction and the proposed atmosphere window. Capture hero/directory/watch/footer in both worlds and select semantic token pairs and image grading. The exact endpoint palette and brand treatment are still design decisions.
2. Controller/presentation owner adds the pure evaluator and deterministic tests for both directions, commit independence, seek and endpoint settlement. Export a stable contract before adapters begin.
3. Runtime owner uses that evaluator, removes residual palette branching and separates timeline advancement from GPU visibility. Retain preparation, abort and demand-render safeguards.
4. Component owner publishes the same frame sample into `.landing`, retains SSR/fallback endpoints and updates focus handling for scrolling away. This step depends on the evaluator contract, not on final gradient art.
5. Page styling owner applies endpoint tokens and atmospheric layers across all sections, then removes asynchronous theme transitions and fixed media grading. Coordinate portal styles with component ownership; avoid simultaneous edits to that file.
6. Review joined endpoints and intermediate captures, then profile real travel on the existing native GPU path and constrained software path. Tune art and layer cost from those captures; do not expand into unrelated production infrastructure work.

## Measurable acceptance for the pitch

These are recommended review criteria, not claims about current performance:

- Fresh startup and no-JS render The Barrens with readable copy and visible art; no unsolicited travel. Stored Quattro restores Quattro. Crawler makes no renderer/model requests.
- At normalized samples before approach, on both sides of commit, during arrival and at completion, DOM and scene use the same presentation weight to within numerical rounding. Both directions are monotonic; commit count is exactly one; endpoint weights are exactly 0/1.
- There is no full-page palette snap at commit, no independently delayed CSS theme change and no static handoff after car arrival. Manual duration remains 3,600 ms of visible-document timeline time.
- Hero, directory, watch and footer have visibly distinct Barrens/Quattro treatments at 320, 390 and 1440 px widths, with no clipping or horizontal overflow. Thumbnails and hover states cannot accidentally restore the wrong world’s grading.
- Text contrast is checked at both endpoints and at least five intermediate mixtures: normal text at least 4.5:1; large text and meaningful UI boundaries/focus indicators at least 3:1. Darkening atmosphere never hides actionable text.
- Scrolling out halfway through travel reaches the correct destination while offscreen, produces zero offscreen GPU draws, and returns to the completed scene without replay or focus theft. Hidden-tab pause/resume is tested separately.
- Reduced motion, Finish journey, repeated clicks and renderer failure produce coherent atomic endpoints with usable links and correct saved world.
- No shader compilation or render-target reallocation occurs during travel. A native-device trace should target at least 55 rendered frames/s during the 3.6 s journey, with no new >50 ms main-thread tasks caused by page-atmosphere updates; compare against the same device’s current scene baseline. Software-renderer results are reported separately and must not be used to claim native smoothness.
- Capture six representative transition frames plus full-page endpoint screenshots. Review canvas-edge continuity and every section boundary; numerical synchronization alone does not establish visual coherence.

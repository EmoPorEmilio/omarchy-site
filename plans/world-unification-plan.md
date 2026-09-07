**One landscape, two complete worlds**

Design and implementation plan · September 6, 2026 · Implemented on `design/continuous-worlds`; approved for merging into `master`.

The deployment checkpoint before this pass is `1d6ef99` on the fork's `master` and `redesign/tanstack-start-solid`. This pass builds on that checkpoint and is available for local review at `http://localhost:4175/`. The user reviewed the branch preview and approved merging it into the fork's `master` and continuing there. It combines the [page study](world-unification-page.md), [scene study](world-unification-scene.md), and [motion study](world-unification-motion.md); the decisions here resolve differences between those studies.

**The design decision**

The entire homepage should occupy the world selected through the portal. Its typography, images, surfaces, lighting and background must share that world's material character. Scrolling should reveal more of one composition. Quattro's strong color belongs to its sunset and landscape; The Barrens drains warmth and saturation from that same composition.

Keep the editorial structure and the recognizable voxel scene. Preserve fresh arrival into readable The Barrens, travel only after portal activation, reversible journeys, remembered world, crawler/no-JS content, and immediate reduced-motion switching. The 3.6-second manual journey remains the duration baseline. The framework migration remains visible in the fork history.

**What the current page tells us**

The latest desktop captures show abrupt background boundaries after the hero, directory and videos. `stage-one.css` paints each section independently. Its Quattro halo is positioned by arbitrary percentages, while the sun moves with the camera and viewport. The foreground island consequently looks placed over a gradient, and scrolling leaves that illustration behind.

The Barrens shader affects rendered geometry inside a canvas that begins 34% across the desktop hero. It cannot grade the rest of the document. Blue type, vivid green marks/actions, and world-independent video filters dilute the difference. Hovering a thumbnail restores full color in both worlds.

The runtime already blends fog and lighting, but `WorldCanvas.tsx` changes the page's `data-world` at one commit event. Gradient definitions and many color roles consequently change on another schedule. The fallback WebPs also contain a baked background, which will become visible as a rectangle when the surrounding composition changes.

The full-page reference captures have unloaded lazy video images. They establish section boundaries and composition, but the next review must scroll through the page before judging media grading.

**Art direction across the whole page**

| Element | The Barrens | Quattro |
| --- | --- | --- |
| Underlying material | Near-neutral charcoal, faint blue-grey mineral texture, broad cold shadow planes | Deep indigo material with violet depth, magenta reflected light and cyan shadow edges |
| Atmosphere | Low-lying dark haze, sparse cool illumination, a clear portal silhouette | Coral/amber light originating at the actual sun, separating into violet and magenta through the middle distance |
| Logo and actions | Canonical shapes with a reversible muted-sage treatment; legible against charcoal | Canonical green restored; clear hierarchy against the surrounding rich color |
| Text and rules | Cool silver, subdued grey-blue secondary roles, low-chroma boundaries | Pale lavender reading text, pink/cyan accents used by role, directional color on a few rules |
| Media | Cool near-monochrome grade with preserved detail | Recognizable source color with a restrained common shadow tint |
| Hover and focus | Clarity, border contrast and small movement retain the Barrens grade | Clear highlights can pick up nearby sunset or cyan light |

The recommendation includes grading the Barrens logo, buttons, status indicators and thumbnails. This answers the request for full-homepage desaturation. Preserve the source SVG and its geometry; apply a presentation treatment. Text receives deliberate readable color values. Individual images receive grading. Their control remains independent so the dark mood does not reduce legibility.

Quattro's psychedelic character should come from complementary light, chromatic depth and unusual terrain color. Build a few broad, authored shapes that echo the stepped mountains and road shoulders. Keep the highest detail and brightest light around the scene. Let those shapes become quieter as they move behind editorial content. Use static, very fine texture to soften large color fields and retain a digital/material quality.

**The composition from top to bottom**

1. **Header and hero.** Keep a quiet dark reading area on the left. Tie the warm Quattro halo to the projected sun, with a colder shadow region on the opposite side. In The Barrens, the portal and beacon lighting establish the cold focal point. Extend a few broad terrain shadows outward from the island's lower edge. Match receding geometry to the surrounding haze so the objects inhabit the page.
2. **Hero into directory.** Carry the same ground and light past the baseline. A violet terrace can descend diagonally into the outer gutter; in The Barrens this becomes a charcoal ridge. Fade it across the heading area instead of ending it at the section boundary. The thin baseline and existing spacing provide structure.
3. **Directory.** Keep the open three-column editorial layout. Let the atmospheric field pass behind the columns at low contrast. Headings and separators inherit the world. Leave ample uninterrupted dark material beneath descriptions and links. The landscape should explain the surface without competing with the reading task.
4. **Foundation link.** Integrate the banner as a slightly denser area of that same surface. Use a restrained upper edge that catches the world's light. Preserve a clear link affordance and the foundation mark.
5. **Videos.** Continue the field behind the feature and list. Grade the actual loaded imagery by world. Barrens hover improves clarity without restoring saturation; Quattro restores color without making unrelated photographs neon. Keep caption shading local to each image.
6. **Footer.** Let the remaining reflected light diminish into a quiet ending. A broad shadow contour or restrained edge tint can connect it to the landscape above. Typography, actions and brand treatment still identify the chosen world when the hero is several screens away.

The user reviewed the first implementation and requested a closer relationship between title and scene on both desktop and mobile. Desktop gives the title more presence and brings the scene inward. The header, hero copy and baseline share the lower sections' centered 1560px content width; the scene is placed relative to that same width so the composition stays together on wide monitors. Mobile uses a compact identity area: the title sits in the foreground, overlapping the landscape toward its right, while descriptive copy and actions use the full width below. Preserve the scene's 951:732 aspect ratio and a usable portal target. Fewer terrain contours bridge the sections. The header uses the canonical square logo. Use actual section positions and content flow, so a taller heading cannot move the sun's light relative to the scene.

**How the layers fit together**

Use a single decorative `WorldAtmosphere` component inside `.landing`, with a continuous base and bounded decorative children. It spans the composition while its individual effects remain modest in size.

| Layer, back to front | Responsibility |
| --- | --- |
| Continuous base | One material/color field through hero, directory, videos and footer |
| Atmospheric fields | Paired world treatments, blended by the same visual progress as the scene |
| Terrain and light shapes | A few transparent stepped silhouettes and soft light overlays, anchored to meaningful section positions |
| Fine texture | Small static luminance tile, barely visible at normal reading distance |
| Existing transparent 3D hero | Actual foreground terrain, car, portal, lights, contact shadows and fog |
| Content and local shading | Readable typography, media captions and interaction controls |

This approach keeps one hero renderer and allows the atmosphere below it to remain complete while that renderer sleeps. Make content sections transparent to the shared base. Local shading gives text and media the contrast they need. Bound the decorative layers instead of promoting a full document-height filtered surface.

For hero light placement, publish normalized sun, portal and terrain anchors from the existing scene layout. Convert them through the host's known inset and dimensions into hero coordinates. Cache layout information on resize; use the same camera sample that renders the frame. Fade or clamp a halo if its source leaves the frustum during travel. Lower-page ornaments stay anchored to their sections and do not chase the camera.

Matching CSS and shader hexadecimal values alone is insufficient because the scene uses exposure and tone mapping. Match their displayed result. First tune the local atmosphere and the receding terrain fog together. If a visible seam persists, extend the existing postprocessing shader with a matching local atmospheric field; this is a targeted correction after reviewing the composition.

**One clock for the portal and the page**

Introduce a pure presentation evaluator in `src/lib/world-presentation.ts`. It consumes the existing controller snapshot and returns an absolute `quattroMix` from 0 to 1 plus `thresholdVeil`. Both runtime and DOM consume that exact sample. Keep `committedWorld` for persistence, scene membership and accessible destination labels; all visual color roles follow the continuous mix.

Use a coordinated endpoint palette for fog, ground, horizon, reflected light, type, lines, actions and media grading. CSS must also contain complete static endpoints for server rendering. The implementation should keep these endpoint definitions synchronized and avoid constructing a second theme state machine.

Resolve semantic colors from the shared mix and write them to the landing root once per published frame. Crossfade complete atmospheric layers with complementary opacity. Image grades follow the same value. Remove independent theme-transition delays that would make the page chase the scene's already animated color values; retain ordinary local hover transitions.

Proposed manual journey timing for visual review:

| Time | Presentation |
| --- | --- |
| 0–450 ms | Portal approach establishes movement; source world remains clear |
| 450–1,950 ms | Page and scene lighting develop together in one smooth reversible blend |
| 1,200 ms | Existing geometric/semantic world commit remains under the portal crossing veil |
| 2,400–3,600 ms | Copy returns while camera and car continue moving to their final state |

The wider lighting window is a proposed tuning, not a new intro or added duration. Reverse travel uses the complementary mix. Keep the strongest crossing veil inside the scene; any surrounding decorative attenuation must preserve readable page content. Reduced motion applies the exact destination immediately.

The current runtime also pauses its logical journey when the hero goes offscreen. Adjust that boundary: a visible document's active journey continues to update theme and persistence while offscreen GPU rendering stops. Returning to the hero draws the completed pose. Preserve scroll position and keyboard intent. A reader who moved into the directory should not be pulled back to the portal. Hidden-tab pause/resume is a separate policy with its own verification.

**Asset and fallback work**

Start with two or three connected terrain/shadow shapes per world and one small texture. Author stepped paths as SVG where appropriate; use compact alpha textures for irregular haze if the study needs them. These assets borrow the scene's material language and light direction while retaining responsive placement.

Regenerate both settled scene stills with real transparency from the render output. Check bloom edges, alpha and contact shadows over both light and dark test backgrounds. Preserve current 951×732 framing initially, so the fallback portal target remains aligned. Update portal coordinates alongside any later crop change. The same DOM environment should surround live 3D and the fallback scene. Recreate the social JPEG from the final combined hero.

Start with a combined compressed decorative-asset target of 200 KB; tune against visible quality and decoded memory. This is a proposed engineering budget. CSS base colors and readable content remain available before decorative assets arrive.

**Execution with three Astra agents at medium effort**

The coordinator owns the shared contract, integration and review. Work proceeds in these bounded passes; the first visual checkpoint is two complete static page compositions.

| Pass | Page agent — Darwin | Art agent — Parfit | Motion agent — Hume | Coordinator |
| --- | --- | --- | --- | --- |
| 1. Establish endpoints | Compose desktop/mobile page treatments and media grades | Define light direction, broad terrain shapes and scene-edge treatment | Extract presentation evaluator and document lifecycle changes | Fix property names, layer ordering, palette roles and ownership before adapters |
| 2. Build the composition | Own `WorldAtmosphere`, route insertion, all page and portal CSS | Own atmosphere assets and their provenance | Own controller/runtime/component adapters and projected anchors | Review both settled pages across every section boundary |
| 3. Join the motion | Tune resolved type/surface/media roles against transition samples | Review fog, halo and geometric edge continuity | Drive DOM/3D from one sample; repair offscreen timing and focus behavior | Integrate changes and inspect forward/reverse journeys |
| 4. Complete fallback and mobile | Recompose narrower layouts and verify loaded media | Capture transparent stills and final social image | Provide capture support and verify reduced-motion/failure endpoints | Run browser, contrast and performance checks; resolve remaining seams |
| 5. Integrate | Final visual review | Final art review | Final behavior review | Build, verify and merge the approved feature branch into master; keep the live preview on port 4175 |

File ownership stays explicit: page agent owns CSS and route decoration; motion agent owns controller, renderer and `WorldCanvas.tsx`; art agent owns assets and capture tooling. Any required change in another owner's file goes through the coordinator. The shared presentation API lands before both adapters depend on it.

**What will establish that this is finished**

- Capture both worlds at 1440×900, a wider desktop, and 390×844; capture complete pages after scrolling through all lazy media. Check 320 px for overflow.
- Review a viewport straddling each section boundary. The atmosphere must continue across it, and the hero canvas/fallback rectangle must not be visible.
- Crop out the hero entirely. The directory, videos and footer should still read clearly as The Barrens or Quattro. Barrens logo, controls and hovered thumbnails must retain the intended muted treatment.
- In Quattro, the dominant halo must belong to the actual sun at each viewport. Broad terrain shapes should carry its direction into the page without crowding reading areas.
- Inspect six transition samples in each direction. DOM and scene must share the same mix, commit exactly once and reach exact endpoints. Preserve the 3.6-second journey and moving car through the final handoff.
- Check normal text against its actual composited background at a target of at least 4.5:1, large text at least 3:1, plus visible keyboard focus and usable controls at endpoints and intermediate blends.
- Verify first visit, remembered Quattro, both travel directions, repeated activation, reduced motion, renderer failure, crawler/no-JS presentation, and scrolling out mid-journey. Confirm that a completed offscreen trip stays completed and does not steal focus or scroll position.
- Compare native-device frame traces with the current baseline. Keep shader compilation and render-target resizing out of travel, produce no offscreen GPU draws, and stop atmosphere updates once settled. Report software-renderer evidence separately.

Implementation references: individual media grading can use interpolated CSS filter functions ([MDN filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/filter)). Transparent decorative masks are available for bounded layer edges ([MDN mask-image](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mask-image)). The reduced-motion presentation must respond to the user's system preference ([MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)). These support the implementation approach; the composition and budgets above are project-specific recommendations.

**Implementation review**

The continuous-world pass was merged into local `master` as `0dd8a08`; the centered responsive refinement was pushed as `279166b`. The square header logo, larger desktop wordmark, shared centered content rails, and overlapping mobile title/scene remain the composition's basis. The fallback sun uses the exported scene's actual projection and follows the same contain-fit geometry as the portal.

The next desktop refinement enlarges the scene by about 8% at a 900px viewport height and aligns its visible right edge with the content rail, accounting for transparent pixels in the artwork. A 951:732 settled frame keeps the live scene and fallback consistent. Its size is capped on smaller desktops and centered vertically in the available hero space. Container-relative dimensions preserve alignment when a browser reserves space for a scrollbar. The baseline's world counter and tagline were removed; section introductions align to the right and center vertically beside their headings, returning to left alignment on phones.

- Both worlds were visually checked at 320, 390, 540, 768 and 1440px. Portal center hit tests passed, the smallest target was 44×52px, and no horizontal overflow was found. Desktop checks at 1920 and 2560px confirmed matching header, main, baseline, directory and footer bounds: 180–1740 and 500–2060px respectively.
- The live 390px renderer matched the still's portal projection within 0.02px. Both travel directions completed with readable copy, no residual inert state and no scroll movement. At 1920px, travel preserved the canvas allocation and performed no temporary layout-style mutations; settled insets are resolved only when the hero dimensions change.
- Crawler and JavaScript-disabled browser contexts received HTTP 200, visible hero copy and all 56 links without requesting the renderer or car model. Fallback first arrival, both switches and a remembered-Quattro reload passed.
- Controller, preference and shared presentation checks pass. Selected text/background contrast samples passed their targets in both worlds and an intermediate blend; this was a targeted review, not a complete accessibility audit.
- Earlier runtime instrumentation found no new shader compilation or texture allocation during a journey. A journey completed while the hero was offscreen with no GPU draws, preserving the reader's scroll and link focus.
- The enlarged live frame was checked at 1440×900 and 1920×1080. Its visible right edge matches the content rail, portal and sunlight projections match the fallback, and travel keeps its GPU buffer size without temporary inset mutations. A reserved 15px scrollbar still leaves the artwork and content edges within 0.01px in the geometric alignment check.

Linux browser checks used software WebGL2. They establish behavior and allocation stability, but do not establish native-device frame rate. Native GPU performance and a complete sequence of transition-frame art reviews remain separate visual validation work.

**First-paint handoff**

The loader is now server-rendered outside the hero, with critical visibility CSS and a standalone bootstrap in the document head. Normal browser visits establish loading before the body can paint; crawlers and JavaScript-disabled visits retain the complete static homepage. Saved world preferences set the loader color before hydration. A 30-second watchdog exposes the static page if hydration fails.

One visibility state machine owns loading, presentation beneath the opaque loader, reveal, and the final live or fallback endpoint. A late renderer cannot reopen loading or replace a settled fallback. The runtime warms both worlds, renders an attached frame at the final layout, and awaits GPU completion before reporting readiness. The component gives that canvas a paint beneath the loader before starting its 240ms fade, then waits for the actual opacity transition to finish. Redundant initial resize/intersection notifications no longer trigger another expensive draw during that fade. Renderer failures decode their still before the same reveal; reduced motion skips the fade.

- A fresh production-build browser trace followed `loading → presenting-live → revealing-live → live`. The canvas became visible only with `data-ready=true`; loader opacity progressed continuously from 1 to 0 and became hidden only at zero. There were no page errors or horizontal overflow.
- Failed renderer imports followed the corresponding fallback sequence with decoded artwork and readable content. Reduced motion reached the static endpoint without a fade. Delayed hydration kept the initial cover opaque and prevented covered links from receiving keyboard focus; an aborted hydration bundle reached the watchdog's static endpoint. Crawler and no-JavaScript checks retained all 56 links without GPU requests.
- Controller, preference, presentation and visibility/bootstrap tests pass, as does the production build and typecheck. Software WebGL2 evidence verifies first-paint ordering, not native-device frame rate.

# One atmosphere, two worlds — page composition plan

Status: recommendation for the next design pass; no implementation authorized by this document. This plan covers page composition and treatments. The scene and transition plans must share the same atmosphere contract before work begins.

## Intent and evidence

The user's requirements are full-homepage desaturated Barrens shading, a more sophisticated Quattro atmosphere connected to its 3D scene, and smooth continuity across the entire experience. Preserve the latest behavior: a useful static Barrens homepage on first visit, an explicitly activated portal journey, and restoration of the last world without autoplay. Keep the complete content and the visible framework migration.

Reviewed current `stage-one.css`, route content, and `output/playwright/palette-{bleak,quattro}-full.png`. These captures show the current palette pass, although their lower video images have not loaded; they cannot establish the final thumbnail appearance. Earlier browser review confirmed the images load when scrolled into view.

The current problem has identifiable causes:

- The hero, directory, watch section, and footer each restart a different background. Hard horizontal changes at section boundaries make four panels from one homepage.
- Quattro's large soft magenta field has no spatial relationship to its small sun or the scene's sharp voxel planes. It looks like a background behind an illustration.
- The Barrens scene is desaturated, but blue headings and the full-strength green logo/buttons continue through a conventional dark website. The image alone carries much of the world change.
- Video filters are world-independent (`saturate(.8)` for the feature and `.5` for the list); hover restores full color even in The Barrens.
- Opaque foundation and video surfaces interrupt the atmosphere. The page's current 350 ms color transition does not interpolate the gradient definitions, all the text tokens, or image grading together.

## Recommended direction: the landscape becomes the page

Keep the editorial grid, canonical mark, mono typography, and useful content. Extend the authored scene's material and lighting language into a continuous page field. Quattro should feel like sunset light falling on one long indigo surface. The Barrens should feel like the same surface after its color and warmth have drained away.

Use an authored, low-contrast atmosphere plate derived from the actual scene's geometry/light directions, with a separate small repeatable surface texture. Prefer SVG or a compact exported raster for the plate: broad, stepped shadow planes, a thin amber horizon haze, violet slopes, and sparse cyan edge light. Avoid adding another sun, another portal, literal floating scene fragments, or many decorative grid lines. A few broad planes are enough. Their edges can soften at distance while retaining the voxel composition's deliberate directions.

The strongest light remains beside the actual Quattro sun. Its warmth travels toward the lower page as increasingly dim reflected light. A single atmospheric coordinate system spans section boundaries; no section restarts the glow at its top-left corner. On mobile, recomposition follows the scene's position below the copy, rather than shrinking a desktop background into a tall strip.

## Section treatments

| Area | The Barrens | Quattro | Continuity decision |
| --- | --- | --- | --- |
| Header and hero copy | Near-neutral graphite, cool silver text, restrained sage mark and primary action | Canonical green mark/action, pale lavender text; quiet indigo under copy | Keep text over the darkest, least detailed part of the atmosphere. The hero does not need a boxed scrim with a visible edge. |
| Scene perimeter | Charcoal terrain shadows dissolve into matching slate material | Scene fog and the atmosphere plate share horizon hue, position, and light direction | Blend the floor perimeter and distant sky separately; avoid uniformly fading the portal/car. The canvas rectangle must not become visible. |
| Hero baseline into directory | Continue sparse mineral texture and one soft terrain shadow | Carry a broad violet ground plane past the baseline; a faint coral reflection ends gradually through the directory heading | Baseline remains a useful fine rule, without a full-width change of background color behind it. |
| Three directory columns | Cool paper-colored headings and low-chroma separators | Pale lavender headings, restrained pink labels; a small amount of directional reflected light in the outer gutter | Columns remain open editorial lists. No cards, glass panels, or glow behind every link. |
| Foundation dispatch | A subtly denser patch of the same graphite surface | A slightly denser indigo surface with a thin warm upper edge | Remove the isolated black-banner appearance. Retain border, logo, headline, and clear click affordance. |
| Video section | Near-monochrome, gently cool thumbnail grade; hover changes clarity/brightness while retaining the grade | Restore authored thumbnail color with a modest shared violet shadow grade; feature can carry more color than the list | Use real loaded images in review. Uniform over-grading would erase meaningful image content. Keep video text on a local dark fade. |
| Footer | Continue the same charcoal substrate; low-chroma sage mark and links | Dim the last reflected color into indigo; one restrained cyan edge accent may echo the scene | A quiet ending within the same world, not another colored block or a second spectacle. |

## Color, typography, and surface contract

Recommendation: define shared semantic values for ground, deep ground, fog, horizon light, reflected light, body text, secondary text, rules, action, and image grading. The scene team owns the sampled lighting values; page styling consumes their approved equivalents. Keep internal world IDs unchanged.

For The Barrens, desaturate all nonessential color, including headings, links, video imagery, buttons, logo presentation, and decorative status indicators. Use a muted sage action color so the portal and downloads remain recognizable without the current vivid green islands. Preserve canonical logo geometry and source artwork; any tonal treatment must be reversible and world-specific. Quattro restores the canonical green. This tonal treatment is a design recommendation for agreement, not an instruction to redraw the mark. If brand color must remain invariant, explicitly accept the logo as the only exception and desaturate the remaining UI.

Retain the current font family and broad size hierarchy. Color cannot be the only source of hierarchy: maintain heading size, spacing, clear labels, and focus outlines. Do not achieve a dark mood by lowering text opacity indiscriminately. Body, metadata, navigation, and link text must remain at least 4.5:1 against their actual rendered surfaces; large headings at least 3:1. Check the brightest atmosphere areas and mixed transition frames, not just flat token swatches. The small footer text deserves a legibility review at native mobile size.

Use fine static mineral/dither texture at very low opacity, shared across worlds. Texture should disappear when viewed from normal reading distance and never create moving noise behind text. Avoid page-wide blur/backdrop-filter and a global grayscale filter: those would grade text, brand, focus, and media together with too little control.

## Smoothness and implementation boundaries

The page atmosphere is a lightweight DOM layer, not a full-page WebGL canvas. Maintain stable geometry and scroll position. Crossfade two complete atmosphere plates with opacity; synchronize color tokens and image grades to the same world-transition progress used by the scene. Do not replace gradient strings at a discrete world-commit event and expect the existing background-color transition to smooth them.

The transition owner should provide a normalized visual mix independently of the committed semantic world. A scene commit and a visual light change have different jobs. Keep final world persistence and accessible button names tied to the established controller. The page can follow the visual mix without changing behavior. Reduced motion applies the destination treatment immediately; no-JS receives a complete static Barrens treatment without requiring the atmosphere asset to load before text appears.

Prefer one desktop and one mobile atmosphere composition per world, with a shared small texture. An initial target is under 200 KB combined compressed decorative assets; final budget follows measured quality. SVG geometry offers sharp, inexpensive shapes but may look diagrammatic; a scene-derived raster offers richer light at an asset cost. Recommend a small plate study before choosing. Do not add animation to every section or scroll-driven parallax; smooth continuity does not require perpetual movement.

## Bounded work and review gates

1. Art/page team creates static full-page desktop and mobile studies of both worlds, using loaded thumbnails. Agree on Barrens brand treatment and the scene/page horizon relationship before implementation.
2. Scene team supplies shared palette samples, atmosphere/floor edge guidance, and final stills. Page team implements one continuous field and world-aware media/surface tokens. Keep content and layout changes limited to what improves legibility.
3. Transition owner connects one visual mix to both renderer and DOM, then validates manual journeys and reduced motion. Page team should not create a second animation clock.
4. Review settled and intermediate screenshots before updating social stills or redeploying this pass.

Visual acceptance captures: full-page 1440 px desktop and 390 px mobile in both worlds; native 1440×900 and 390×844 hero captures; close-ups straddling hero/directory, directory/video, and video/footer boundaries; and journey frames before, during, and after the palette change. Include 320 px mobile for overflow and a keyboard-focus capture in each world.

Pass conditions: The Barrens reads as consistently desaturated even with all thumbnails loaded and hovered. Quattro light has a clear source and carries through the page without repeating the hero illustration. No horizontal background seam or renderer rectangle is visible. The world changes without a color snap, layout shift, lost reading position, or text contrast collapse. Canonical mark proportions, all content and official destinations, portal discoverability, no-autoplay behavior, saved-world restoration, static crawler/no-JS presentation, and reduced-motion operation remain intact.

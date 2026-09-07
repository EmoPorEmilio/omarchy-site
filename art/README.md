# Quattro car source asset

`quattro-car.blend` contains the dedicated `Omarchy_Quattro_Car` scene: an original,
boxy violet coupe inspired by the supplied scene reference. It has no real car
badges. `public/art/quattro-car.glb` contains only the car, without studio lights,
floor, or camera. The Blender source was authored through the installed official
Blender MCP extension in Blender 5.2. The user's original `Scene` was preserved.

Rebuild from the repository root, with the Windows Blender MCP extension running:

```sh
python3 scripts/blender-bridge.py execute_code --code-file scripts/blender/build-quattro-car.py
```

The construction script uses the current workspace's Windows UNC path. If the
repository moves, update its `REPO` constant using `wslpath -w "$PWD"`. It rebuilds
only the named owned scene and exports the asset. The `.blend` is written as a
scene library so exporting does not replace the user's active Blender document.
To produce the beauty image, execute this through the same bridge:

```python
import bpy
scene = bpy.data.scenes['Omarchy_Quattro_Car']
bpy.ops.render.render(write_still=True, scene=scene.name)
result = {'render': scene.render.filepath}
```

## Runtime contract

- Root: `QuattroCar`, origin at wheel-ground contact.
- Blender axes: X width, +Y forward, Z up.
- Exported glTF / Three axes: X width, -Z forward, Y up.
- Whole-asset measured bounds: X ±1.5615, Y 0–1.7005, Z -2.865–2.86.
  Width includes mirrors; body width is approximately 2.74.
- Separate wheel pivots: `wheel_FL`, `wheel_FR`, `wheel_RL`, `wheel_RR`.
  Front pivots: X ±1.34, Y .43, Z -1.77; rear Z +1.78.
  Spin wheels around local X. Tire radius is .43.
- Rear lamps face +Z (center Z +2.725); headlights face -Z (center Z -2.732).
- Place the root directly at road surface height. Do not add the old procedural
  car's vertical placement offset to this ground-origin asset.
- Portable metallic/roughness PBR materials. The only glTF extension is
  `KHR_materials_emissive_strength`, for lamps. No image textures are required.
- Current export: 59 mesh primitives, 7,116 triangles, approximately 496 KiB.
  Primitive count includes wheel parts and deliberate trim. These are measured
  characteristics, not a guaranteed frame-time budget.

`output/blender/quattro-car-beauty.png` was rendered and visually inspected.
Its rear three-quarter silhouette, sloped cabin, spoiler, red rear lamps, wheel
openings, and violet body are legible. Runtime scale, road contact and lighting
were also inspected in `output/playwright/pitch-quattro-final.png`.

The export's node transforms and accessor bounds were checked independently.
The asset contains no camera, studio floor, or lights. Minimum Y differs from
zero only by floating-point noise (less than 0.000001).

## Homepage exports

`public/art/bleak.webp` and `quattro.webp` are 951×732 RGBA exports of the actual
settled postprocessed scene. They contain no CSS background or DOM controls.
The September 6 continuous-world exports use the development-only
`host.captureWorldPng()` hook with `?capture=1&world=bleak` / `quattro` at a
1440×900 viewport. WebGL2 on Linux retains the full-quality bevels, shadows,
and ambient occlusion. The hook reads the canvas immediately after a fresh draw;
its 950×732 buffer is resampled to the existing 951×732 fallback contract.
Both images have an alpha range of 0–255 and fully transparent empty corners.
Their edges and bloom were checked over a pale background, with no background
color-keying. The page atmosphere now shows through both live and fallback scenes.

The component maps its portal control to each image and accounts for
`object-fit: contain` letterboxing. If their framing or dimensions change, update
`STILL_PORTALS` in `src/components/WorldCanvas.tsx` together with the exports.

`public/art/pitch-social.jpg` is a 1200×630 crop of the verified Quattro hero,
composed from the same transparent scene export over the continuous page
atmosphere. Its source is `output/playwright/final-quattro-social.png`
at 1440×900, with the approved larger desktop scene, aligned right art edge,
and aligned sunset, without the world counter or tagline. The portal control is hidden; the crop excludes the header
and baseline (source rectangle 0,74–1440,830).
Set `VITE_SITE_URL` to the intended public preview origin before building so
social metadata can use an absolute image URL.

## Continuous atmosphere assets

`public/art/atmosphere/` contains original, compact SVG artwork derived from the
scene's stepped terrain language. `bleak-terraces.svg` and `quattro-ridges.svg`
provide three connected contours for the hero-to-directory transition.
`bleak-depth.svg` and `quattro-reflection.svg` are quieter lower-page edge shapes.
All four use a 1600×1000 viewBox with transparent reading space on the left.
Their gradient fills and restrained lit edges require no SVG filters.

`grain.svg` is a deterministic 128×128 tile of faint monochrome one-pixel marks,
combined into six paths. It is static and intended to repeat at low opacity.
The complete atmospheric SVG set is approximately 11 KB before compression.
Placement, world crossfading, and responsive cropping belong to the page styles;
these assets do not add lights, geometry, or a rendering loop.

# Model Stage

A dark-themed, browser-based **STEP (`.step` / `.stp`) CAD model viewer** with an
orthographic camera, live material/scene controls, and image + video export.

Everything runs client-side — STEP files are parsed in the browser via
[occt-import-js](https://github.com/kovacsv/occt-import-js) (OpenCascade compiled
to WebAssembly) and rendered with [three.js](https://threejs.org/) /
[React Three Fiber](https://r3f.docs.pmnd.rs/).

## Features

- **Orthographic view** by default, with a one-click toggle to perspective.
- **View controls** — orbit / zoom / pan, isometric + 6 axis-aligned view presets,
  fit-to-view, reset, orthographic ⇄ perspective (with an adjustable field of
  view), and manual camera pose (distance / height / orbit angle, two-way bound
  to the live camera).
- **Part selection** — click a part in the view (or pick it from the Parts list)
  to focus it; the other parts fade back so the selection reads clearly.
- **Edit the model** — hide/remove individual parts, and recolor + tweak the
  material (metalness / roughness / opacity) of each part, then export the result.
- **Material & color controls**: a visual color picker (gradient + hue + hex input
  + preset swatches), custom color or original CAD colors, metalness, roughness,
  opacity, wireframe, flat shading, and edge highlighting.
- **Scene controls**: solid or gradient background, environment intensity,
  ambient + key light, ground grid, and contact shadows.
- **Assembly controls**: an explode slider and auto-rotate (turntable) with
  adjustable speed.
- **PNG export** of the current view, with an optional **transparent background**
  and 1× / 2× / 4× supersampling.
- **360° video export** — renders a turntable rotation using the current
  background (solid or gradient) and grid, in real time (MP4 or WebM depending on
  browser support), with a **Full 360°** toggle (rotation speed derived from the
  clip duration), adjustable duration, frame rate, and direction. An optional
  **transparent background** exports a WebM with an alpha channel (background +
  grid/shadow dropped) — the only MediaRecorder format that carries alpha.
- **GLB / USDZ export** — download the edited model (removed parts excluded,
  per-part colors + materials baked in) as binary glTF (`.glb`) or `.usdz` for
  iOS/macOS AR Quick Look. These are tessellated meshes.
- **STEP export** (STEP files only) — re-exports the *original* parametric CAD
  geometry with removed parts dropped, using the full OpenCascade engine
  (`opencascade.js`, loaded on demand). Visible parts are matched to the source
  solids by geometry, so the output keeps exact B-rep surfaces — not a mesh.
  Colors/PBR materials aren't stored (STEP has no such concept).
- **Drag & drop** a `.step` / `.stp` (parsed via occt-import-js), `.usdz`
  (parsed via three's USDZ loader), `.fbx` (parsed via three's FBX loader), or
  `.dwg` (read via libredwg WASM → DXF, mesh entities extracted) file onto the
  canvas to load your own model. DWG support covers polygonal geometry
  (polyface/polygon meshes, 3DFACEs, SubD meshes); DWG 3D *solids* are ACIS and
  can't be tessellated in-browser.

The UI is built with [shadcn/ui](https://ui.shadcn.com/) (Base UI primitives) on a
dark theme, with a [react-colorful](https://github.com/omgovich/react-colorful)
color picker.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000. A sample assembly loads automatically; use
**Open STEP** in the toolbar (or drag a file onto the canvas) to view your own.

```bash
npm run build   # production build
npm run start   # serve the production build
```

## How it works

| Concern | Where |
| --- | --- |
| STEP → meshes (WASM) | `lib/occt.ts` |
| Shared viewer state / imperative handles | `lib/store.ts` (zustand) |
| Camera framing (ortho + perspective) | `lib/camera.ts` |
| Scene (camera, lights, env, grid, shadows) | `components/viewer/Scene.tsx` |
| Geometry, materials, edges, explode | `components/viewer/Model.tsx` |
| Export + view handles (PNG / 360 video) | `components/viewer/SceneController.tsx` |
| Settings store (zustand) | `components/viewer/settings.ts` |
| Controls panel + color picker | `components/viewer/{ControlsPanel,ColorPicker}.tsx` |
| Toolbar / export dialog | `components/viewer/{Toolbar,ExportDialog}.tsx` |

The occt-import-js engine (`occt-import-js.js` + `.wasm`) is copied from
`node_modules` into `public/occt` by `scripts/copy-occt.mjs`, which runs
automatically before `dev` and `build`.

## Notes

- STEP parsing runs on the main thread; very large assemblies will briefly show a
  loading overlay while the WASM engine processes the file.
- Video is captured from the live canvas with `MediaRecorder`; the container is
  MP4 where supported (Safari, recent Chromium) and WebM elsewhere.
- Metallic reflections use a procedural studio environment (no external HDR fetch),
  so the viewer works fully offline.

# Illustrated 2.5D runtime pass

Historical first pass. Layered faces, limbs and saved growth are now implemented
in [layered-2-5d.md](layered-2-5d.md); the limitations below describe this earlier
full-body renderer, which remains only as a missing-texture fallback.

2026-10-02: all eleven species now use generated transparent painted atlases in
`client/public/assets/companions/illustrated-v1/`. Each contains eight poses:
base, resting base, nature compact/agile, celestial compact/agile, adventurer
compact/agile. The approved species concept PNGs were supplied as references.
This replaces the old vector body in CompanionAvatar and the 66-form art review.

## Rendering and save compatibility

- React SVG image viewports display the original PNG textures without repainting
  or flattening them. Authored alpha-measured frames prevent grid clipping.
- The character is fitted into the existing 512×512 canvas at baseline y=448.
- Exact validated-by-client saved ID/species/style/body/version selects a form.
  Unknown or mismatched IDs display the species base; level never rolls artwork.
- Age remains separate: scale and species cadence still use ageArtStages.
- Existing species travel bob/hop/waddle/float, breathing, care reaction and
  reveal transforms remain. Animation-off and reduced motion stop motion.
- Resting base artwork is available. Evolved forms retain their saved body while
  resting; their closed-eye variants are not yet authored.
- Saved parts, detail IDs and precursor records are untouched. Saved details
  remain hidden as requested; precursor decoration is not drawn in this pass.

## Deliberate limits and release gates

The user-requested ui-animation skill (mblode/agent-skills) informed the motion
refinement: short care feedback, decaying shakes, explicit viewBox ground pivots,
transform/opacity-only animated properties, and off-screen/hidden-tab pause with
observer/event cleanup. Static palette filters are never animated.

These are full-body illustrated cutouts, not skeletal rigs or 3D meshes. No
Spine license, Pixi canvas, or per-avatar WebGL context is required. Walking
transforms do not articulate legs. Custom recoloring, faces, silhouettes,
wardrobe overlays, earned attachment overlays, and age-specific painted details
need layered illustrations with individually authored sockets. Existing saved
preferences are preserved, and unsupported visual controls are disabled with
an explanation rather than silently pretending to update the painted art.

The SVG export bundle remains historical and unvalidated. PNG texture frames
are NOT socket manifests and must NOT be supplied to the server SVG rig
validator or marked eligible for server RNG. No server pool, migration,
capability, chapter, or rendererVersion contract changed.

Client typecheck and production build are the checks for this pass. No automated
tests were run, per the user's preference. Review all portraits at small sizes
and approve layered rigs before claiming full wardrobe/anatomy animation.

## Generation provenance

Tool: imagegen, transparent_background=true. One generation per species using
that species' approved concept as its sole image reference. Source generated
PNGs are retained unchanged; copies are bundled at the versioned public paths.

The prompt below is prefixed with `Species: <species>.` for each generation:

Use-case: production illustrated 2.5D companion texture atlas for a React game, NOT a moodboard. Reference image 1 is the approved character/style reference, not an edit target. Preserve its exact species identity, palette, expressive silhouette, and six different evolution designs. Render with richer soft dimensional shading, gentle painted texture, warm cocoa outlines, matte storybook finish. No 3D plastic look.
Output: genuinely transparent PNG, portrait canvas with EXACT TWO EQUAL COLUMNS and FOUR EQUAL ROWS (8 rectangular cells), no text, no grid, no ground shadows, no backgrounds, no floating standalone particles.
Each full-body character must fit ENTIRELY within its own cell with generous 10% transparent margin on all sides, centered horizontally. Feet bottom at 87.5% of cell height. No part may cross a cell boundary. All cells have identical dimensions.
Cell order reading left to right:
row 1: base ordinary species; base ordinary species sleeping with closed eyes.
row 2: nature compact; nature agile.
row 3: celestial compact; celestial agile.
row 4: adventurer compact; adventurer agile.
Compact forms squat and rounded; agile forms visibly taller and slender. Do not turn agile into same compact silhouette. Retain reference's species-specific nature/celestial/adventurer features, including robot mechanical construction. Full body including ears, horns, tails and feet visible. View slightly three-quarter with face looking at viewer. Consistent painted volume and soft top-left lighting. Precisely eight individual characters, zero labels.

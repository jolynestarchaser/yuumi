# Layered illustrated companion runtime

2026-10-02. This pass supersedes the full-body motion and hidden saved-growth
limitations in illustrated-2-5d.md. All 11 species have seven torso/head cells:
base plus nature/celestial/adventurer × compact/agile (66 evolved bodies).
Original generated PNGs are retained; runtime SVG viewports sample their alpha
textures without rewriting or flattening the source images.

## Implementation

- layeredPetCatalog.ts authors measured frame bounds, actual atlas dimensions,
  and face landmarks for every body. Layouts are not assumed to be equal grids.
- LayeredPetParts.tsx composes independent eyes, closed/open/round mouths,
  front/hind limbs, tails and earned attachments. Robot mouths use simple display
  geometry because its generated atlas omitted the open/round mouth cells.
- Legs pivot independently with species cadence: alternating steps, paired hops,
  waddles, mechanical march or gentle hovering. Whole-body motion is secondary.
  This is a cutout joint rig, not 3D, skin deformation, IK or a side-view walk sheet.
- Happy/care success selects crescent eyes; sleeping selects closed eyes on every
  body. Soft smile, happy and sleepy expression controls are available again.
  Other legacy face preferences are preserved but have no bespoke cutouts yet.
- audioPlayer publishes the exact synthesized syllable timing and companion ID.
  Only that companion's mouths follow its chirps and return to a smile afterward.
  Stop, interruption and unmount clear playback/timers. This is creature-chirp
  synchronization, not phoneme lip-sync for text-to-speech or arbitrary speech.
- Feeding briefly compresses the mouth; cuddling squeezes happy eyes. Existing
  care and level-up feedback remains finite. Motion uses transform/opacity only.
- Animation-off and reduced motion preserve a static face. Hidden/off-screen
  SVG animation pauses, and visibility observers/listeners clean up on unmount.
- A failed layered texture falls back to the previous complete illustration.

## Growth and save compatibility

The client never rolls a form or infers a growth unlock from XP. Exact saved
species/bodyForm selects the torso; saved part steps select attachment size.
Known detail IDs add small coherent growth to tails, crests and style attachments:
IDs 1–3 tail, 4–6 crest, 7–9 nature frill/celestial sensor or horn/adventurer wing.
Each distinct ID within a committed/precursor record contributes independently
of shuffled order. Incoming precursor additions can grow an already mature part.
At a chapter endpoint the server's committed body and IDs replace the precursor;
attachments are recomposed for the new body rather than accumulated forever.
Unknown or mismatched IDs are ignored. Saved fields are never changed by art.

Age remains independent: its existing proportions and cadence apply around the
512×512 canvas's ground baseline y=448. Level changes do not make a pet younger.
Early part previews cover levels 1–10; later progress previews cover saved steps
1–9 of a ten-level chapter. No level cap or server evolution rule was added.

These PNG texture compositions are NOT validated server SVG exports. The
historical SVG manifest stays unvalidated, and server selection eligibility is
unchanged. The client supports saved forms but this pass does not unlock a missing
late-chapter server content pool. Wardrobe overlays, arbitrary recoloring and
custom body shapes remain unsupported; saved preferences are retained.

## Review

companion-review.html?art=1 exposes species/style/body, age, level, expression,
animation, precursor step and per-card voice controls without writing saves.
The ui-animation skill informed explicit SVG pivots, finite reaction timing,
transform-only motion, reduced-motion behavior and lifecycle cleanup.
Automated tests were intentionally not run, following the user's preference.
Client typecheck and production build passed (existing large-chunk warning).
Manual review covered all species in compact nature and agile nature/celestial/
adventurer views, including small elder sleeping faces. A greeting triggered
only its target card's open mouth; the ten other cards stayed silent/smiling.
Remaining compact styles and precursor growth were checked in the same review.

## Generated sources

Imagegen with transparent_background=true; each species' illustrated-v1 atlas
was supplied as its style reference. Files bundled under
client/public/assets/companions/layered-v1/ are unchanged copies.

cat: C:\Users\Jstarc\.codex\generated_images\01a0fb36-2d76-70b0-b831-eeb231799fbb\exec-c277497c-b579-45e4-9189-f19aafbbca44.png
dog: C:\Users\Jstarc\.codex\generated_images\01a0fb36-2d76-70b0-b831-eeb231799fbb\exec-b8b2d901-ac69-49a0-a6a8-821b972e5dad.png
frog: C:\Users\Jstarc\.codex\generated_images\01a0fb36-2d76-70b0-b831-eeb231799fbb\exec-875cf4c6-8cb5-4c7b-8844-b09163c0a7ba.png
dragon: C:\Users\Jstarc\.codex\generated_images\01a0fb36-2d76-70b0-b831-eeb231799fbb\exec-878a5b33-d42a-4ecf-b303-ef397efd2853.png
duck: C:\Users\Jstarc\.codex\generated_images\01a0fb36-2d76-70b0-b831-eeb231799fbb\exec-d3ade710-b61f-4f18-a74e-ce706357a871.png
spirit: C:\Users\Jstarc\.codex\generated_images\01a0fb36-2d76-70b0-b831-eeb231799fbb\exec-c440a2a7-0302-4dd1-b1c6-186b8dedf937.png
bunny: C:\Users\Jstarc\.codex\generated_images\01a0fb36-2d76-70b0-b831-eeb231799fbb\exec-0ebf2ac8-8ef5-4492-81fc-076c40ba5650.png
fox: C:\Users\Jstarc\.codex\generated_images\01a0fb36-2d76-70b0-b831-eeb231799fbb\exec-f4da6905-421a-4f61-8f7d-51003740e115.png
robot: C:\Users\Jstarc\.codex\generated_images\01a0fb36-2d76-70b0-b831-eeb231799fbb\exec-9c722298-62cc-45e3-bde2-39fdb271a6ca.png
child: C:\Users\Jstarc\.codex\generated_images\01a0fb36-2d76-70b0-b831-eeb231799fbb\exec-4b4123a1-bac4-4b81-827f-9af9b69442cb.png
custom: C:\Users\Jstarc\.codex\generated_images\01a0fb36-2d76-70b0-b831-eeb231799fbb\exec-6d301a43-83b3-4ee9-9928-e865c7f1b2a1.png

## Generation prompt

Use case: stylized-concept.
Asset type: production layered illustrated 2.5D companion rig texture atlas, NOT a concept sheet.
Image 1 is species/style reference only. Preserve the seven designs: ordinary base, nature compact/agile, celestial compact/agile, adventurer compact/agile.
Output genuinely transparent PNG. EXACT 4 columns × 5 rows, 20 separated equal cells, portrait canvas. No labels, grid lines, background, shadows, floating decorations. Keep each element entirely inside its cell with at least 12% empty margin.
Reading order:
0 base torso with head
1 nature compact torso with head
2 nature agile torso with head
3 celestial compact torso with head
4 celestial agile torso with head
5 adventurer compact torso with head
6 adventurer agile torso with head
7 ONE front leg with paw
8 ONE hind leg with paw
9 ONE tail
10 paired neutral open eyes
11 paired happy crescent eyes
12 paired sleeping closed eyes
13 closed smiling mouth
14 open talking mouth
15 small round talking mouth
16 ONE native wing
17 ONE native horn
18 ONE native crest
19 ONE native gill/frill.
CRITICAL all seven torsos: NO eyes, NO mouth, NO legs/feet, NO tail, NO wings, NO horns, NO gills. Leave a clean painted face surface and clean closed underside ready for layering. Keep blush and tiny nose. The seven torsos have distinct reference color/material/accessory styles; agile torsos taller/slender than compact. Head/body FRONT FACING, eyes will be added on top at runtime, no side view. Face center aligned centrally; remove marks only, do NOT draw empty eye holes.
Parts 7-9 and 16-19 are isolated individual complete painted components, not pairs, no connection to a body. Limb drawn vertically with rounded overlapping shoulder root, paw at bottom. All eye/mouth cells contain ONLY the cocoa facial marks with transparent surrounding area, no face/head plate. Soft painted volume and paper texture, warm cocoa outlines, matching reference material and palette. Do not draw full assembled characters, do not bake limbs or facial features into torsos. Mechanical species: torso is a chassis and display with no eyes/mouth, limbs are articulated mechanical legs, tail cable, wing booster fin, horn sensor, crest antenna, gill cooling vent. Exactly 20 cells.

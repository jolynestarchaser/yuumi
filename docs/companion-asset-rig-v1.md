# Companion Asset & Rig Specification v1

> Current status (2026-10-03): superseded implementation details are documented in [the v2 report](companion-rig-v2-report.md). Eleven actual layered candidates now exist. No candidate is production-ready; the production registry is empty. The older flattened Fox neutral shortcut is no longer registered. Historical delivery claims below do not constitute current approval.

## Status and architecture

The runtime contract covers all 11 species. No species has a newly approved articulated rig yet. The registry is deliberately empty: the existing artwork remains the renderer until an artist supplies complete layers and their pivots are reviewed. No artwork was regenerated or changed.

`CompanionAvatar` resolves saved forms and appearance. `IllustratedPet` prefers a registered rig for the exact saved form ID, then the existing layered atlas, then the illustrated atlas. Missing rig images fall back to the layered renderer; missing atlas images retain the existing unavailable placeholder. Invalid registered graphs also fall back. Existing legacy SVG forms and `SoftPet` remain available to their existing callers; they are not replacements for the painted species artwork.

`LayeredPetParts` uses all 11 `layered-v1` atlases. Cells 0–6 are composite bodies, 7–8 reusable limb cutouts, 9 a tail, 10–12 eyes, 13–15 mouths, and 16–19 growth attachments. These are partial texture compositors, not complete anatomical rigs. Most heads, arms, ears, collars, and decorations are still fused into body cells. Robot mouth cells reuse one crop; its existing mouth is drawn separately.

The stage is 512 × 512. The existing body compositor fits each crop within 300 × 330, bottoms the composite at y=408, and puts overlay feet at y=448. Frog body cells include feet, so their shared placement now bottoms at y=448; facial and growth sockets follow that placement. `layeredSockets` derives attachment locations from each authored frame and face landmark. Those sockets are compatibility placements, not measurements of hidden shoulder or hip joints. Flat illustrated crops fit within 432 × 392 and bottom at y=448.

Transform ownership remains:

1. `CompanionRoamer` owns desktop translation with a CSS transform transition. It reads the current position before cancelling travel, so a pause does not jump to the destination.
2. SVG siblings separate the runtime ground shadow from the character.
3. Static groups own lifecycle scale around (256,448) and facing reflection.
4. `pet-art-root` owns the character's state animation.
5. Each rig part separates its default transform from its animated transform, with children inheriting parent motion.

The runtime shadow now centers on (256,448). Airborne movement never translates that ellipse vertically. The frog shadow contracts and fades at the airborne phase. Existing source images may retain baked shading; they remain compatibility artwork.

## New asset requirements

- Export transparent PNG or WebP layers in the existing `client/public/assets/companions/` organization. Keep editable masters outside runtime bundles; preserve the existing PNGs.
- Use a logical 512 × 512 canvas and ground anchor (256,448). Exported crops may have any texture resolution, but their `bounds` place them in stage coordinates.
- Exclude the purple ground oval from every new character layer. Local contact shading inside a foot is acceptable; a ground shadow belongs to the runtime.
- Export complete hidden limb/head/appendage roots with overlap bleed. Cropping visible pixels from a flattened body cannot supply the hidden artwork.
- Use lowercase snake_case anatomical IDs. Left/right refer to the character, not screen position. Reflection belongs to the facing group.
- Author explicit pivots, bounds, rest translation/rotation/scale, draw order, motion multiplier, and phase. Do not copy guessed pivots across species or forms.
- Store `safeBounds` as [x,y,width,height] in stage units. Review the full excursion of every state, every lifecycle scale, and the largest saved growth attachments inside the canvas. Registration is an artist/reviewer decision; the type alone does not prove safe bounds or transparency.
- Supply closed-eye art through `stateSources.sleep`, where eyes are a separate layer. Optional state sources replace the image in the same bounds. Blink uses eye scale; sleep uses a static source. Review static animation-off and reduced-motion poses.
- Register exact saved form IDs, with `base` reserved for the starter. Never infer a new form from XP, reroll a form, or change server progression. Growth attachments must be included or composed in the approved rig before registering a saved form; this first renderer does not migrate the legacy dynamic growth compositor into a new rig.

`companionRig.ts` defines the typed manifest. Each part has `id`, optional `parent`, `source`, optional `stateSources`, `bounds`, `pivot`, `order`, `rest`, optional `motion`, `multiplier`, and `phase` (seconds). Geometry and pivots use the shared stage even for children. Identity default transforms preserve artwork placement; ancestor transforms then compose. Draw order sorts siblings by order, then ID; whole subtrees paint together. Split collars/frills into front/back siblings when interleaving is needed.

The validator rejects duplicate parts, orphaned or cyclic parents, nonfinite geometry, invalid dimensions, incompatible archetypes, and incompatible stage metadata. It cannot inspect image anatomy or measure alpha bounds. Add reviewed manifests to `companionRigs`; the renderer is already connected. Do not register placeholders as production art.

## Motion contract and archetypes

The contract names idle, blink, locomotion, happy, play, eat, sleep, surprised, and growth. Sleep wins over growth, care reactions, and movement. Successful feed/play/rest map to eat/play/sleep; other care reactions map to happy. Error maps to surprised and level-up maps to growth. Blink is an eye channel during idle rather than a replacement for the body state.

The first runtime slice supports idle breathing, blink, locomotion, happy reaction, and sleep for all existing species, with the art limits below. Feed, play, error, and growth keep existing reaction behavior and now expose matching state metadata. Motion off and reduced motion disable animations rather than accelerate them. Document visibility and intersection observation pause SVG motion; lip-sync timers now cancel while the document is hidden and reschedule remaining syllables on return.

| Family | Species | Current implementation |
| --- | --- | --- |
| Upright | bunny, child, custom, duck, robot, spirit | Existing paired overlay limbs and species gait; new manifest supports different part trees and phase/multiplier values. Bunny hops, duck waddles, spirit/custom float, robot steps. |
| Quadruped | cat, dog, fox, dragon | Existing near/far limb compositor retained. Fox limb rotation is gated until four limb identities are resolved; it uses a 2-stage-pixel travel bob. Existing cat/dog/dragon gait remains provisional. |
| Frog | frog | Composite-body squat, launch, airborne, landing, recovery cycle. Duplicate overlay legs are removed because limbs are already painted into the body. This is a conservative whole-body fallback, not an articulated frog jump. |

New rig parts support local leg and appendage transform channels with data-driven phase and amplitude. A segmented robot tail can use a chain of parented parts with different phases. No robot tail segments or floppy bunny ears are registered because those layers do not exist. The current robot tail swish is disabled so the whole cable is not presented as segmented motion.

## Artist handoff by species

The following requirements come from inspecting all 11 atlas sheets. They apply to base and all six authored body forms; provide a separate reviewed placement for forms whose silhouette changes.

| Species | Required layers and occlusion work |
| --- | --- |
| bunny | Separate head and torso; export both complete arms beneath chest fluff, with shoulder roots. Export both ears including roots currently fused to the head, plus a head fill beneath them. Split chest fluff into an overlap layer. Existing leg/tail cutouts can guide shape but need reviewed joint pivots. Ears must have their own phase/follow-through; do not rotate the composite head to imitate floppy ears. |
| fox | Establish anatomical front-left/front-right/hind-left/hind-right in an artist reference. Current two cutouts and front-facing composite do not establish four independent limbs; mirroring them cannot establish anatomy. Supply four complete legs including upper segments hidden behind chest/body, a torso with fused limb marks removed, and masks/front chest fluff that hide roots. Confirm which far-side leg appears through each gap so it cannot read as a fifth leg. Supply separate head, ears, and complete brush tail root. Until then, no independent fox gait. |
| frog | Split front arms from the composite body and supply upper roots hidden beneath the chest. Provide left/right hind thighs and separate hind feet with complete knee/ankle overlap. Remove baked limbs from the replacement body. The existing reusable cutouts do not establish the requested thigh/foot chain. Review squat and landing silhouettes with visible ground contact. |
| robot | Export head, torso, left/right arms, legs/feet, antenna, and tail segments separately. Fill neck/shoulder joints beneath overlaps. Split the cable into root/middle/tip segments with joint overlap and measured pivots; do not rotate the existing entire cable. Keep transparent export: pixel inspection confirms the apparent background in the source preview has alpha 0; it is not an opaque runtime background. Screen eyes/mouth must fit the head screen after head motion. |
| cat | Supply distinct four-leg layers with shoulder/hip roots hidden under fur; remove limb remnants from replacement torso. Separate cheek/chest fluff for near/far masking, head, ears, and complete tail root. Confirm front/hind leg readability at maximum swing. Preserve transparent export and review edge halos on light and dark backgrounds. |
| dog | Supply four complete legs under the chest fur; separate chest fluff as a foreground mask. Separate head, both drooping ears with hidden attachment roots, torso, and tail. Fill the head/neck and ear overlap areas. Preserve transparent export and review edge halos on light and dark backgrounds. |
| child | Export both arms including shoulders behind the leaf collar and side foliage; separate head, torso, legs, tail, collar_back/collar_front, side leaves, and decorative foliage. Reconstruct torso under the arms/collar and preserve the front/back leaf overlap. Re-export transparent layers. |
| custom | Separate head/torso, full arms beneath fluffy masses, legs, left/right ear/fluff masses, tail, and top curl. Fill attachment roots hidden by fluff and split overlapping fluff where the arm must pass behind it. Use small local squash and soft follow-through; no mechanical hinge approximation. |
| dragon | Supply four explicitly identified legs and their hidden shoulder/hip roots, with torso limb remnants removed. Separate head, ears, tail, and front/back horn/frill layers; fill head surfaces beneath the frills. Keep near/far limbs readable during heavier steps. Re-export transparent layers. |
| duck | Separate head/neck from torso with complete overlap at the neck joint; both wings need complete shoulder roots and a torso fill beneath them. Supply left/right legs, tail, and optional independent beak. Existing leg crops include fluffy upper sections and require joint review. Re-export transparent layers. |
| spirit | Supply arms with roots hidden beneath body/collar, separate head/torso, legs, leaf ears, collar_back/collar_front, tail, and top sprout. Fill ear/collar overlap on the head and shoulder area. Leaves/sprout require independent motion channels rather than moving the whole head. |

## Verification and remaining risks

### Implemented fox vertical slice

`client/public/assets/companions/rig-v1/fox/base/` contains the first registered articulated asset: reconstructed body, chest fluff, four anatomical legs, head, ears, tail, open eyes, sleep eyes, and an extracted mouth. `foxRig.ts` is its type-checked runtime manifest. Left/right names use the fox's anatomy, not the viewer's screen side. The neutral composite is saved at `outputs/companion-rigs/fox/comparison.jpg`; generated masters, placement metadata, and provenance remain beside it. All original fox atlas files remain untouched.

The base form is the only registered form. Nature, celestial, and adventurer forms retain the layered-atlas fallback, because their different decorations and silhouette need separate reconstruction and neutral-pose review. The runtime has no generic fox-leg override for the registered base rig; it continues to suppress ambiguous legacy fox leg motion only for its fallback atlas.

Use `npm run dev` in `client`, then open `/companion-rig-preview.html`. This development-only page imports the production renderer and adds local controls for locomotion, pause/resume, reaction state, and motion off. It performs no API or progression writes. Vite's production entry remains the application `index.html`.

Added tests cover all species-family assignments, sleep/reaction priority, invalid rig graphs/geometry, nested transforms, explicit pivots, and sleep image selection. `test:pet-art` and the main test command include the new suite.

Verification results are recorded in the companion implementation report. Remaining release gates are artist-approved layers/pivots, actual reduced-motion device testing, hidden-tab/return testing, and authenticated roamer integration testing. The review page checks the renderer and a separate travel wrapper; it does not replace a real roamer test. Existing near/far limb placement is an approximation, and new rig manifests must resolve it rather than copy it. Safe bounds, foot contact, and high-growth attachment clipping require visual review of each delivered form.

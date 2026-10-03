# Companion layered rig v2 — candid readiness report

Current status: the [2026-10-03 neutral fidelity pass](companion-neutral-fidelity-report.md) supersedes the neutral measurements and defects below. All eleven neutral overlays were visually reviewed; the production registry remains empty pending motion approval. The following report records the earlier generation pass.

## Result

The asset-generation and review pass produced **11 layered candidates**, 99 independent anatomical layers plus 11 sleep-head variants (110 runtime PNG files), and 11 rig manifests. **Zero species are production-ready.** All eleven remain on the existing original-art fallback. Original atlases were not overwritten.

The previous Fox implementation hid a complete neutral image during locomotion. It was removed from production registration and replaced with an anatomical review candidate. No v2 rig uses an original full character as a runtime sprite, or blank layers to fake articulation. Neutral/reference/state composites are review exports only.

Fox received an additional fidelity pass: original visible surfaces were extracted into head, chest, body, brush tail and four leg regions; generated hidden artwork is retained beneath occluding surfaces. Its silhouette IoU is 1.0 at neutral, but the motion stress review fails because cuts and a sleep neck seam are visible. A silhouette match alone does not prove motion readiness.

## Runtime parts and neutral measurements

Every candidate uses canvas 512×512, ground anchor (256,448), runtime shadow ownership, explicit pivots/rest transforms/z-order and hierarchy. Every head has a separate closed-eye sleep source. These candidates render idle, locomotion, happy and sleep through the shared renderer/CSS; rendering support is not art approval.

IoU measures thresholded alpha intersection over union against the original at the same stage scale. Ground error is measured against y=448. Color, face, joint and foot-contact review remain separate gates.

| Species | Exact runtime layer IDs | Neutral silhouette IoU | Ground error px | Status |
|---|---|---:|---:|---|
| fox | `tail`, `hind_leg_r`, `hind_leg_l`, `body`, `front_leg_r`, `front_leg_l`, `chest_fluff`, `head`; `head_sleep` | 1 | 0 | Candidate |
| bunny | `ear_r`, `ear_l`, `tail`, `foot_r`, `foot_l`, `body`, `arm_r`, `arm_l`, `chest_fluff`, `head`; `head_sleep` | 0.9196 | 0 | Candidate |
| robot | `leg_r`, `leg_l`, `arm_r`, `arm_l`, `body`, `neck`, `antenna`, `head`; `head_sleep` | 0.8782 | 0 | Candidate |
| frog | `thigh_r`, `foot_r`, `thigh_l`, `foot_l`, `body`, `arm_r`, `arm_l`, `head`; `head_sleep` | 0.925 | 0 | Candidate |
| cat | `tail`, `hind_leg_r`, `hind_leg_l`, `body`, `front_leg_r`, `front_leg_l`, `chest_fluff`, `head`; `head_sleep` | 0.8588 | 0 | Candidate |
| dog | `tail`, `hind_leg_r`, `hind_leg_l`, `body`, `front_leg_r`, `front_leg_l`, `chest_fluff`, `head`; `head_sleep` | 0.8323 | 0 | Candidate |
| dragon | `tail`, `hind_leg_r`, `hind_leg_l`, `body`, `front_leg_r`, `front_leg_l`, `chest_fluff`, `head`; `head_sleep` | 0.8081 | 0 | Candidate |
| duck | `tail`, `leg_r`, `leg_l`, `body`, `wing_r`, `wing_l`, `chest_fluff`, `head`; `head_sleep` | 0.8334 | 0 | Candidate |
| spirit | `tail`, `ear_r`, `ear_l`, `leg_r`, `leg_l`, `body`, `arm_r`, `arm_l`, `collar_front`, `head`, `sprout`; `head_sleep` | 0.844 | 0 | Candidate |
| child | `tail`, `ear_r`, `ear_l`, `leg_r`, `leg_l`, `body`, `arm_r`, `arm_l`, `collar_front`, `head`, `side_leaf_r`, `side_leaf_l`; `head_sleep` | 0.7485 | 0 | Candidate |
| custom | `tail`, `ear_r`, `ear_l`, `leg_r`, `leg_l`, `body`, `arm_r`, `arm_l`, `collar_front`, `head`; `head_sleep` | 0.851 | 0 | Candidate |

## Files changed in this pass

- `scripts/assemble-companion-rigs-v2.py`: reproducible extraction, alpha-island cleanup, hierarchy-aware neutral assembly, state/joint-stress exports, silhouette diagnostics and generated TypeScript catalog.
- `outputs/companion-rigs/v2/<species>/`: generated masters, three repair sheets, placement configs, provenance and comparison/state exports.
- `client/public/assets/companions/rig-v2/<species>/base/`: 110 actual layer textures and 11 manifests.
- `client/src/components/companion/rigCandidates.generated.ts`: typed review catalog, generated from the manifests.
- `client/src/components/companion/foxRig.ts`: exports the actual v2 anatomical candidate instead of the flattened v1 neutral shortcut.
- `client/src/components/companion/companionRig.ts`: production registry kept empty until a candidate passes review.
- `client/src/components/companion/companionRig.test.ts`: registration/fallback gate, actual Fox leg/head checks, all-candidate graph/file/state checks.
- `client/src/components/companion/illustrated-pet.css`: independent frog limb motion and happy appendage motion.
- `client/scripts/candidateRigReview.tsx`, `client/companion-rig-preview.html`: 11-species Original/Rig Composite/Overlay/Difference review, opacity slider, four states, motion switch, neutral reset, layer/pivot disclosure and ground guide.
- `client/tsconfig.json`: includes the active review entry in typechecking.
- This report and status notices in the older v1 documents.

Other pre-existing worktree changes were preserved. No commit or deployment was performed.

## Tests and review

- `npm run typecheck` (client): passed, including the active review entry.
- `node --import tsx --test src/components/companion/companionRig.test.ts`: eight tests passed. The sandbox blocked Windows user-info lookup; the approved outside-sandbox run passed.
- `python scripts/assemble-companion-rigs-v2.py`: all eleven candidates assembled; neutral, overlay, four state samples and opposite gait samples exported. Every neutral composite reaches y=448.
- `git diff --check`: passed.
- Browser: all eleven candidates loaded on the review page; Fox locomotion and global sleep controls were exercised. The visible motion frames identified Fox's edge/neck defects. Full real-roamer and all-species maximum-motion approval remain incomplete.
- `npm run build` (client): passed. Vite reports the existing large-chunk warning.
- `npm run test:pet-art`: all 19 tests passed.
- Runtime alpha inspection: exactly 110 v2 PNGs; all have transparent pixels (alpha minimum 0).
- The full application test suite was not rerun in this pass; the earlier report records its unrelated i18n failure.

The state sample images are geometric joint-stress snapshots, not exact CSS-timing recordings. The maximum-motion bounds, actual foot contact and reduced-motion/hidden-tab behavior require further browser review. Saved evolved forms still use their original fallback; the generated manifests cover base only.

## Exact file inventory and remaining defects

### fox

Runtime: `client/public/assets/companions/rig-v2/fox/base/`

- `tail.png`
- `hind_leg_r.png`
- `hind_leg_l.png`
- `body.png`
- `front_leg_r.png`
- `front_leg_l.png`
- `chest_fluff.png`
- `head.png`
- `head_sleep.png`
- `rig.json`

Review: `outputs/companion-rigs/v2/fox/` contains `master.png`, `assembly.json`, `neutral.png`, `original.png`, `overlay.png`, `comparison.jpg`, `states.jpg`, `locomotion-opposite.png`, and `validation.json`.

Remaining: Neutral silhouette passes; locomotion exposes cut edges and small detached pixels; tail rotation exposes a cut at its base; sleep head has a neck seam. Needs deeper continuous joint bleed and a sleep face that preserves the exact head contour.

### bunny

Runtime: `client/public/assets/companions/rig-v2/bunny/base/`

- `ear_r.png`
- `ear_l.png`
- `tail.png`
- `foot_r.png`
- `foot_l.png`
- `body.png`
- `arm_r.png`
- `arm_l.png`
- `chest_fluff.png`
- `head.png`
- `head_sleep.png`
- `rig.json`

Review: `outputs/companion-rigs/v2/bunny/` contains `master.png`, `assembly.json`, `neutral.png`, `original.png`, `overlay.png`, `comparison.jpg`, `states.jpg`, `locomotion-opposite.png`, and `validation.json`.

Remaining: Silhouette close, but eye/face proportions, ear contours, arm position and chest/body proportions drift. Independent ears, arms and feet exist; pivots and maximum-hop occlusion need correction.

### robot

Runtime: `client/public/assets/companions/rig-v2/robot/base/`

- `leg_r.png`
- `leg_l.png`
- `arm_r.png`
- `arm_l.png`
- `body.png`
- `neck.png`
- `antenna.png`
- `head.png`
- `head_sleep.png`
- `rig.json`

Review: `outputs/companion-rigs/v2/robot/` contains `master.png`, `assembly.json`, `neutral.png`, `original.png`, `overlay.png`, `comparison.jpg`, `states.jpg`, `locomotion-opposite.png`, and `validation.json`.

Remaining: Head, core, claw and torso proportions differ; limbs remain single-segment assemblies, not independent shoulder/elbow chains. Foot-contact and neck overlap need motion review.

### frog

Runtime: `client/public/assets/companions/rig-v2/frog/base/`

- `thigh_r.png`
- `foot_r.png`
- `thigh_l.png`
- `foot_l.png`
- `body.png`
- `arm_r.png`
- `arm_l.png`
- `head.png`
- `head_sleep.png`
- `rig.json`

Review: `outputs/companion-rigs/v2/frog/` contains `master.png`, `assembly.json`, `neutral.png`, `original.png`, `overlay.png`, `comparison.jpg`, `states.jpg`, `locomotion-opposite.png`, and `validation.json`.

Remaining: Head/body join reads as a separate cap; thigh/front-arm contours differ. Dedicated thigh-foot hierarchy exists, but squat/launch/landing overlap requires revision.

### cat

Runtime: `client/public/assets/companions/rig-v2/cat/base/`

- `tail.png`
- `hind_leg_r.png`
- `hind_leg_l.png`
- `body.png`
- `front_leg_r.png`
- `front_leg_l.png`
- `chest_fluff.png`
- `head.png`
- `head_sleep.png`
- `rig.json`

Review: `outputs/companion-rigs/v2/cat/` contains `master.png`, `assembly.json`, `neutral.png`, `original.png`, `overlay.png`, `comparison.jpg`, `states.jpg`, `locomotion-opposite.png`, and `validation.json`.

Remaining: Neck/body seams and generated socket outlines remain visible; chest and tail proportions differ. Four independent legs exist.

### dog

Runtime: `client/public/assets/companions/rig-v2/dog/base/`

- `tail.png`
- `hind_leg_r.png`
- `hind_leg_l.png`
- `body.png`
- `front_leg_r.png`
- `front_leg_l.png`
- `chest_fluff.png`
- `head.png`
- `head_sleep.png`
- `rig.json`

Review: `outputs/companion-rigs/v2/dog/` contains `master.png`, `assembly.json`, `neutral.png`, `original.png`, `overlay.png`, `comparison.jpg`, `states.jpg`, `locomotion-opposite.png`, and `validation.json`.

Remaining: Face and ear scale, chest/body proportions and tail attachment differ. Neck gap reduced by torso placement but not yet approved.

### dragon

Runtime: `client/public/assets/companions/rig-v2/dragon/base/`

- `tail.png`
- `hind_leg_r.png`
- `hind_leg_l.png`
- `body.png`
- `front_leg_r.png`
- `front_leg_l.png`
- `chest_fluff.png`
- `head.png`
- `head_sleep.png`
- `rig.json`

Review: `outputs/companion-rigs/v2/dragon/` contains `master.png`, `assembly.json`, `neutral.png`, `original.png`, `overlay.png`, `comparison.jpg`, `states.jpg`, `locomotion-opposite.png`, and `validation.json`.

Remaining: Leg and torso proportions differ; horns and head frills remain fused with head, and dorsal frills with torso. Joint sockets remain visible.

### duck

Runtime: `client/public/assets/companions/rig-v2/duck/base/`

- `tail.png`
- `leg_r.png`
- `leg_l.png`
- `body.png`
- `wing_r.png`
- `wing_l.png`
- `chest_fluff.png`
- `head.png`
- `head_sleep.png`
- `rig.json`

Review: `outputs/companion-rigs/v2/duck/` contains `master.png`, `assembly.json`, `neutral.png`, `original.png`, `overlay.png`, `comparison.jpg`, `states.jpg`, `locomotion-opposite.png`, and `validation.json`.

Remaining: Face/beak proportions differ, chest cover is too separate, and tail placement needs correction. Wings and webbed feet are separate.

### spirit

Runtime: `client/public/assets/companions/rig-v2/spirit/base/`

- `tail.png`
- `ear_r.png`
- `ear_l.png`
- `leg_r.png`
- `leg_l.png`
- `body.png`
- `arm_r.png`
- `arm_l.png`
- `collar_front.png`
- `head.png`
- `sprout.png`
- `head_sleep.png`
- `rig.json`

Review: `outputs/companion-rigs/v2/spirit/` contains `master.png`, `assembly.json`, `neutral.png`, `original.png`, `overlay.png`, `comparison.jpg`, `states.jpg`, `locomotion-opposite.png`, and `validation.json`. Also contains `repair.png`.

Remaining: Head/ear/body proportions and foot proportions differ; sprout and collar are separate. Body reconstruction still needs contour correction.

### child

Runtime: `client/public/assets/companions/rig-v2/child/base/`

- `tail.png`
- `ear_r.png`
- `ear_l.png`
- `leg_r.png`
- `leg_l.png`
- `body.png`
- `arm_r.png`
- `arm_l.png`
- `collar_front.png`
- `head.png`
- `side_leaf_r.png`
- `side_leaf_l.png`
- `head_sleep.png`
- `rig.json`

Review: `outputs/companion-rigs/v2/child/` contains `master.png`, `assembly.json`, `neutral.png`, `original.png`, `overlay.png`, `comparison.jpg`, `states.jpg`, `locomotion-opposite.png`, and `validation.json`. Also contains `repair.png`.

Remaining: Curl, ears, face, arms and feet differ; side foliage placement and torso occlusion need work. Legs reconstructed separately from initial fused-body sheet.

### custom

Runtime: `client/public/assets/companions/rig-v2/custom/base/`

- `tail.png`
- `ear_r.png`
- `ear_l.png`
- `leg_r.png`
- `leg_l.png`
- `body.png`
- `arm_r.png`
- `arm_l.png`
- `collar_front.png`
- `head.png`
- `head_sleep.png`
- `rig.json`

Review: `outputs/companion-rigs/v2/custom/` contains `master.png`, `assembly.json`, `neutral.png`, `original.png`, `overlay.png`, `comparison.jpg`, `states.jpg`, `locomotion-opposite.png`, and `validation.json`. Also contains `repair.png`.

Remaining: Cloud masses, head/body connection and limb proportions differ. Ground corrected; repaired torso and legs need further silhouette work.


## Next required work

Repair Fox motion overlaps and sleep identity before registering it. Then correct Bunny, Robot and Frog's neutral identity and maximum-motion occlusion; continue the remaining species in the user's priority order. Generated socket outlines and cut-plane artifacts must be removed using reconstructed fill and real overlap, not covered with a flattened character image. No candidate is ready merely because a graph test or silhouette metric passes.

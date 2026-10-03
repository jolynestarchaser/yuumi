# Neutral fidelity pass — 2026-10-03

Current status: the subsequent production integration enables all eleven **base** rigs with joint overlap and silhouette-preserving sleep expressions. Saved evolved forms and earned anatomy retain the legacy renderer. See [production rig integration](companion-rig-production-report.md) for the configured motion scope, validation, and remaining risks. The following describes the earlier neutral-only pass.

All eleven neutral candidates were visually compared against the Species Mood Board at canvas 512×512, root scale 1 and ground anchor (256,448). Original, Composite and 50% Overlay were reviewed for every species. The existing rig renderer, animation states, hierarchy and production registry were retained. **No species was promoted to production.**

## What changed

Placement adjustments alone retained generated face and contour drift. The final assets therefore extract the authoritative painted visible surfaces into the corresponding independently articulated parts. Intact generated anatomy remains as underpaint, fitted beneath those surfaces without clipping it to the neutral silhouette. No runtime part contains a flattened complete character.

Robot now reconstructs the compact original head/body ratio and short visible limbs. Spirit reconstructs its compact body and original leaf ears. Child reconstructs the original head, shoulders, foliage and continuous neck. Custom reads as one soft cloud mass. Fox, Cat, Dog and Dragon reconstruct their original torso, ground stance and tail silhouette. All four quadruped legs remain present; a neutral pose may occlude a complete leg. Bunny, Frog and Duck retain their independent anatomical layers while restoring the original contours and face surfaces.

Three foreground torso surfaces, `body_front`, were added to Spirit, Child and Custom. Their generated anatomical underpaint belongs to the existing parent `body`. The complete arms remain below these foreground surfaces. There are now **102 articulated/foreground layer nodes, 11 sleep variants and 113 runtime PNGs**. No new AI artwork was generated during this pass.

The original 110 generated anatomical/sleep crops are independently preserved in `outputs/companion-rigs/v2/<species>/generated-anatomy/`. The prior candidate manifests, textures and comparisons remain in `before-fidelity/`; the master and repair sheets remain intact. `underpaint-fit.json` records complete-underpaint placements. `neutral-review.json` records the visual review against the exact neutral/reference file hashes.

## Neutral comparison

Every final candidate has identical outer alpha bounds and zero ground error relative to the reference. IoU is thresholded alpha intersection/union, not an animation approval score.

| Species | Before IoU | After IoU | Visual review |
| --- | ---: | ---: | --- |
| Fox | 1.0000 | 0.9999 | Close; complete hidden anatomy restored |
| Bunny | 0.9196 | 1.0000 | Source neutral reconstructed |
| Robot | 0.8782 | 0.9966 | Compact source proportions restored |
| Frog | 0.9250 | 1.0000 | Source squat reconstructed |
| Cat | 0.8588 | 0.9990 | Source tail and stance restored |
| Dog | 0.8323 | 0.9995 | Source tail and stance restored |
| Dragon | 0.8081 | 0.9951 | Close; minor underpaint residuals |
| Duck | 0.8334 | 0.9988 | Source compact stance restored |
| Spirit | 0.8440 | 0.9984 | Close; small sprout underpaint tip remains |
| Child | 0.7485 | 1.0000 | Source head, shoulders and neck restored |
| Custom | 0.8510 | 1.0000 | Source soft silhouette reconstructed |

## Files changed

- `scripts/assemble-companion-rigs-v2.py`: authoritative surface assembly, complete underpainting, foreground overlap, preservation exports and true pixel-difference images.
- `scripts/companion-neutral-surfaces.py`: anatomical ownership regions for the mood-board paintings.
- `scripts/fit-companion-neutral.py`: placement exploration and immutable prior-pass snapshots; finalized surface passes are protected from another placement search.
- `scripts/export-neutral-fidelity-review.py`: all-species Original/Composite/50% Overlay/Difference PNG.
- `scripts/tests/test_companion_neutral_fidelity.py`: five fidelity and preservation checks.
- `outputs/companion-rigs/v2/<species>/assembly.json`, preservation/review files, neutral/state/difference/comparison exports.
- `client/public/assets/companions/rig-v2/<species>/base/`: refreshed separate part textures and manifests; three new `body_front.png` files.
- `client/src/components/companion/rigCandidates.generated.ts`: refreshed typed candidate data.
- `client/scripts/candidateRigReview.tsx`: exact Original | Composite | 50% Overlay | Difference controls. Shared rounded source sizing eliminates fractional registration drift; isolated additive half-opacity blending matches the exported overlay. Difference compares both inputs over black, including their premultiplied color.
- `outputs/all-species-rigs.png`, `outputs/companion-neutral-fidelity.png`: refreshed shareable images.
- This report and the current-status notice in the earlier v2 report.

## Validation

- `python scripts/assemble-companion-rigs-v2.py`: eleven complete assemblies and all four state samples exported.
- `python -m unittest discover -s scripts/tests -v`: five passed. This checks reference bounds/ground, unchanged originals, retained parts/hierarchy/motion/state sources, exact preservation of all non-Fox generated crops, and absence of a whole-character runtime cover.
- Client `npm run typecheck`: passed.
- Client `npm run test:pet-art`: nineteen passed. Windows sandbox blocked `tsx` user-info lookup; the approved outside-sandbox run passed.
- Client `npm run build`: passed with the existing large-chunk warning.
- `git diff --check`: passed.
- Browser: all eleven candidates loaded; Original, Composite, fixed 50% Overlay and Difference controls verified. Idle, locomotion, happy and sleep remain selectable. Fox locomotion was visibly exercised. The review was left at neutral overlay.

## Remaining limits

All eleven species remain on the original production fallback. Neutral fidelity is reviewed; maximum motion, foot contact, joint bleed and sleep-head identity are not production-approved. Extracted visible surfaces can expose cut boundaries when independently rotated. The complete generated underpainting helps fill those areas, but requires a separate motion pass. Minor underpaint residuals remain on several species, most visibly Spirit's small sprout tip. Existing evolved forms remain outside this base-form pass. The full unrelated application test suite was not rerun.

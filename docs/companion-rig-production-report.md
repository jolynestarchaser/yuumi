# Companion rig production integration

All eleven base rigs are now registered in the application renderer. Previously,
the production registry was empty, so deploying the candidates changed only the
review artifacts. Creation, species selection and eligible appearance previews
now render the separate rig layers. The original atlases remain the fallback.

Approval covers the **base form and configured animation**, not every evolved
form of a species. Matching saved body forms, earned parts, detail IDs and
precursor progress retain the legacy renderer. The client does not overwrite,
reroll or remove any saved growth. Changing the draft species allows its base
preview because growth belonging to another species is not applied to it.

## Assets and motion

The same 102 nodes, parents, pivots, ground anchor and full generated underpaint
are retained. Source-colour overlap extends beneath neighbouring plates at the
joints. Limb overlap is limited to the socket so it does not copy another foot.
No complete-character image is used as a rig cover.

Sleep preserves the original head texture and adds two local SVG eyelids inside
the head's transform. The 11 generated sleep heads remain archived and referenced
in the rig data for further art work, but enabled base rigs use the local eyelid
expression. This avoids the old oversized replacement heads and neck gaps.

Locomotion alternates independently articulated limbs through four degrees and
lifts a paw one pixel; frog limbs swing six degrees with the existing root hop.
Happy retains the root hop and separate tail/ear/antenna motion. Idle and sleep
retain breathing. Animation-off, offscreen pausing and reduced motion still apply.
All joints and hidden artwork remain available; larger swings require further
skin overlap work before use.

| Species | Exact runtime part IDs |
| --- | --- |
| Fox, Cat, Dog, Dragon | tail, hind_leg_r, hind_leg_l, body, front_leg_r, front_leg_l, chest_fluff, head |
| Bunny | ear_r, ear_l, tail, foot_r, foot_l, body, arm_r, arm_l, chest_fluff, head |
| Robot | leg_r, leg_l, arm_r, arm_l, body, neck, antenna, head |
| Frog | thigh_r, foot_r, thigh_l, foot_l, body, arm_r, arm_l, head |
| Duck | tail, leg_r, leg_l, body, wing_r, wing_l, chest_fluff, head |
| Spirit | tail, ear_r, ear_l, leg_r, leg_l, body, arm_r, arm_l, collar_front, head, sprout, body_front |
| Child | tail, ear_r, ear_l, leg_r, leg_l, body, arm_r, arm_l, collar_front, head, side_leaf_r, side_leaf_l, body_front |
| Custom | tail, ear_r, ear_l, leg_r, leg_l, body, arm_r, arm_l, collar_front, head, body_front |

These are revised extracted/reconstructed surfaces, not newly generated AI art.
The 110 original generated anatomy/sleep crops and prior fidelity snapshots are
unchanged. There are 113 runtime PNG files including preserved sleep variants.

## Review and validation

The review page provides Original, Composite, 50% Overlay, Difference and the
actual production renderer, with idle, locomotion, happy and sleep controls.
Motion can be frozen at a specific elapsed time. Vite now builds this page at
`/companion-rig-preview.html`, so it is available in the production deployment.

All neutral comparisons were visually reviewed against the mood board. Their
alpha bounds match the original and ground error is zero; silhouette IoU ranges
from 0.9951 to 1.0000. Browser inspection confirmed that all eleven base species
render `pet-rig-v1` with 8–13 distinct nodes. The gait uses opposing limb phases,
and sleep retains the original head. Review records store exact asset hashes and
the rig definition hash; regeneration does not update approval records.

Validation run:

- `npm run build --prefix client`: passed, including TypeScript and both HTML entries.
- `npm run test:pet-art --prefix client`: 20 passed, including actual renderer selection, saved form/earned part preservation, sleep and animation-off.
- `python -m unittest scripts/tests/test_companion_neutral_fidelity.py`: 6 passed, including neutral fidelity, original/anatomy preservation, no flattened character layer, and review hashes.
- Browser visual review of neutral comparisons, articulated motion and sleep; production renderer selection verified for all eleven species.

The full application suite was not rerun for this art integration. Vite continues
to report the existing large application chunk warning.

## Files changed and remaining limits

- `client/src/components/companion/companionRig.ts`, `IllustratedPet.tsx`, `CompanionRigParts.tsx`, `RigSleepFace.tsx`, `illustrated-pet.css`, `rigCandidates.generated.ts`, and `companionRig.test.ts`.
- `client/public/assets/companions/rig-v2/<species>/base/`: updated separate PNG surfaces and rig manifests.
- `client/scripts/candidateRigReview.tsx` and `client/vite.config.ts`: production review entry and motion inspection.
- Assembly, source-surface overlap, export and review-record scripts; Python asset validation.
- Updated per-species comparisons, review records, all-species PNG exports and the browser evidence screenshot.

No base species remains on fallback under normal asset loading. **Saved evolved
forms and earned anatomy remain fallback for every species**, pending their own
matching rig assets. A levelled companion may therefore still show its original
artwork after this deployment; switching it to the base would discard visible
growth and is deliberately avoided.

Fine cut edges or colour overlap can still be seen at large review sizes and
with wider swings. The local eyelids use small colour gradients and can show a
slight paint mismatch under magnification. Approval is limited to the configured
compact motion. High-amplitude poses and evolved rigs are not approved.

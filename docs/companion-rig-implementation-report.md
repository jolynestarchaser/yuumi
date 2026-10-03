# Companion animation implementation report

> Current status (2026-10-03): see [the v2 report](companion-rig-v2-report.md) for the latest inventory and readiness failures. Eleven anatomical candidates exist, all remain unapproved, and production retains the existing fallback. The earlier Fox shortcut was removed from production registration.

## Delivered

The shared runtime contract and artist handoff cover all 11 species. Existing art, saved forms, XP rules, and server progression remain in place. Full production articulation is still blocked by missing anatomical layers. The new rig registry contains no production manifests; this avoids presenting guessed joints or duplicated limb art as completed rigs.

The architecture and per-species redraw instructions are in [Asset & Rig Specification v1](companion-asset-rig-v1.md). The renderer keeps the existing world-position wrapper and independent SVG character transforms. New manifests support parent relationships, rest transforms, pivots, deterministic sibling order, state images, motion amplitude, and phase. Invalid manifests or failed rig images use the existing fallback renderer.

## Files changed

| File | Change |
| --- | --- |
| `client/src/components/companion/companionRig.ts` | Typed animation/asset contract, 11-species family mapping, state precedence, manifest validation and exact-form registration. |
| `client/src/components/companion/CompanionRigParts.tsx` | Nested SVG part renderer with independent rest and animation transforms, state-source images, pivots, and draw order. |
| `client/src/components/companion/IllustratedPet.tsx` | Rig integration with fallback, state/archetype metadata, reaction precedence, ground shadow anchor. |
| `client/src/components/companion/CompanionAvatar.tsx` | Pass care reaction and growth context to the renderer. |
| `client/src/components/companion/LayeredPetParts.tsx` | Hidden-document lip-sync cancellation, shared body placement, removal of duplicate frog legs. |
| `client/src/components/companion/layeredPetCatalog.ts` | Shared crop placement; frog painted feet and associated sockets align with y=448. |
| `client/src/components/companion/illustrated-pet.css` | Subtle idle/sleep motion, explicit state priorities, frog jump/shadow phases, conservative fox travel, robot cable gate, new part motion channels. |
| `client/src/components/companion/companionRig.test.ts` | Six targeted tests for family assignments, all frog-form ground anchors, state precedence, graph validation, nested rendering, and exact registration. |
| `client/package.json` | Include rig tests in `test` and `test:pet-art`. |
| `client/companion-rig-preview.html`, `client/scripts/companionRigPreview.tsx` | Development-only renderer review page with local movement/reaction controls. |
| `docs/companion-asset-rig-v1.md` | Asset standard, architecture, registration rules, and concrete redraw requirements for every species. |
| `outputs/companion-rig-review.png` | Browser screenshot of the review surface. |
| `outputs/companion-i18n-test.txt`, `outputs/companion-client-suite.txt` | Diagnostics for the unrelated localization test failure. |

Existing untracked export scripts, review files, and output assets were left in place.

## Species and states

Upright, quadruped, and frog families are declared in the runtime. These families permit different part trees rather than enforcing a common skeleton. Local transform channels are implemented; anatomical production manifests await art.

The vertical slice runs with existing fallback art: bunny retains its hop and separate face/limb textures; fox uses a small travel bob with leg rotation disabled; frog has a dedicated whole-body anticipation/launch/landing cycle and reactive ground shadow; robot retains its step while rigid cable swishing is disabled. Bunny ear follow-through, fox four-leg articulation, frog thigh/foot articulation, and robot segmented cable motion are pending the layers named in the specification. Remaining species retain their existing gait and gain the shared contract and fallback path.

Idle, blink, locomotion, happy/reaction, and sleep run with current artwork. Eat, play, surprised, and growth expose contract states and preserve existing feedback motion. Blink remains an independent eye channel. Registered rigs can provide static sleep eyes through state-specific sources.

All 11 species require additional layers for full articulation. The specification lists the hidden roots, replacement body fills, front/back masks, and separate appendages needed for each. The fox needs four artist-identified legs before independent gait can resume. Pixel inspection confirms every layered atlas is RGBA with transparent background pixels; the painted RGB visible in some source previews is behind alpha 0.

## Verification

| Command | Result |
| --- | --- |
| `npm run typecheck` in client | Passed. Also runs as part of build. |
| `npm run build` in client | Passed. Vite reports the existing large-chunk warning. |
| `npm run test:pet-art` in client | 17 tests passed, including existing art tests and six new rig tests. |
| `npm test` in client | Failed on `English and Thai catalogs have matching keys and interpolation variables` in `src/lib/i18n.test.ts`. Locale catalogs and this test are unchanged by the companion work. |
| Direct isolated `i18n.test.ts` run | Reproduced the catalog mismatch; 1 passed, 1 failed. |
| `git diff --check` | Passed. |
| Pillow RGBA inspection | All 11 atlases have alpha 0 background pixels. No source pixels modified. |

The sandbox initially blocked the tsx loader's Windows user-information call and Vite's configuration directory traversal. Approved runs outside the sandbox completed the build and companion tests. No dependency or animation library was added. The host runs Node 24.20.0; the repository declares Node 22.x, so a Node 22 CI run remains appropriate.

Browser inspection used the production renderer in the development review page:

- Idle and locomotion rendered for all 11 species. Computed styles confirmed the frog-specific jump, no fox limb rotation, and separate SVG shadow ownership.
- Pause removed gait and froze the review world's translation; resume restored movement.
- Happy during travel selected reaction motion and removed the walking class. This check exposed a direct-renderer priority defect, which was corrected and rechecked.
- Sleep selected closed-eye texture and disabled gait for every species.
- Animation off produced zero active SVG animation names.
- Narrow 390 × 844 and desktop 1440 × 900 checks found no horizontal page overflow.
- Frog ground metadata is y=448 and no duplicated overlay limbs remain. Automated placement checks cover all seven body cells.

## Review and release gates

The focused review inspected changed renderer paths, registration identity, transform ownership, cleanup, fallback behavior, and CSS precedence. The discovered reaction priority and frog ground-placement defects were fixed. No further actionable findings remain in this scoped review.

Actual system reduced-motion preference, hidden-tab/return lip-sync, authenticated roamer pause/resume, and high-growth form clipping remain unverified end to end. Available browser capabilities expose viewport control but no motion-preference emulation; opening another in-app tab left `document.hidden` false. Existing CSS reduced-motion rules and visibility observers remain in place, and hidden-document lip-sync now has explicit cleanup. A renderer review page is not evidence of a real hidden-tab transition or authenticated roaming test.

Artist approval is still required for anatomical layer completeness, pivots, foot contact, alpha edges, and maximum-motion bounds on each form. New manifests must include the saved growth appearance before registration. The current compositor's near/far limb sockets remain approximate. No deployment or commit was performed.

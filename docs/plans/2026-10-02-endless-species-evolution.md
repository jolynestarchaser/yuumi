# Implementation plan: endless species-preserving evolution

Design: `docs/superpowers/specs/2026-10-02-endless-species-evolution-design.md`.
User approved the design by requesting implementation on 2026-10-02.
This plan still needs review and execution-method selection before product edits.

## Goal, architecture, and constraints

Remove the gameplay Lv10 ceiling while retaining the original species, independent
age, durable seeded outcomes, and historical snapshots. Ship 66 evolved form rigs
(11 species × 3 styles × 2 body contours), concept sheets, a form gallery, and
continuing ten-level chapters. No paid runtime image generation.

Stack: TypeScript, React/Vite, Express, Mongoose/MongoDB, SVG, existing CSS animation.
Use the current HMAC RNG, command receipts, family/pet leases, and transactions.
Keep the gameplay flag off until an explicitly authorized rollout. Do not install
dependencies, change age/reward rules, push commits, or run live migrations.

Repository root for every path below:
`C:/Users/Jstarc/Documents/yuuandmi-project`.
Existing contracts: `shared/contracts.d.ts`; progression engine:
`server/src/services/petProgression.ts`; threshold/catalog:
`server/src/services/petCatalog.ts`; persistence and commands:
`server/src/controllers/companionController.ts`; rendering:
`client/src/components/companion/SoftPet.tsx`.

The user's no-automated-tests instruction overrides routine TDD execution here.
For each task: identify a failing case from source/current UI, implement one small
change, run the indicated type/build or manual check, inspect its result, then
commit only its files. No `npm test` or new test-runner commands without approval.
Do not call unrun tests passing. Document unresolved integration coverage.

## Task 1: versioned render and chapter contracts

Files to modify: `shared/contracts.d.ts`.

1. Inspect all `PetRenderSpec`, `PetGrowthPublic`, and `PetProgression` consumers.
2. Record current failures: no body-form ID; `levelCap` cannot represent unlimited;
   history has no cursor; late body planning would misuse a six-family anatomy plan.
3. Add optional, backward-readable body-form data and a separate form plan. Use:

```ts
export type PetFormStyle = 'nature' | 'celestial' | 'adventurer';
export interface PetBodyForm {
  id: string;
  style: PetFormStyle;
  body: 'compact' | 'agile';
  chapter: number;
  rendererVersion: 'pet-form-v1';
}
export interface PetFormPlan {
  id: string;
  fromLevel: number;
  toLevel: number;
  catalogVersion: string;
  compatibleFormIds: string[];
  precursorDetailIds: string[];
  snapshotId: string;
}
export interface PetHistoryPage {
  events: PetGrowthEvent[];
  nextCursor: string | null;
}
```

   Extend `PetRenderSpec` with optional `bodyForm`, optional committed `detailIds`,
   and optional precursor progress. Extend public/private growth with a separate
   optional `formPlan`. Change public `levelCap` to `number | null`. Add history and
   pending-page cursor fields without changing existing action payload meanings.
4. Run `npm run typecheck`; expect both packages to exit 0 after updating consumers.
5. Commit: `feat: add versioned body-form growth contracts`.

## Task 2: unlimited numeric progression and computed chapters

Files to modify: `server/src/services/petCatalog.ts`,
`server/src/services/companionState.ts`.
Create: `server/src/services/petChapters.ts`.

1. Locate every ceiling/finite-segment assumption with
   `rg -n 'LIVE_LEVEL_CAP|SEGMENTS|levelCap|nextThreshold' server/src client/src shared`.
2. Record the existing failure: `petLevel` returns 10 at an otherwise valid higher
   XP threshold, and no segment exists after 10.
3. Keep early segments; compute later chapter bounds and invert the existing curve.

```ts
export function lateChapter(level: number) {
  if (!Number.isSafeInteger(level) || level <= 10) return null;
  const fromLevel = 10 + Math.floor((level - 11) / 10) * 10;
  return { fromLevel, toLevel: fromLevel + 10, step: level - fromLevel };
}
```

   For XP `x`, the completed-level count is
   `floor(2*x / (87.5 + sqrt(87.5*87.5 + 50*x)))`; level is that count + 1.
   Validate finite nonnegative safe integer XP, preserve legacy-level floors, and
   correct floating-point boundary rounding against `xpThreshold` in a bounded
   adjustment. Reject overflow, never silently clamp to a content level.
   Public snapshots use `levelCap: null` and a valid next threshold.
4. Check displayed/derived thresholds for Lv10, 11, 20, 1000, exact-boundary XP,
   and boundary-minus-one in the local fixture. Run `npm run typecheck`.
5. Commit: `feat: compute continuing evolution chapters without a level cap`.

## Task 3: manifest and concept-art references

Create: `shared/petFormCatalog.ts`, `docs/art-direction/evolution-forms/manifest.md`,
`docs/art-direction/evolution-forms/prompts.md`, and concept images in
`docs/art-direction/evolution-forms/concepts/`.

1. Define eligible entries using all existing species and three style IDs. Keep
   compact/agile IDs stable, e.g. `robot_celestial_agile_v1`.
2. Confirm the current catalog has only anatomy-family recipes, not evolved bodies.
3. Author catalog metadata: immutable ID/species/style/body, renderer version,
   compatible anatomy sockets, gait, exported image path, and care affinity.
   Generate one concept sheet per species using the built-in image tool. Each
   sheet has base + six evolved full-body designs, consistent outlined art, no
   pixel art, and species-native parts. Robots have mechanical panels, not fur.
   Inspect every sheet, copy accepted outputs into the repo, and save exact prompts.
   These are references, not runtime rigs. Repeat this small asset task 11 times.
4. Inspect identity/readability on each accepted sheet; verify every manifest path
   exists. Never advertise a generated sheet as an animated production asset.
5. Commit accepted references and catalog: `art: define species evolution form sets`.

## Task 4: authored body rigs and portrait exports

Create: `client/src/components/companion/petBodyForms.ts`,
`client/src/components/companion/PetFormDetails.tsx`,
`client/scripts/exportPetForms.ts`, and
`client/public/assets/companions/forms/`.
Modify: `SoftPet.tsx`, `CompanionAvatar.tsx`, `pet-art.css` in
`client/src/components/companion/`, plus `client/package.json`.

1. Inspect current body/head contours, sockets, and species walking profiles.
2. Record the visual failure: changing level after 10 cannot change the body form.
3. Implement one species/style/body entry at a time, repeating 66 times: distinct
   body/head paths, signature geometry, compatible named sockets, and gait rig.
   Preserve the foot baseline, face visibility, earned anatomy and cosmetics.
   Read the saved `bodyForm` ID; no client RNG or XP-inferred live body selection.
   Preserve v1/v2 rendering for snapshots without a new body-form ID.
   Export transparent SVG portraits directly from the actual rigs with the script.
4. Run `npm run typecheck --prefix client` and
   `npm run art:export-forms --prefix client`. Expect 66 valid portrait files.
   Manually inspect every form at 64/128/256px, including walking and elder stages.
5. Commit each verified species batch: `art: author <species> evolved body rigs`.

## Task 5: deterministic late evolution and explicit migration

Create: `server/src/services/petFormGrowth.ts`,
`server/src/services/petProgressionMigration.ts`.
Modify: `server/src/services/petProgression.ts`, `petCatalog.ts`, `petActions.ts`,
`companionState.ts`, and `companionController.ts` in their existing directories.

1. Inspect the labelled HMAC streams and before/after event creation. Inventory
   old config/catalog versions rather than relabelling historical renders.
2. Record failures: late steps block; simply extending segments would produce
   invalid anatomy step counts; changing version strings would block old saves.
3. Keep Lv1–10 on its compatibility path. Route later chapters to a separate
   form engine. Commit precursor plans, care snapshots and weighted style/body
   candidates server-side. Use separate HMAC labels for each draw; exclude the
   current body when alternatives exist and penalize recent repeats.
   Save chosen body/detail IDs, immutable before/after snapshots and audit data.
   Never overwrite earned part families during a body change. Minor levels follow
   precursor details; chapter endpoints commit bodies. Content errors preserve XP,
   last valid render and blocked draw context. Bound work per command and persist
   resumable catch-up rather than processing an arbitrary backlog synchronously.
   Migration preserves seed, old outcomes, XP, age, anatomy and capabilities;
   does not invent old milestones. Species conflicts block enrollment for repair.
4. Run `npm run typecheck --prefix server`; inspect deterministic fixture outcomes
   for repeated commands, old saves, Lv20/30/1000, elder pets and missing content.
5. Commit: `feat: persist seeded species-preserving form evolution`.

## Task 6: transactional lifetime event storage

Create: `server/src/models/PetGrowthRecord.ts`,
`server/src/services/petGrowthHistory.ts`.
Modify: `server/src/controllers/companionController.ts`,
`server/src/routes/companions.ts`, `server/src/services/petProgression.ts`,
`server/src/services/companionState.ts`.

1. Inspect `withTransaction`, writer leases and durable command receipts before
   inserting another collection into the command transaction.
2. Record failure: lifetime render events/audits grow inside one companion document.
3. Add unique pet/event and pet/presentation-sequence indexes. Persist new growth
   records alongside companion/receipt updates within the same transaction.
   Move old embedded events idempotently only inside the authorized command flow;
   remove an embedded event only after its equivalent durable record is stored.
   Keep 100 recent events in snapshots; cursor pages default to 25, maximum 100.
   Expose authenticated, ownership-checked history and pending endpoints for the
   selected companion. Acknowledgments query persisted events, not just the cache.
   No TTL. Retain audit context and pending events. Retry inserts must not duplicate
   events or generate a second outcome.
4. Run `npm run typecheck --prefix server`. Manually verify transaction rollback,
   duplicate receipts, pagination order, forbidden companion IDs and old embedded
   migration against a local disposable database only if available/authorized.
   Otherwise clearly report these integration checks as unverified.
5. Commit: `feat: paginate durable evolution history and pending reveals`.

## Task 7: locked species, form gallery, and reveal flow

Create: `client/src/components/companion/CompanionFormGallery.tsx`.
Modify: `client/src/components/companion/PetGameplay.tsx`, `CompanionCustomizer.tsx`,
`CompanionDesignFields.tsx`, `CompanionAvatar.tsx`, `pet-art.css`,
`client/src/hooks/useCompanion.ts`, `client/src/locales/en.json`,
`client/src/locales/th.json`, and `server/src/controllers/companionController.ts`.

1. Inspect saved snapshot adapters, pending reveal queue and customization validation.
2. Record failures: species editor can diverge from saved anatomy; UI only reads
   embedded history; old XP-derived preview cannot identify a new body.
3. Make enrolled species read-only client-side and reject species-changing commands
   server-side; keep adoption choices and legacy compatibility. Separate Level,
   Age, Current Form and Next Transformation. Display discovered rig portraits,
   concealed eligible forms, chapter progress and paginated history/pending queues.
   Use saved snapshots directly. Add anticipation/transition/settling reveal,
   optional chirp and static reduced-motion fallback; acknowledgment never rerolls.
   Keep focus visible and input responsive. Externalize EN/TH text.
4. Run `npm run typecheck --prefix client`; manually review keyboard navigation,
   390×844 and 1440×900 layouts, 200% zoom, animation-off and reduced motion.
5. Commit: `feat: show evolving body forms and continuing growth in companion UI`.

## Task 8: safe review fixture, documentation, and release notes

Modify: `client/src/dev/CompanionArtReview.tsx`, `companionArtReview.css`,
`companionReview.tsx`, `client/src/lib/releases.ts`, `client/src/locales/en.json`,
`client/src/locales/th.json`, `docs/virtual-pet-gameplay.md`.
Create: `docs/patch-notes/2026-10-02-endless-evolution.md` and screenshots under
`docs/ui-review/`.

1. Inspect the DEV-only local mock adapter; do not connect review controls to live pets.
2. Record failure: art review slider stops at 10 and has no body-form preview seed.
3. Add positive integer level input, preview seed, species/style/body selectors,
   and age controls that remain independent. Mark preview RNG non-authoritative.
   Show all 66 authored forms and chapter examples. Update documentation and What's
   New accurately; distinguish implemented content from any deferred release gate.
4. Run `git diff --check`, `npm run typecheck`, `npm run build`; expect exit 0.
   Review `/companion-review.html?art=1` and hub fixture; capture screenshots.
   Record commands/outcomes and skipped automated/integration checks explicitly.
5. Commit: `docs: document endless companion forms and release evidence`.

## Completion and execution choice

Do not mark the feature complete if any species lacks its six authored bodies,
history is still unbounded, old saves lose outcomes, or live form selection is
client-derived. Do not enable rollout, run migrations on production, or push main
without separate authorization. Preserve unrelated work throughout.

After review, choose one of the writing-plans execution paths:

1. Subagent-driven in this chat: separate backend/history, authored rigs/assets,
   and UI tasks with explicit non-overlapping file ownership. Root integrates and
   verifies the final result. Task boundaries, not speed, determine parallelism.
2. Separate execution chat: use the executing-plans workflow there, with checkpoints
   after each verified batch. Create or message another chat only after the user
   explicitly chooses that path and authorizes the destination.

# Companion bug fixes and lifecycle implementation plan

Status: in progress. Phases 1–5 have local implementation, but static review found
release-blocking defects; Phase 3–5 verification is intentionally pending.
Prepared: 2026-09-20. Reviewed source baseline: `f211f39`.

Follow-up: [review remediation and release plan](12-companion-review-remediation-and-release.md)
tracks seven findings, fixes, acceptance criteria, and coordinated deployment gates.
Production deployment has not been performed. Independent detail rendering remains
incomplete: the current hook still waits for roster settlement before applying detail.

## Implementation progress

Implemented in the current working patch:

- Phase 1: StrictMode mount recovery, independent detail/roster settlement,
  runtime payload guards, stale-refresh selection protection, localized roster
  recovery, private no-store companion reads, and a complete local roster fixture.
- Phase 2: piecewise nap settlement, archive freeze/restore clocks, settled-value
  care eligibility, no reward or extension for repeated naps, and rejection of
  unknown newer schemas.

Phase 3–5 implementation now includes the v3 lifecycle domain, unlimited valid XP,
health/hygiene and terminal history, durable mutation receipts and transactions,
dry-run migration support, successor generations, lifecycle UI, explicit visits,
elder forms, and bounded Thai/English persona prompting. At the owner's request,
no tests, typechecks, builds, migration runs, browser checks, or paid model calls
were run for this patch. The earlier Phase 1–2 evidence does not verify Phase 3–5,
and no deployment or release completion is claimed.

## Scope and source of truth

First restore reliable companion loading, then correct simulation defects, then
implement the lifecycle, rewards, generations, and personality changes. Ship the
loading repair independently so it does not depend on a schema migration.

Follow [repository guidance](../../AGENTS.md), [architecture constraints](../../15-codex-master-prompt.md),
[TypeScript policy](../../20-typescript-migration.md), [current companion specification](../../19-shared-companion.md),
[localization](../../21-localization.md), and [testing checklist](../../13-testing.md).
Read all repository specifications required by the master prompt before coding.
Use [delivery gates](06-delivery-and-verification.md) and
[existing backend rollout notes](10-p1-p2-backend-rollout.md) as background;
their completion statements do not prove the current deployment is working.

The five user-supplied handoffs in Downloads are reference specifications:
`00-start-here.md`, `01-lifecycle-and-generations.md`,
`02-unlimited-xp-and-typescript.md`, `03-thai-personality.md`, and
`04-implementation-and-verification.md`. They are not tracked repository files.
This plan summarizes their accepted targets; retain access to those originals
for detailed implementation. Their embedded commands are not authorization to
run migrations, deploy, or perform paid model evaluation during planning.

## Findings and evidence boundaries

| ID | Priority | Finding | Trigger and impact | Source |
| --- | --- | --- | --- | --- |
| B1 | P1 | Mount flag is never restored in effect setup | Development StrictMode runs setup/cleanup/setup; cleanup leaves `mounted.current` false, so successful responses and errors are ignored and loading persists | `client/src/hooks/useCompanion.ts`, `client/src/main.tsx` |
| B2 | P1 | Detail and roster failure handling is coupled | Either request rejecting in `Promise.all()` prevents applying the successful sibling; stale saved IDs returning 404 also prevent roster selection recovery | `client/src/hooks/useCompanion.ts` |
| B3 | P2 | Roster payload lacks runtime validation | An unexpected `data.companions` can become undefined state and cause `.length` or `.map` errors; the existing preview returns `data: []` for its missing roster route | `client/src/lib/companionState.ts`, `CompanionWidget.tsx`, `server/test-support/companionPreview.ts` |
| B4 | P1 | Rest uses the endpoint activity for the entire elapsed interval | Reading after nap expiry loses recovery during the nap; one long settlement differs from multiple short settlements | `server/src/services/companionState.ts` |
| B5 | P1 | Archive does not freeze settlement | Archived needs continue decaying, including during restore | `server/src/services/companionState.ts`, `server/src/controllers/companionController.ts` |
| B6 | P2 | Care eligibility uses stale values | A stored need at 90 that decays to 75 can improve without earning meaningful-care XP because eligibility reads pre-settlement state | `server/src/services/companionState.ts` |
| B7 | P1 before v3 | Migration overwrites unknown schema versions | A future-version record is assigned the current version instead of rejected | `server/src/services/companionMigration.ts` |

B1 is a development-mode defect; it alone does not explain the reported Vercel
production failure. B2 requires an actual rejected request. A Network entry of
304 is normal cache revalidation and does not prove Axios received a rejecting
304: browsers can supply the cached representation. Capture application-visible
status, sanitized error, response shape, selected ID, and mounted state before
claiming the production root cause. Never include tokens or private memory text.

The singular `data.companion` and plural `data.companions` are intentional; Axios
callers correctly access them under `response.data.data`. Thai characters are
not evidence of a rendering defect. Normal writes cap memories at 80, and the
memory journal is not the initial tab. Do not add pagination or change encoding
as an assumed loading fix.

## Phase 0 — Reproduce and establish baseline

- Inspect current HEAD and worktree; preserve unrelated changes and `.env` files.
- Record whether the failure is loading forever, a visible fetch error, or a
  render exception; capture the first stack trace and both request outcomes.
- Reproduce in Vite development with StrictMode and separately in a production
  build. Confirm deployed client/server revisions before comparing behavior.
- Use synthetic data and the existing database-free preview first. Extend its
  missing roster response and support controlled detail/roster failure cases.
  Its fake authentication must remain local; it does not prove persistence.
- Run baseline typecheck, tests, and build on the supported Node version from
  `server/package.json`. Existing passing helper tests do not validate hook effects.

## Phase 1 — Repair loading without changing the domain schema

Files: `client/src/hooks/useCompanion.ts`, `client/src/lib/companionState.ts`,
`client/src/components/companion/CompanionWidget.tsx`, locale catalogs, and
`server/test-support/companionPreview.ts`.

1. Restore the mounted flag during effect setup; keep cleanup and request aborts.
   Keep StrictMode enabled and test its extra effect cycle.
2. Start detail and roster requests independently and handle their results
   independently. Apply detail immediately without waiting for roster. Process a
   successful roster even when detail fails, so stale selections can recover.
3. Preserve per-companion snapshot/revision checks. Guard stale roster-driven
   selection changes after a user has selected a different pet. Cancel or ignore
   superseded requests and prevent older refresh errors replacing newer success.
4. Validate response envelopes and required snapshot/roster fields at runtime.
   Keep the last valid roster on failure; distinguish loading, empty, and failed
   states and provide a localized retry message. Never set roster to undefined.
5. Preserve drafts, operation IDs, busy state, and authoritative success handling.
   A secondary roster failure must not make accepted care inaccessible.
6. Evaluate `Cache-Control: private, no-store` for authenticated companion reads
   as a cache/privacy policy. Test real conditional requests if adopted; the
   header alone is not proof Express cannot return 304. Do not globally accept
   bodyless 304 responses as valid snapshots or modify unrelated endpoint caching.

Exit: the selected companion renders under StrictMode and a production build;
roster failure cannot discard a valid detail response; stale IDs recover without
cross-pet data replacement. No migration or model calls are required.

## Phase 2 — Correct simulation and reward foundations

Files: `server/src/services/companionState.ts`, `companionEvolution.ts`,
`companionMigration.ts`, controller integration, and adjacent server tests.

- Integrate time separately before and after rest expiry. Preserve fractional
  values internally; reject invalid clocks and never move the clock backward.
- Settle before archive, freeze archived state, and resume with a fresh clock.
  Preserve remaining nap duration instead of replaying expired timestamps.
- Determine meaningful care from settled values and actual positive improvement.
  Nap re-entry must not repeatedly reward or extend an existing nap.
- Reject unknown newer schemas. Separate this guard from the future v3 migration.
- Keep existing v2 product rules during a separately shipped bug repair; introduce
  the new lifespan, rest effects, and unlimited XP together with their versioned
  v3 rules and compatible client contract in subsequent phases.

## Phase 3 — Versioned v3 lifecycle and unlimited XP

Extend the type-only `shared/contracts.d.ts`. Add pure, typed services under
`server/src/services/`: `companionRules.ts`, `companionSimulation.ts`,
`companionRewards.ts`, and `companionLifecycle.ts`. Inject time and randomness.
Add an isolated strict TypeScript check without unrelated package-wide refactoring.

| Target | Required behavior |
| --- | --- |
| Stages | Child at 2 simulated days + 6 care actions; juvenile at 7 days + 18 since child; grown at 14 days + 36 since juvenile |
| Aging | Elder at day 60 and natural death at day 90 regardless of missed care gates; each care event counts toward at most one stage |
| Offline | Simulate at most 24 hours since qualifying engagement, then pause; resume discards the gap and grants 24 wall-clock hours of neglect-death protection without extending it on ordinary visits |
| Needs | Fullness -3/hour, energy -2, joy -2, comfort -1.5, hygiene -2; nap restores energy +12/hour for 45 minutes without immediate +30 |
| Health | Six continuous low-need hours trigger illness; illness drains health 5/hour until underlying needs recover; eligible medicine restores 30 with a six-hour wall-clock cooldown |
| Recovery | Well pets recover health 2/hour when fullness, energy, hygiene are all at least 40; protection clamps health to one but does not prevent natural death |
| Rewards | Meaningful care 8 XP, first request completion +4, saved AI reply 4; remove 40-care/12-chat daily XP caps; retain care cooldowns and separate 60-attempt family AI allowance |
| Identity | Life status, activity, health, and archive are separate; terminal pets keep history and cannot earn rewards or roam |

Use the supplied lifecycle document for threshold boundaries, treatment eligibility,
request priority, and event fields. Persist transitions once, retain old forms,
and guard nonnegative safe-integer XP arithmetic. Polling never counts as engagement.
Public snapshots expose lifecycle requirements and allowed actions, not leases,
payload hashes, quota internals, or random seeds.

## Phase 4 — Atomic mutations, migration, and generations

Add `server/src/services/companionMutation.ts` and durable operation receipts in
`server/src/models/`. Route existing aliases and new actions through the same
service; keep `server/src/controllers/companionController.ts` thin.

- Commit settlement, effects, rewards, events, revision, and receipt atomically.
  Enforce receipt uniqueness by family/companion/operation; include actor and a
  canonical payload hash. Changed-payload replay fails, and old retries remain
  deduplicated beyond the existing 60-operation buffer.
- Use MongoDB transactions for multi-document updates. Acquire family leases
  before companion leases where both are needed; verify ownership on commit.
- Reserve AI attempts before calling the provider. Never hold a transaction over
  a provider request or automatically repeat an ambiguous paid attempt.
- Add validated `visit`, `clean`, `medicine`, and revision-checked elder `retire`.
- Create successors through roster POST: new identity and fresh XP/memories,
  stable lineage, predecessor link, incremented generation. One direct successor
  per predecessor and the six-active cap must hold under concurrent requests.
- Make v3 migration dry-runnable and idempotent. Preserve IDs, memories, XP,
  bonds, portraits, and stage history. Initialize health/hygiene to 100, clocks
  at migration time, and age at the minimum for the existing stage. Preserve
  archived/unhatched records; do not apply historical absence or cause death.

## Phase 5 — Client lifecycle and Thai personality

Update `client/src/components/companion/`, `client/src/hooks/useCompanion.ts`,
shared contracts, and `client/src/locales/en.json` / `th.json` together.

- Accept complete typed action objects. Send visits on explicit habitat open or
  visible-tab return, never on every render or polling interval.
- Show independent life-stage and XP progress, health/hygiene, pause/protection,
  treatment controls, retirement confirmation, memorials, and successor creation.
- Both soft and pixel renderers need elder forms preserving species and palette.
  Honor allowed actions; terminal records retain readable/forgettable memories.
- Add `companionPersona.ts`, `companionPrompt.ts`, and
  `companionReplyValidation.ts` in server services. Bound selected-pet context
  to 12 memories, 12 recent turns, and 16 KB of valid UTF-8 JSON.
- Separate trusted game/persona rules from untrusted narrative. Keep Thai voice
  consistent, recall grounded, and language fallback tied to UI language.
- Strictly validate replies and supported gestures/growth signals, including
  `none`. Provider failure preserves drafts and grants no XP or fake memories.
- Implement the specified `gemini-2.5-flash-lite` default with backend override;
  recheck official availability before release rather than silently substituting.
  Add synthetic offline persona fixtures; paid live evaluation requires an
  explicit budget and separate authorization.

## Verification and release gates

| Area | Required evidence |
| --- | --- |
| Loading | StrictMode effect replay; close/reopen; detail success with roster error/malformed data; roster success with detail 404; retry recovery |
| Selection | Delayed pet A responses cannot overwrite pet B; stale saved ID recovers; older roster results do not change a newer selection |
| Cache | Distinguish Network 304 from application-visible response; test normal cached revalidation and explicit bodyless/error responses |
| Simulation | Same-time replay; backward/invalid clocks; one long versus many short intervals; nap boundary; archive/restore; exact offline limit |
| Rewards and lifecycle | Settled 85 boundary; no-op care; repeated nap; cooldowns; uncapped valid rewards; stage gates; illness/protection/death boundaries |
| Persistence | Real disposable replica-set transaction rollback, concurrent successor uniqueness/cap, stale lease rejection, durable replay, changed-payload rejection |
| Migration | Dry-run writes nothing; rerun changes nothing; preserve legacy history; no historical death; newer schema rejected |
| Persona | Thai/English stages, identity isolation, forgotten recall, injection, invalid JSON, bounds, quota/timeout, no hidden provider calls |
| UI | Both art styles, 360px layout, keyboard, screen reader status, reduced motion, hidden tab, two profiles, preserved drafts |

Use Node's test runner with `tsx`. Add hook/render coverage rather than relying
only on pure helper tests; register any new client tests in the explicit package
test list. Mock providers. HTTP 200 and a successful build do not prove rendering.

Run from the repository root after implementation:

```sh
npm run typecheck
npm test
npm run build
git diff --check
```

Also run the isolated strict-domain check once added and the applicable manual
checks in `13-testing.md`. Report actual results, runtime version, screenshots,
and any unrun checks. Do not mark live persona evaluation passed without samples.

Deliver reviewable commits in phase order. Update `19-shared-companion.md`,
configuration examples, `DEPLOYMENT.md`, and release notes to match shipped rules.
The loading-only release has no data migration; v3 needs a backup rehearsal,
verified indexes/transactions, compatible server/client deployment, and a
recovery build that preserves v3 history. Never roll back to a writer that strips
lifecycle fields or resurrects terminal pets. This plan performs no deployment.

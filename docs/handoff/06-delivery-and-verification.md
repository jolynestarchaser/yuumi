# Integration, ownership, and delivery gates

Status: planned. This is the handoff coordinator's checklist, not a completed QA report.

## Work order and independently reviewable commits

| Slice | Depends on | Suggested commit subject | Exit condition |
| --- | --- | --- | --- |
| A1 | Baseline reproduction | `fix: preserve note drafts and save reliably` | Empty notes, autosave, minimize/close/refresh recovery |
| A2 | A1 API design | `fix: enforce atomic item content revisions` | Two-writer conflict, idempotency/history, no stale-response rollback |
| B1 | Agreed contracts | `feat: support a shared companion nursery` | Migrated legacy pet plus independent new pets, archive/restore, shared quota |
| B2 | B1 | `feat: add companion needs requests and growth stages` | Clock correctness, care requests, caps, immutable stage outcomes |
| C1 | B1/B2 snapshots | `feat: make companion dialogue grow with its persona` | Prompt harness, stage/style evaluation, grounded memory |
| D1 | B1 | `refactor: retire companion image generation` | Built-in art works, no new image calls, existing assets preserved |
| D2 | B2/C1 gesture contract/D1 | `feat: animate companion care and evolving forms` | Actual body transformations in both styles plus care/roaming scenes |
| E1 | A2 | `fix: make travel pin saves recoverable` | Capacity, conflict, failed-save recovery, local camera |
| E2 | E1 | `feat: improve shared travel planning` | Edit, dates, search/filter, selection, keyboard/touch controls |
| Integration | All required slices | `docs: record verified companion and map release` | Evidence below, accurate specs, EN/TH release highlights |

Prefer merging A1/A2 as one complete fix if separating them would expose unsafe
revisions. Do not deploy half a companion schema/UI contract or an API with no
compatible client. Keep each public API additive until the compatibility window ends.

## Agent assignment packets

For every owner, supply `Plan.md`, this file, their work-package document, current
commit, relevant specifications and the frozen shared type proposal. The plan
assigns responsibilities; an agent may delegate only when its own instructions
permit it. This preparation does not itself start any agents.

- **A:** note editor/draft controller and shared item persistence. May touch
  WindowManager note branch, items/history services/routes/models and focused tests.
  Coordinate Item map validation with E rather than editing it simultaneously.
- **B:** companion shared contracts, migrations, API/model, clocks/care/growth/quota.
  Integrator approves contract change before C/D implement adapters.
- **C:** prompt/persona modules, Gemini chat adapter and fixtures. Do not independently
  rewrite B's action controller or delete D's portrait path; supply patches to owner.
- **D:** companion UI/art/animations, roster client, rendering manifest and safe
  portrait retirement. B integrates server-side generation-disable changes.
- **E:** map feature, projection helpers, pin schema proposal and isolated tests.
  A owns integration into generic save service.
- **Integrator:** shared files, locale catalogs, package manifests/lockfiles,
  release notes, feature composition, migrations, deployment and verification.

`shared/contracts.d.ts`, `App.tsx`, `desktopStore.ts`, `WindowManager.tsx`,
`server/src/models/Item.ts`, release entries, and locale JSON are collision zones.
Use explicit branches/worktrees or owner-reviewed patches; never overwrite
another agent's changes. Re-read git diff before staging exact files. Preserve
user `.vscode/` and any new unrelated edits.

## Contract freeze before parallel implementation

- Item write/recovery API: expected base revision, operation ID, acknowledgment,
  validation/conflict/current snapshot shape, blank note policy.
- Companion public ID/family scoping, roster endpoint names/static route order,
  capabilities, archive rules, per-ID state/requests and action result structure.
- One versioned growth config: 80 EXP, levels/stage mapping, caps, form catalog,
  event IDs, before/after form IDs, behavior summaries, migration defaults.
- One animation/gesture catalog, form renderer manifest, care-request types and
  neutral local fallback wording.
- Map v2 fields, size/date validation, local-camera semantics, conflict rebase rules.
- Translation keys/errors: product wording in EN/TH catalogs, no raw stack traces
  or implementation details exposed to users.

Library policy: reuse installed React, Motion, Zustand, D3, TopoJSON, and existing
test/runtime tools. Type packages for the current geography adapter are reasonable.
No speculative game engine or AI orchestration framework is required. If adding
test/browser tooling, first inspect available project tools and verify the chosen
library against official docs, license, supported Node version and bundle impact.

## Migrations and compatibility

1. Snapshot affected collections in an authorized deployment workflow and document
   the backup restore procedure without printing connection strings or user content.
2. Run migration dry-run against fixtures and a disposable production-like DB.
   Count affected rows and validation failures. Re-run to prove idempotency.
3. Deploy backward-compatible server before the new client. Introduce the roster
   without breaking the old singleton routes. Move old routes onto the new writer.
4. Seed the family quota from the existing day's usage so migration does not reset
   billing limits. Reads must not reset care cooldowns/needs clocks/XP.
5. Ensure any new DB indexes and transaction requirements are met. Test contention,
   expired leases, restart, provider timeout and lost acknowledgments.
6. Enable the new client only when server capabilities confirm support. Old
   clients invoking portrait generation receive an intentional unavailable error
   without provider calls, while text chat/uploads remain functional.
7. Rollback must preserve additive records and legacy IDs. Roll back the client
   first; use a backward-compatible server release for v2 records. Do not run an
   older singleton writer against migrated v2 state if it can erase fields or
   bypass family quotas. Disable the new action surface instead until repaired.
8. Remove compatibility code only after verifying old sessions have refreshed;
   permanent record/asset cleanup is outside this release.

## Verification approach

Use Node's built-in test runner + tsx for domain and API tests. Existing client
`npm test` enumerates individual files: explicitly register new tests or change
discovery deliberately, otherwise files may exist without running. Add focused
UI/browser tests for lifecycle, pointer and async behavior; pure calculations
cannot cover those. Use database-backed tests for atomic concurrency, and provider
mocks for normal CI. Never exercise synthetic care/XP against real user companions.

Required commands from repo root after implementation:

```text
npm run typecheck
npm test
npm run build
git diff --check
```

Run focused package checks while iterating and the full commands at integration.
There is currently no mandatory lint script; do not report a nonexistent lint
command as passed. Fix relevant errors; report bundle warnings and compare growth
after lazy-loading the map. Passing tests from `924afcc` are baseline only.

## Cross-feature acceptance matrix

| ID | Scenario | Required evidence |
| --- | --- | --- |
| N1 | Edit, wait, refresh; Save immediately | Exact body/title and revision persisted |
| N2 | Edit, minimize, reopen; remote close | Draft preserved, no silent discard |
| N3 | Blank note, 10k boundary, network error | Correct save/validation + recoverable error |
| N4 | Two editors; delayed reply; history restore | Conflict, no rewind, correct clean/dirty reconciliation |
| R1 | Migrate existing companion twice | No duplicate/changed XP/memories/assets |
| R2 | Create two pets and switch during chat | Correct per-pet speaker/context/memory/needs |
| R3 | Simultaneous sixth-pet creation | Active cap holds atomically |
| R4 | Archive/rest, restore, offline interval | Paused decay; ID preserved; quotas not reset |
| C1 | Hungry, bored, sleepy, wants hug | Matching localized cues and feasible care action |
| C2 | Double-settle and duplicate operation | No double decay, EXP, request fulfillment or evolution |
| C3 | Care after XP cap / Gemini unavailable | Care still works; clear progress state |
| P1 | Hatchling vs grown in EN and TH | Human-reviewed samples are noticeably different |
| P2 | Persona injection, false memory, hostility | Grounded response, no stat/tool authority escalation |
| E1 | Same race/palette, different care histories | Different evolved bodies, not different badges |
| E2 | Refresh/reconnect during evolution | Same final form; one acknowledgment; replay is optional |
| E3 | Each species + custom template, soft/pixel | Complete matching form/animation manifest; no invisible parts |
| I1 | Old/new portrait UI/action after retirement | No generation call; chat/uploads and legacy gallery work |
| M1 | 100 long/multilingual pins, then 101 | All 100 persist, clear capacity limit |
| M2 | Partner adds while rotating/editing | No overwrite; conflict/rebase behavior evidenced |
| M3 | Fail save then retry, edit visited date | Draft preserved and pin created once |
| M4 | Globe click/zoom/keyboard/multiple windows | Accurate location, unique IDs, accessible equivalent |
| U1 | 360x800, 768x1024, 1440x900, 1920x1080 | Reachable forms; no accidental horizontal overflow |
| U2 | EN/TH, reduced motion, voice off, keyboard | Fully usable, no text/audio/animation regressions |
| X1 | Letters/Spotify, calendar, files and desktop drag | Existing user features pass smoke checks |

Use existing database-free companion preview as a starting fixture, then extend
it for roster, care requests, growth forms, errors, and deterministic clocks. It
does not prove database persistence. Never deploy its fake authentication.
Complete the applicable manual checklist in `13-testing.md` for desktop, folder,
media and authentication interactions affected by these changes.

## Release checklist

- [ ] Required acceptance IDs pass; attach failing/deferred IDs explicitly.
- [ ] Two independent authenticated sessions (Joe and Focus) tested.
- [ ] Latest schema migration and rollback verified with representative legacy data.
- [ ] Current specs updated: 19, 21, 22 and note rules; no stale image promises.
- [ ] Versioned EN/TH release highlights describe actual available behavior.
- [ ] Exact-file commit, conventional subject; clean diff except user-owned files.
- [ ] Push through existing authorized workflow; inspect Vercel/Railway build status.
- [ ] Verify deployed revision/build assets, backend health and authenticated smoke
  flows. HTTP 200 alone is not deployment evidence for a new feature.
- [ ] Use designated smoke data; do not delete/overwrite the couple's existing data.
- [ ] Report commit IDs, tests, screenshots/recordings, deployment state and limits.

## Required report from each agent

```text
Work package and baseline:
User-visible behavior delivered:
Root causes verified (for fixes):
Files changed / commits:
Shared contracts changed and consumers updated:
Data migration and rollback impact:
Tests actually run and outcomes:
Manual/browser evidence:
Known gaps and unverified production behavior:
Next owner / dependency to unblock:
```

Do not mark a checkbox complete from code inspection alone when it calls for a
runtime test. Do not call a copied badge or palette change an evolved form.

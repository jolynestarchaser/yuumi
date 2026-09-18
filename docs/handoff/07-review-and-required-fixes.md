# Implementation review and required fixes

Reviewed baseline: `e0531ff3dbfc269c5df48f2569720220ef1740b3`.
Scope: compare the implementation with [Plan.md](../../Plan.md) and handoff documents 01–06. This is a documentation-only review. No application fixes, migrations, commits, or deployments were performed in this review.

## Implementation update — 2026-09-18

The following reviewed backend slices are now implemented in the working patch (not yet claimed as deployed):

- R3/R4: new roster pets are born in one request; creation has a stable operation ID, six-active-pet family lease, reversible archive/restore, family/schema fields, explicit legacy migration, and unknown action IDs return 404 without upsert.
- R5: Gemini reservations use one family document and one lease across every companion; retrying the same operation reuses its reservation.
- G1: needs use a dedicated fractional `needsUpdatedAt` clock, settle once, include comfort, and clamp offline decay.
- P2/P3 backend: normal item writes require revision + operation ID, validate non-map length before query updates, deliberately match legacy missing revision zero, and atomically commit item/history/audit/replay acknowledgement in a Mongo transaction. History restore broadcasts after commit.
- Client request compatibility: companion creation, item saves, and item-history restores retain stable operation IDs across a failed/lost response.
- Automated evidence: server typecheck passes; 36 server tests pass, including migration twice, concurrent sixth/seventh creation, replay, unknown-ID no-write, shared quota, clock idempotency, oversized content, legacy revision, stale writer, and immutable item replay.

Still open from this review: N1–N3, client-side monotonic item reconciliation in P1, production replica-set migration/integration evidence, R1/R2 UI ownership, G2–G5, C1, M1–M5, L1, and V1.

## Verdict

The full handoff is **not complete**. Roster, care cues, growth styling, note autosave, and map editing exist, but several normal user journeys can target the wrong companion, overwrite shared content, or fail to recover a draft. Earlier statements that all handoff tasks were finished were too broad. Pushing a commit also does not establish that either deployed application is running it successfully.

Priorities below mean:

- **P1:** fix before calling the affected workflow reliable or shipping further features that depend on it; data integrity, identity, failed normal workflows, or uncapped paid usage.
- **P2:** required product, usability, architecture, or verification work that remains incomplete.

Source paths and line numbers refer to the reviewed baseline. Runtime reproductions below used synthetic in-memory data only. Other findings are source-confirmed paths with proposed regressions, not claims of a production reproduction.

## Verification performed in this review

- `npm test` from the repository root: exit 0; server 30 tests and client 15 tests passed.
- Database-free `node --import tsx` checks confirmed double settlement, rounding loss, map date/status rejection, and legacy truncation (details below).
- Read the six handoff specifications and the affected implementation files, routes, contracts, test scripts, and release metadata.
- No authenticated browser sessions, actual Mongo contention tests, provider generations, build, typecheck rerun, or production smoke tests were performed in this review.
- Client tests enumerate five `src/lib/*.test.ts` files. They do **not** mount NoteWindow, TravelMap, useCompanion, or the roster UI. Their high coverage output applies to those imported helper modules, not the whole app.
- The existing companion mutation test mocks a singleton record. It does not prove multiple-companion isolation, roster caps, family quotas, or cross-companion UI behavior.

## What exists versus what the handoff requires

| Package | Implemented foundation | Still required |
| --- | --- | --- |
| A: notes/shared writes | Blank note bodies; debounce; session recovery cache; atomic content update when a revision is supplied; close flush | Correct recovery UI, actual Save copy, bounded flush, monotonic reconciliation, retry IDs, atomic history/audit, lifecycle/concurrency tests |
| B: roster/domain | Roster list/create, ID-selectable reads/actions, per-record lease | Per-ID client state, one successful hatch, cap/archive/restore, shared paid quota, migration/versioning, stable requests, needs clock, XP caps |
| C: persona | Stage and need context; stronger prompt; reply validation | Bounded memory selection, stable preferences, expression/gesture contract, fallback behavior, EN/TH evaluation fixtures |
| D: game/evolution | Soft/pixel artwork, stage idle motion, care icons, one roamer with quick care; portrait action returns 410 | True race-specific forms, persisted stage outcomes, evolution scene/album, correct animation priority, habitat, two ID-bound roamers |
| E: travel map | Real globe geography; v2 serialization; date/editor/delete controls; server validator; unique SVG IDs; camera changes do not save | Safe conflict/retry handling, lossless legacy recovery, date transition fix, editable coordinates, search/filter/selection, accessible navigation, narrow-window layout |
| F: delivery | Commits pushed previously; helper/model tests | Integration/browser evidence, migration/rollback evidence, current EN/TH release notice, verified frontend/backend deployment |

## P1 findings

### R1 — Companion selection can display A while actions mutate B

**Evidence:** `client/src/hooks/useCompanion.ts:15–16,48–49,63–69`; `server/src/services/companionState.ts:105–119`; `shared/contracts.d.ts` PublicCompanion. `apply()` compares only revision numbers; changing `companionId` does not clear/key `data`. Public snapshots strip `_id` without exposing a public `id`.

**Trigger:** A has revision 20, B has revision 1. Select B. B's snapshot is rejected because 1 < 20, but `act()` sends B's ID. The screen can continue showing A's name/chat while feeding or messaging B. Newly created revision-0 pets are particularly affected. A missing remembered ID also leaves loading/error UI without a usable roster fallback because snapshot and roster are awaited together.

**Fix:** expose public IDs; cache snapshots, request generations, pending operations, drafts, and busy state per ID. Compare revisions only within an ID. Switch to a loading view or B's cached state immediately; reject stale A responses after switching. Include ID/profile in retry signatures; catch unavailable localStorage and scope preferences appropriately. Allow roster selection even when the active record cannot load.

**Gate:** A20→B1 and reverse; create B from A20; delayed A response after B selection; failed request retried on another pet; missing ID; blocked storage. Assert displayed ID equals action/context ID every time.

### R2 — Child panels retain the previous companion's editable state

**Evidence:** `CompanionWidget.tsx` mounts Chat/Personality/Customizer without companion keys; `CompanionCustomizer.tsx:10–13` and widget local `draft`/`inspiration` use initial props only.

**Trigger:** keep Appearance open, switch to a different companion with an accepted snapshot, then save. The previous pet's name/design and possibly matching revision remain in the editor. Chat drafts and inspiration similarly cross the selection boundary.

**Fix:** keyed per-companion panel state and explicit draft ownership; clear or restore the correct local draft on selection. Stop voice and reaction timers on change. Use authoritative returned revisions rather than assuming revision + 1.

**Gate:** equal-revision pets with different names/designs; unsent chat/inspiration in each; switch and save without contaminating the other pet.

### R3 — Add companion finishes an animation but creates an unhatched record

**Evidence:** `companionController.ts:75–83` calls `initialCompanion()` and never sets `bornAt`; that default is null. `CompanionWidget.tsx:40–50,141` plays hatch before submitting, exits creation after POST, then routes null `bornAt` back to the creator. The setup defaults to Mochi rather than the saved new record.

**Fix:** make create the single idempotent hatch commit, returning a born companion and stable event ID, or explicitly model a saved egg and pass its existing setup into a deliberate later hatch. For the current one-wizard UX, prefer one committed hatch. Play the opening/reveal after acknowledgment, retain setup on failure, and provide Cancel before submission.

**Gate:** one form and one successful request create one born pet with the chosen name/race/design; no second creator; failed or lost acknowledgment retains setup and does not duplicate.

### R4 — Roster has no cap/idempotent create; arbitrary action IDs create records

**Evidence:** `companionController.ts:15–23,70–83`; `ensureCompanion(id)` upserts every requested ID; POST create uses a fresh random UUID on every call. `Companion.ts` has no family/archive/version contract.

**Impact:** retrying a lost create response duplicates pets. A syntactically valid unknown ID sent to an action can create a new unhatched record before returning an error. There is no six-active-pet boundary, archive, or restore. Roster lookup uses `find({})`; current authentication is for one shared desktop, so this is missing planned family scoping, not evidence of an existing public multi-tenant exploit.

**Fix:** creation exclusively through a validated, idempotent roster service; unknown action IDs return 404 without writes; atomic cap across create/restore; reversible archive; explicit server-owned family identity and idempotent legacy backfill. Do not recreate the singleton on each roster request.

**Gate:** concurrent sixth/seventh creation, replay after lost acknowledgment, unknown ID leaves record count unchanged, migration twice, archive/restore at cap.

### R5 — Every new pet multiplies the paid AI allowance

**Evidence:** `companionController.ts:44–57,129`: usage is read from each pet's `budget` and reserved against that pet's ID. The message still calls this a shared daily allowance.

**Fix:** one atomic family quota across all companions and legacy/new routes. Seed current usage during migration. Verify reservation matched the active lease before invoking the provider; retain clear request/charge outcomes for retries.

**Gate:** interleave chat on A/B as Joe/Focus; total cannot exceed the family limit; simultaneous last-slot reservation has one winner; creating/archiving a pet does not reset usage.

### N1 — Recovered note text is hidden and can be replaced by further typing

**Evidence:** `WindowManager.tsx:17–46`: state initializes from recovery, but the mount effect immediately calls `setName(item.name)` and `setContent(item.content)`, while refs still point to the recovered text. Restored drafts are marked dirty but no autosave is scheduled on restoration.

**Trigger:** type, minimize before debounce, reopen. Inputs show remote content while Save operates on different recovered refs. Typing into the stale visible content can replace the recovered draft in sessionStorage. The same occurs after refresh recovery.

**Fix:** initialize controlled state and refs from one validated recovered snapshot. Reconcile its base revision with remote state; show and preserve the recovered text, then autosave or show conflict explicitly. Keep draft ownership outside window mounting and report recovery-storage failures. Purge recovery on explicit logout (`authStore.ts` currently removes only token/profile keys).

**Gate:** exact title/body after minimize and refresh, subsequent typing retains restored text, stale-base recovery becomes a conflict, storage denied, logout/profile switch.

### N2 — “Save copy” overwrites the shared original

**Evidence:** `WindowManager.tsx:150`: the button advances `revisionRef` to the conflict record and calls `flush()` for the original `item._id`. It never creates a new note.

**Fix:** create a separate note with the local draft and distinct ID/name, preserving the remote original. If overwrite is separately supported, label it explicitly and show the current remote text for review. Cancel queued autosaves while resolving conflicts; invalidate acknowledgments if the user discards/reloads a draft.

**Gate:** Joe/Focus conflict → Save copy leaves original remote content untouched and creates one recovered note; lost acknowledgment does not make two copies.

### N3 — Saving a blank title with nonempty text can loop indefinitely

**Evidence:** `WindowManager.tsx:58–64,116–126`: save normalizes blank title to `Untitled note`, but `flush()` compares raw `nameRef.current.trim()` with the normalized base. A nonempty body keeps its while condition true; subsequent no-op saves never satisfy the exit condition.

**Fix:** use one normalized draft snapshot for save, display/ref reconciliation, and flush termination; bound the loop and wait for changes rather than spinning through resolved promises.

**Gate:** clear title while retaining body; Save and Close each settle once, display normalized title, and keep the interface responsive.

### P1 — Shared item responses can rewind current content or position

**Evidence:** `desktopStore.ts:32,53,59,78`: HTTP acknowledgments replace whole items unconditionally; socket updates require both revision counters to be newer, so valid content with an older position can be discarded. Note save success also blindly clears conflict and replaces base/revision (`WindowManager.tsx:74–76`).

**Fix:** merge content and position independently and monotonically; use one reconciliation function for HTTP, sockets, snapshot, and history responses. Track the acknowledged draft/operation separately from any later partner update and retain a real conflict.

**Gate:** deliver remote content revision 3 before HTTP revision 2; retain 3. Deliver content revision 4 with position revision 1 while local position is 2; retain content 4 and position 2. Test dirty and clean note states.

### P2 — Item writes still lack retry acknowledgments and atomic history

**Evidence:** `itemContent.ts` accepts optional expectedRevision and no operation ID. `routes/items.ts:61–67` commits the item then creates history/audit and broadcasts; `history.ts` does the same for restore. History restore does not broadcast the updated item. Legacy absent content revisions are not explicitly normalized in the atomic filter.

**Impact:** history failure after a successful write can appear as a failed save; retrying is ambiguous. Omitting revision bypasses compare-and-swap. History restore does not update the partner through this route.

**Fix:** mandatory revision + bounded operation ID for normal content changes; atomic acknowledgment and history/audit through a verified transaction or explicit outbox/repair design. Compatibility paths must be deliberate. Broadcast after commit and normalize legacy revisions without discarding history.

**Gate:** real disposable-DB concurrent writers, history failure, lost response replay, missing revision rejection, legacy revision backfill, partner sees restore.

### P3 — Note length and error handling regress at the new query-update boundary

**Evidence:** `models/Item.ts` moved the 10,000-character check into document `pre('validate')` and removed path maxlength. `updateItemContent()` uses `findOneAndUpdate(..., runValidators:true)` and explicitly validates only map content; document middleware is not the same as query-update validation. `TravelMapValidationError` has no mapped status. `middleware/error.ts` ignores `error.status`, and relevant async items/history routes lack `try/catch(next)` in this Express 4 application.

**Fix:** validate non-map length and all typed content before the update; preserve blank-note acceptance. Normalize validation/conflict/missing/trashed errors and forward rejected route promises to Express middleware. Do not claim model.validate tests cover the PATCH path.

**Gate:** authenticated HTTP PATCH with 10,001-character note, malformed map, missing/trashed item, and invalid revision returns bounded 400/404/410/409 responses, with no write or hanging request. Run the HTTP test against an isolated app/DB.

### M1 — Retrying an old full map can erase a partner's pins

**Evidence:** `TravelMap.tsx:21,29–41,74`: `retryMap` retains an entire old document; remote updates independently advance `revision.current`; Retry sends the old document against that newer revision. Every error is treated the same, including 409. The shared store does not merge 409 current data.

**Trigger:** A's map save fails; B adds a pin; A receives B's revision, then retries the old map. The now-valid revision authorizes replacing B's pin set. If no remote update arrives, retries can simply repeat the stale conflict forever.

**Fix:** retain stable-ID add/update/remove intents, original revision, affected-pin base, operation ID, and current remote snapshot. Rebase disjoint edits explicitly; show same-pin conflicts; never resend the old full map with a newer revision. Replay a committed operation after a lost response.

**Gate:** offline add + partner add + retry preserves both; same-pin edit/remove conflict retains both drafts; rotation sends no content writes; duplicate acknowledgment produces one pin.

### M2 — A delayed map save can clear a newer draft; minimize discards unsaved edits

**Evidence:** `TravelMap.tsx:46` clears the current draft name/note after any successful older submission. Inputs and Edit remain usable while pending. Draft/retry state exists only inside a component that WindowManager unmounts on minimize.

**Fix:** track submission sequence and clear only its acknowledged draft; prevent switching editing targets while pending or isolate their drafts. Add per-profile/item recoverable map draft/intent state and a safe close/minimize policy.

**Gate:** save pin A with delayed response; type pin B or select another edit; A's response cannot clear B. Minimize/restore and refresh retain failed edits and operation identity.

### M3 — Switching a dated pin's status fails server validation

**Evidence:** `TravelMap.tsx:71–73` changes status without clearing/transforming the previous date. `server/src/services/travelMap.ts` rejects plannedDate on visited pins and visitedDate on planned pins. Synthetic validation of a visited pin with an existing plannedDate produced `Travel map planned date is invalid.`

**Fix:** choose a documented contract. Recommended: retain both valid optional dates, regardless of current status, so actual trips retain their planned history; display the date appropriate to status. Alternatively clear inactive dates deliberately in the editor, with matching data rules. Apply the choice to client/server/types/tests/history.

**Gate:** dated planned→visited→planned, add visitedDate, save/reload; validate actual calendar dates including leap day; no inherited dates on a genuinely new blank pin draft.

### M4 — Legacy parsing silently removes data before an apparently safe save

**Evidence:** `client/src/lib/travelMap.ts:readTravelMap`: filters invalid entries/duplicate IDs, trims fields, stops at 100, returns an empty map on parse failure. The generic warning says existing pins are safe. Synthetic 101-pin legacy input became 100 after serialization; malformed input became an empty map without a recovery warning.

**Fix:** parsing must return diagnostics and original raw content. When normalization would discard data, block ordinary overwrite and provide export/copy/recovery. Handle unknown versions explicitly. Legacy history restore currently passes old JSON to the v2-only update validator; safely normalize that restore or present a recoverable incompatibility error.

**Gate:** 101+ pins, duplicate/missing IDs, malformed JSON, unknown versions, overlong fields, legacy history restore; opening never mutates content and no normal save silently truncates it.

### G1 — Needs are not clock-idempotent and frequent writes prevent decay

**Evidence:** `companionState.ts:22–33` calculates from generic updatedAt, rounds every settlement, and does not advance a dedicated clock. Controller resets updatedAt on every successful mutation.

**Reproduced:** settling one hour once gave fullness/energy/joy `73/83/74`; settling that result at the same time gave `71/86/73`. Settling and resetting updatedAt each minute for an hour left initial `75/80/75`, whereas one hourly settlement gave `73/83/74`.

**Fix:** fractional internal values and a dedicated needsUpdatedAt clock; settle exactly once per mutation. Separate awake/resting energy rules and explicit sleep/wake times. Keep serialization/display rounding out of persisted simulation arithmetic.

**Gate:** repeat settlement at identical time, hourly versus minute schedules, edits/chat/care at differing intervals, provider failure, offline clamp, sleep exit. Existing tests comparing two independent calls with the original input do not establish idempotence on already-settled input.

## P2 completion gaps and further defects

### G2 — Care requests and progress are only a partial implementation

`companionState.ts:114–118` derives a new request on each read, based on a fixed priority list. Cuddle depends on a personality trait rather than a comfort need; default traits are above that threshold and only rise. There is no request ID/lifecycle/hysteresis, shared completion reward, comfort stat, or resting state. `careFor()` always grants 8 XP, even at full needs; chat grants 4 with no per-pet daily XP cap. Add the persistent care model, meaningful-action checks, 40 care/request and 12 chat XP defaults from doc 02, and a no-positive-growth signal for hostile/irrelevant chat. Keep care usable when XP is capped or Gemini is unavailable.

### G3 — Evolution schedule and bodies do not satisfy the specified transformations

`companionEvolution.ts` still emits every third level (3,6,9,12...), while public stages use 3,6,10. `CompanionGrowth.tsx` advertises another next-evolution schedule. `formId` is composed from current species/stage/latest path, without a versioned form catalog or immutable from/to outcomes. `PixelCompanion.tsx` retains the same central body paths at every stage and adds small parts; soft art mainly scales the same body and adds decoration. No before/after transformation scene or growth album exists. Implement one versioned transition schedule and original race-specific silhouettes with at least two meaningful anatomical changes, persisted outcomes, both renderers, and deterministic visual fixtures. Preserve old history and selected palette.

### G4 — Idle CSS overrides acknowledged care body animations

`companion.css:56` uses `.companion-avatar.stage-* .companion-avatar-motion` (three class selectors), which outranks `.reaction-play .companion-avatar-motion` and other reaction selectors at lines 180–184 (two classes). Care icons may appear while the body continues idle. New wing/tail display rules also target races whose base part rules lack position/background geometry. Introduce explicit pose priority or fix specificity, and verify actual computed styles and every race at every stage. Re-test paused/reduced-motion behavior; a typecheck cannot verify animation priority.

### G5 — Remaining nursery/game work

The App renders one roamer controlled by a boolean, not a selected array of up to two IDs. There is no food/toy/rest habitat, archive UI, locomotion facing/stride model, stable event-based celebration, or failed-care message in the already-hatched roamer branch. Add these after identity/state fixes. Keep custom-race copy honest: free text currently affects persona, not arbitrary new anatomy. Retired portrait generation is blocked, but dead generator code/configuration remains and legacy art has no optional gallery.

### C1 — Persona harness and bounded memory are missing

`companionBrain.ts:15–25` sends all up-to-80 memories plus 20 recent turns, without the planned 12/12 selection or 16KB budget. Stage and request rules are duplicated rather than consuming one authoritative profile. No versioned prompt fixtures, stable preferences, gesture/intent catalog, growth `none`, or local provider-failure response is implemented. Add doc 03's offline matrix and explicit optional live evaluation; do not equate wording in a system prompt with proven natural Thai or grounded recollection. Memory deletion already removes memory/turn/thought context and should remain covered.

### M5 — Travel UX and loading still incomplete

No typed latitude/longitude fields, search, All/Planned/Visited filter, pin selection/fly-to, bounded zoom, or keyboard rotation. Pin groups remain aria-hidden. Quick-city names bypass translation. CSS uses viewport breakpoints rather than the desktop window's width; new fourth row control is not reflected in its three-column list grid. `WindowManager.tsx` eagerly imports the map/atlas. Split editor/list/globe/mutations; add keyboard controls and container-responsive layout, meaningful capacity/error text, pointer-ID/cancel handling, lazy loading, attribution, and 360px plus narrow-window browser evidence.

### L1 — URL/GIPHY attachments are a new feature, currently absent

The current composer accepts local file upload and a Spotify URL. GIF file uploads already exist. It has no general URL attachment field, media resolver, GIPHY link resolution or picker. See [08](08-message-url-giphy-attachments.md) for the requested design and gates.

Related fix before extending send: `MessageCenter.submit()` generates a fresh operation ID on each retry and reuploads the file. `messages.ts` upserts by global operationId with mutable fields instead of replaying an immutable sender-scoped result. A lost response can create duplicate messages/uploads, and reused IDs can mutate a previously sent message. Implement sender-scoped immutable idempotency with stable attachment and message operation IDs; validate metadata server-side.

### V1 — Release notification and completion evidence are stale

`client/src/lib/releases.ts:4` still uses `2026-09-17-travel-globe`. People who acknowledged it will not receive a new login notice for these later commits. Documents 01–06 still say planned, while earlier chat claimed all work finished. Use this review as the current status and [09](09-patch-and-whats-new.md) as the patch/release plan. Do not publish pending URL/GIPHY support or complete evolution as available until verified. Record frontend and backend deployed revisions and actual authenticated smoke results; prior git push output is not that evidence.

## Implementation sequence for the next owner

1. N1–N3 and P1–P3: stabilize drafts, shared content contract, conflicts/history, and error forwarding. Add controlled async UI and disposable-DB tests.
2. R1–R5: fix ID ownership and one-step hatch, then capped/idempotent creation, archive/migration, shared family quota. Prove two-pet isolation.
3. M1–M4: pin intents/recovery, date contract, lossless migration/restore; then M5 usability.
4. G1/G2 before C1/G3/G4/G5: clock/requests/progression contracts must precede persona/art state consumers.
5. L1: URL/GIPHY attachments using doc 08; keep the release separately gated.
6. V1: update the actual What's new release and EN/TH entries only for passing slices, then record doc 06's browser/DB/deployment gates.

Independent work can be delegated when authorized: persistence owner, roster/domain owner, and media attachment owner. The integrator owns contracts, locales, App, release metadata, and coordinated writes to shared files. Do not have multiple agents blindly stage common locale files.

## Review-only handoff checklist

- [x] Review completed against source at the stated commit.
- [x] Existing automated suite rerun; limitations recorded.
- [x] Synthetic clock/map regressions reproduced without production data.
- [x] Fix tasks and acceptance conditions documented.
- [x] URL/GIPHY request and patch-note plan documented separately.
- [ ] P1 fixes implemented and regression-tested.
- [ ] Remaining doc 06 gates passed with actual evidence.
- [ ] Future release deployed and authenticated workflows verified.

# Companion Phase 3–5: review remediation and release plan

Date: 2026-09-20.
Status: planned; fixes, verification, and deployment are not completed.
Scope: seven findings from static review of the current uncommitted Phase 3–5 patch.
Parent: [lifecycle implementation plan](11-companion-bugs-and-lifecycle-plan.md).

## Execution constraints and release decision

The owner requested deployment and a remediation plan. The earlier no-testing
constraint remains in effect. No tests, typechecks, builds, migrations, provider
calls, commits, pushes, or deployments were performed while preparing this plan.
Railway and Vercel repository configurations both require builds; Vercel's build
also includes TypeScript checking. Clarify permission for release verification
before executing those steps. Do not disable checks to make deployment proceed.

The current patch has known correctness and persistence defects. Hold production
promotion pending fixes and the release gates below. Confirm the intended target
(staging or existing production), deployment projects, backup availability, and
permission for required verification. A plan is not evidence that fixes shipped.

## Implementation work packages

### R1 — P1: valid successor uniqueness index

File: `server/src/models/Companion.ts`.

- Remove `sparse: true` from the predecessor index; retain `unique: true` and
  the partial filter selecting string predecessor IDs. MongoDB disallows sparse
  and partial options on the same index.
- Inspect existing index definitions and duplicate predecessor IDs before any
  production index change. Do not automatically delete duplicates or drop indexes.
- Keep database uniqueness as a backstop to family serialization.

Acceptance, pending permission: index creation succeeds in a disposable replica
set; multiple null predecessors are permitted; duplicate string predecessors fail.
Reference: [MongoDB partial index restrictions](https://www.mongodb.com/docs/manual/core/index-partial/#restrictions).

### R2 — P1: durable paid-attempt deduplication

Files: `server/src/services/companionMutation.ts`,
`server/src/controllers/companionController.ts`, and `server/src/models/`.
Update `client/src/hooks/useCompanion.ts` and locale messages if recovery needs a
distinct response state.

- Separate provider-attempt state from successful mutation receipts. Persist an
  attempt keyed by family, companion, operation, actor, and canonical payload hash.
- Atomically reserve family quota and the attempt before any provider call.
- Track reserved, dispatched, completed, and failed/unknown outcomes. A dispatched
  attempt with an uncertain result must not automatically call the provider again.
- Reject changed-payload replay. Preserve drafts and explain uncertain outcomes;
  an explicitly new attempt consumes quota and observes cooldowns.
- Persist a validated provider result durably so a database-save retry can finish
  the companion mutation without generating again. Keep transactions short and
  never hold one across the provider request. Define bounded retention for results.

Acceptance: mocked timeout, lost acknowledgment, process interruption, database
failure, concurrent retry, and changed-payload cases never produce an uncounted
provider call or duplicate reward. No paid evaluation is needed.

### R3 — P1: migration concurrency safety

Files: `server/src/services/companionMigration.ts`,
`server/src/scripts/migrateCompanions.ts`.

- Replace unconditional `_id` updates in both single-record and roster migration
  paths with compare-and-set guards using the observed schema/revision and missing
  fields. Handle legacy missing revisions explicitly.
- Increment revision atomically when changing a record. Respect mutation leases;
  on a conflict, re-read and recompute a bounded number of times or return a
  retryable error. Never return a locally merged patch that did not commit.
- Preserve unknown-newer-schema rejection, legacy history, IDs, XP, and archive
  state. Dry-run must not write documents or implicitly create indexes.

Acceptance: overlapping detail/roster migrations and care writes do not reset
lifecycle clocks, health, events, or rewards; rerun is a no-op; dry-run writes nothing.

### R4 — P1: partition-independent lifecycle simulation

Files: `server/src/services/companionSimulation.ts`, `companionRules.ts`,
`companionLifecycle.ts`, and `companionRewards.ts` as needed.

- Integrate nap recovery first, clamp at the nap boundary, then apply awake decay.
- Audit other discontinuities in the same integrator: need thresholds, illness
  onset/recovery, health reaching zero, protection expiry, offline cap, and natural
  death. Apply transitions at their actual timestamps and stop at terminal state.
- Preserve pure functions, injected clocks/IDs, archive freeze, and no backward
  clocks. Do not change rates or stage gates to mask integration defects.

Acceptance: energy 99, 45-minute nap, then 75 minutes awake yields 97.5 whether
settled once or in pieces. Other boundary cases produce equivalent needs, age,
status, and semantic event history across interval partitions.

### R5 — P1: start lifecycle clocks at adoption

File: `server/src/controllers/companionController.ts`; extract shared initialization
into a domain helper if needed.

- Use one injected command timestamp for `bornAt`, `needsUpdatedAt`,
  `lifecycle.simulationAt`, and `lifecycle.lastEngagementAt` on first adoption.
- Initialize the hatchling age/exposure consistently without applying pre-birth
  absence; retain identity and intended setup fields.
- Keep adoption and receipt atomic. Retry must not reset an already-born pet.
- Check the existing six-active family invariant on this path as well as roster
  creation; use the same family-before-companion locking order.

Acceptance: an egg left for several days hatches at age zero with initial needs;
replay does not reinitialize it; concurrent adoption/create cannot exceed the cap.

### R6 — P1: enforce terminal rules after settlement

Files: `server/src/controllers/companionController.ts`,
`server/src/services/companionMutation.ts`.

- Validate eligibility against settled `next.lifecycle`, not pre-settlement state.
- Check chat eligibility before reserving quota and recheck under the mutation
  lease before provider dispatch. Keep allowed forget/history actions explicit.
- If settlement discovers death, persist the terminal transition exactly once
  without granting chat XP, creating conversation memories, or calling AI.
- Define the rejected-action response and receipt semantics so rollback of a
  rejected action does not discard the authoritative terminal transition.

Acceptance: chat arriving at natural-death and illness-death boundaries makes
zero provider calls and grants zero XP; death persists once; memories remain usable.

### R7 — P2: apply detail without waiting for roster

File: `client/src/hooks/useCompanion.ts`; preserve guards in
`client/src/lib/companionState.ts`.

- Start both requests concurrently, but attach independent settlement handlers.
  Apply valid detail immediately even while roster is pending or failing.
- Retain mounted/abort handling, payload validation, per-pet revision merging,
  request sequence guards, and selection checks before stale-ID recovery.
- Prevent old success/error responses from clearing newer action errors or
  replacing another selected pet. Keep roster failures separately retryable.

Acceptance: deferred roster cannot block successful detail; deferred detail cannot
block roster recovery; StrictMode, cancellation, malformed payloads, and switching
pets retain correct state. This does not by itself prove the original production
loading incident had the same cause.

## Order and verification (not executed)

1. Implement R1 and R3, then R4–R6, then R2 and R7; review shared mutation paths
   together before release. Preserve unrelated working-tree changes and secrets.
2. Add focused coverage under the existing server `test/` structure and client
   test convention once permitted. Register client tests if discovery is explicit.
3. With approval, run root typecheck, server isolated companion-domain typecheck,
   focused/full offline tests, build, and diff checks. Record actual results, not
   assumed success. Use mocked providers and a disposable replica set.
4. Rehearse migration and rollback on synthetic/authorized copied data. Do not
   run synthetic care against existing user companions.
5. Update this checklist, the parent plan, and deployment notes with evidence.

## Coordinated deployment runbook

- [ ] Confirm target projects/environment and exact release commit. Review the
  complete patch, including untracked domain services, before staging exact files.
- [ ] Resolve the seven findings and required compiler/runtime failures; approve
  verification scope. Do not mark release gates passed based on static review.
- [ ] Confirm MongoDB replica-set transactions, durable receipts/attempt indexes,
  predecessor index, and a recoverable backup of affected collections.
- [ ] Review migration dry-run counts and validation errors before authorizing
  write migration. Existing lazy migration runs on reads, so merely deploying the
  backend can modify records; put backup and migration controls in place first.
- [ ] Deploy the compatible API on Railway using repository-root build context
  and `/railway.json`; verify deployed revision and health before client promotion.
- [ ] Deploy the matching Vercel client with `shared/` available and the intended
  API URL. Keep credentials server-side; do not print or change secret values.
- [ ] Run approved authenticated smoke checks using designated data: open/reopen,
  roster selection, adoption/care, terminal journal, successor, and retry behavior.
  Verify revisions on both services; HTTP 200 alone is insufficient.
- [ ] Record deployment IDs/URLs, commit, checks, migration counts, and limitations.

On failure, stop promotion. Use a known v3-safe backend recovery build or disable
companion mutations; do not restore an older writer that strips lifecycle fields
or resurrects terminal pets. Client rollback must remain API-compatible. Database
restore requires a coordinated recovery decision because it can discard new writes.

## Current evidence

- Static review identified the seven findings; runtime reproduction is pending.
- Repository configs confirm Railway/Vercel builds are part of deployment.
- No fixes, verification, migration, or deployment are claimed by this document.

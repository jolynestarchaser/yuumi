# Unlimited XP and TypeScript implementation

Status: proposed implementation guide. [Lifecycle rules](01-lifecycle-and-generations.md)
own numeric simulation defaults; do not duplicate them in controllers or UI.

## Rewards

| Event | XP | Eligibility |
| --- | ---: | --- |
| Meaningful care | 8 | Settled primary need below 85 and positive improvement |
| Request completion | 4 extra | Active matching request fulfilled for the first time |
| Saved AI chat | 4 | Valid reply committed successfully |
| Read, visit, design edit, failed or duplicate operation | 0 | Always |

Map feed to fullness; play/explore to joy; cuddle to comfort; rest to energy;
clean to hygiene; medicine to health. A useful nap start qualifies once despite
recovery being deferred. Medicine additionally requires illness and its cooldown.
No-op treatment is rejected without rewards. A below-85 need must actually improve;
server eligibility cannot be inferred from a browser animation or mini-game score.

Remove `dayBudget` reward logic, care cap 40, chat cap 12, and cap messaging.
Do not replace them with another daily reward counter or hidden diminishing cap.
Keep `floor(xp / 80) + 1` and `xp % 80` for level and progress. Validate persisted
XP as a nonnegative safe integer; guard arithmetic overflow explicitly.

Retain five-second per-caregiver care cooldowns and shared AI attempt limits.
The existing family allowance is 60 chat attempts per UTC day. Failed provider
attempts may consume that allowance but never grant XP or a fabricated memory.
Only meaningful care advances stage care counts and the recent behavior window.
Existing ordinary interaction/bond bookkeeping must not be mistaken for qualifying
development care.

## Type and service boundaries

Extend [shared contracts](../shared/contracts.d.ts); keep that file type-only.
Use discriminated unions for life status, actions, transitions, and operation
outcomes. Terminal variants contain terminal timestamp/reason; alive variants
contain activity/health fields. Keep archival distinct from terminal status.

Public snapshots add lifecycle stage, age, next-stage requirements, illness,
hygiene/health, pause/protection status, generation, and permitted actions.
Make the active request nullable when no care is available. Exclude leases,
operation payload hashes, provider quota internals, and internal random seeds.
Represent public timestamps as ISO strings; persistence and domain adapters
convert them explicitly to the internal representation.

Use branded companion, lineage, operation, and transition IDs inside the domain,
constructed by validation at boundaries. Use `unknown` for HTTP/provider input,
typed predicates for narrowing, exhaustive switches, explicit return types, and
`as const`/`satisfies` for catalogs. Avoid `any`, enums, non-null shortcuts, and
unnecessary type assertions. Import types separately with `import type`.

Suggested modules and responsibilities; these files are to be created:

| Module | Inputs and outputs | Responsibilities |
| --- | --- | --- |
| `companionRules.ts` | Versioned typed constants | Units, rates, gates, effect tables |
| `companionSimulation.ts` | State + clock -> state + events | Pure piecewise settlement |
| `companionRewards.ts` | Settled before/after + validated action -> reward result | XP eligibility and qualifying care |
| `companionLifecycle.ts` | State + domain event -> lifecycle transition | Stage gates and terminal rules |
| `companionMutation.ts` | Authenticated actor + validated command -> snapshot/result | Leases, receipts, persistence, revisions |
| `companionPersona.ts` / `companionPrompt.ts` | Selected state + message -> bounded context | Typed persona and prompt assembly |
| `companionReplyValidation.ts` | Unknown provider payload -> validated reply or failure | Runtime response validation |

Keep modules in the existing server services area; separate pure functions from
database/provider imports. Inject time and randomness. Use named result fields
instead of expanding opaque positional effect tuples. Do not add a state-machine
package, tRPC, Redux, Next.js, or a game engine for this feature.

Follow two-space indentation, PascalCase React files, camelCase functions, and
backend relative `.js` imports. Document public domain function parameters,
units, returned events, errors, and replay semantics with concise JSDoc when
implementing them. No new functions are claimed to exist in this handoff.

Use a strict companion-domain check configuration covering the isolated new
modules and type fixtures: strict null checks, unchecked-index checks, exact
optional properties, and exhaustive returns. Preserve current package module
resolution and the incremental policy in [20-typescript-migration.md](../20-typescript-migration.md).
Do not solve legacy package-wide strict errors through unrelated refactoring.
Keep declaration generation for any extracted library; no new library is required.

## API integration

Keep the existing [route layout](../server/src/routes/companions.ts), authentication,
family scope, legacy ID support, and success/failure envelopes. Extend actions
rather than creating an independent mutation path.

| Proposed action | Additional validated input | Result |
| --- | --- | --- |
| `visit` | None | Settled/resumed snapshot, no XP |
| `clean` | None | Care result and snapshot |
| `medicine` | None | Eligible treatment or cooldown/state failure |
| `retire` | `expectedRevision: number` | Terminal elder snapshot |
| Successor creation through roster POST | Setup + `predecessorId: string` | Created or replayed successor ID and snapshot |
| Chat | Existing text + `language: 'th' or 'en'` | Saved reply; UI language is fallback only |

All mutations also carry validated operation ID and target companion identity
where applicable. Derive actor and family from the session. Refuse client XP,
age, health, terminal status, and arbitrary model/action fields. Update the client
action helper to accept a complete action object instead of loosely paired name
and partial values. Keep old endpoint aliases routed through the same services.

Add stable error codes to the existing error envelope and localized UI messages:

| HTTP | Condition | Recovery |
| --- | --- | --- |
| 400 | Invalid command, identity syntax, fields, or payload mismatch | Correct input; do not retry unchanged |
| 401/403 | Missing authorization | Reauthenticate; do not disclose other-family state |
| 404 | Unknown/inaccessible pet | Refresh roster |
| 409 | Stale revision, lease conflict, invalid life state, active cap | Refresh and inspect current state |
| 429 | Care/medicine cooldown or AI allowance | Wait until allowed; preserve draft |
| 502/503 | Provider failure or unavailable configuration | Preserve draft; explicit retry only |

## Atomicity and recovery

Settle, validate action eligibility, apply effects/rewards, advance stage, append
events, increment revision, and save the operation receipt as one commit.
Replace reward reliance on the latest-60-operation buffer with durable receipts
uniquely indexed by family, companion, and operation ID. Include actor and a
canonical payload hash; changed-payload replay is rejected. Preserve receipt
identity for the pet's retained lifetime so old retries cannot earn XP again.
Return an authoritative snapshot plus the recorded operation outcome on replay.

Use a MongoDB transaction for multi-document receipt/state commits and successor/
lineage/cap updates, with the existing leases for serialization. Require a
transaction-capable database in integration tests and deployment. All paths
needing both family and companion leases acquire family first. Refactor the
existing nested chat/family quota flow to avoid inverse acquisition order.
Never hold a database transaction open during a provider request.

Persist paid-attempt reservation before provider calls. Do not call the provider
again automatically after an ambiguous crash. A saved result replays without
another call; an unresolved in-flight attempt reports uncertainty and allows a
new explicit user attempt once the old attempt is marked failed. Expired leases
must not let stale owners commit; verify lease ownership at save time.

For UI, replace XP-stage forecasts with separate life-stage and XP progress.
Update habitat, nursery summaries, roamers, journal, and both visual renderers.
Honor returned allowed actions; terminal pets have no care/chat/roaming controls.
Polls cannot award XP or create engagement. Cache and pending operations remain
keyed by companion ID, including delayed responses after selection changes.

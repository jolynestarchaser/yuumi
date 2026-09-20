# Implementation sequence and acceptance

Status: work to perform after this documentation handoff. Follow the linked rule
documents instead of recreating constants or making independent product choices.

## Ordered work

1. Read repository specifications, inspect current worktree, and establish the
   existing typecheck/test/build baseline. Preserve unrelated edits.
2. Add [domain types and rules](02-unlimited-xp-and-typescript.md), strict isolated
   checks, pure settlement, lifecycle transitions, and fake-clock tests.
3. Add [migration and persistence](01-lifecycle-and-generations.md), durable
   receipts, transaction tests, successor uniqueness, and lease-order fixes.
4. Route existing and new actions through one mutation service. Remove XP caps
   across care/chat, initial state, migration defaults, public data, and UI copy.
5. Update client action typing, per-pet snapshots, explicit visits, nursery,
   habitat, treatments, growth, journal, retirement/memorials, and successor flow.
6. Add elder appearance/reactions to both styles. Keep generated portrait
   metadata intact and new portrait generation disabled.
7. Implement [Thai personality](03-thai-personality.md), Flash-Lite default,
   parser, and offline evaluation. Run live evaluation only when explicitly
   authorized with a spending budget.
8. Update the companion specification, EN/TH catalogs, configuration examples,
   release notes, and final evidence. Rehearse migration before deployment.

## Automated acceptance

| Area | Required cases |
| --- | --- |
| Unlimited XP | Exceed 40 care XP and 12 chat XP in the same day; next valid reward still applies; no UTC-midnight reward dependency |
| Meaningful care | Settled rather than stale values; need at 85 versus below 85; capped/no-op effects; nap re-entry; medicine cooldown |
| Requests | Stable identity; one completion bonus with simultaneous caregivers; clean/medicine priority; no terminal request |
| Time | Same timestamp replay; backward clock; one long versus many short settlements; fractional rates; sleep boundary |
| Offline | Exactly 24 hours versus longer; repeated polling cannot extend engagement; return discards paused gap; protection is not extended by ordinary visits |
| Health | Six-hour continuous low-need exposure; reset; illness damage; medicine eligibility; recovery; protected health floor; terminal zero |
| Aging | Each age/care threshold; one event cannot count twice; elder/death despite missed care gates; paused days excluded |
| History | Retirement confirmation/revision conflict; terminal immutability; memory forgetting still works; no fabricated descendant recall |
| Generation | One successor under concurrent/replayed requests; active cap; transaction rollback; distinct XP/identity/memory |
| Concurrency | Durable old-operation replay beyond 60 later actions; changed payload rejected; stale lease owner cannot commit; no lock inversion |
| AI | Shared paid quota still enforced; failure gives no XP; saved reply replay avoids provider; expired ambiguous attempt has explicit recovery |
| Migration | Dry-run unchanged DB; rerun no changes; old high-XP pet retains form/history; no historical death; archived/unhatched pets; newer schema refused |
| Client | Delayed pet A response cannot replace pet B; visit only on explicit entry/return; failures do not animate success |
| Thai | Stage/language fixtures; no cross-pet context; prompt injection; invalid schema; grounded recall; context cap |

Use Node's built-in test runner and `tsx`, matching existing tests in
[server/test/companion.test.ts](../server/test/companion.test.ts),
[server/test/companionEvolution.test.ts](../server/test/companionEvolution.test.ts),
and [client companion state tests](../client/src/lib/companionState.test.ts).
Mock providers for automated tests. Multi-document atomicity tests need a MongoDB
replica set; mocked persistence alone cannot prove transaction behavior.

Existing root scripts to run after application changes, from repository root:

```text
npm run typecheck
npm test
npm run build
git diff --check
```

These are verification instructions, not commands executed for this handoff.
Also run the new isolated strict-domain check once implemented. Do not claim
tests pass merely because a command exists in this document.

## Manual acceptance

Use local fixture clocks/state to show hatch, meaningful care, stage transition,
illness, treatment, recovery, elder retirement, death, and successor creation.
Never expose testing XP/time overrides in production APIs.

- Verify both art styles, all life stages, visible form changes, selected palette,
  and readable needs/health status. A badge alone is not a body evolution.
- Verify two profiles share one authoritative pet while selection stays local.
  Refresh both browsers after care, retirement, and new-generation creation.
- Check keyboard-only care, screen-reader status announcements, 360px mobile,
  reduced motion, animation-off, optional voice, and hidden-tab behavior.
- Check a failed action preserves drafts and does not celebrate; paused/terminal
  pets cannot roam; memorial history remains readable.
- Check natural Thai, stable self-reference, distinctive personalities, and
  no pressure to pay or accusations about absence. Record reviewed synthetic
  examples separately from private conversations.
- Complete the applicable [manual interaction checklist](../13-testing.md).

## Rollout and recovery

Deploy matching server and client after dry-run migration and backup rehearsal.
Update old specs that promise no death or daily XP caps. Keep compatibility routes
using the same service and reject unknown schema versions rather than downgrade.
Check database transaction support and unique-index creation before enabling
successor writes. Do not run migrations/deployment merely to produce documents.

Before a rollout, record a backup identifier, migration rules version, dry-run
counts, commands/results, and screenshots. Validate credentials without printing
them. Disable new lifecycle writes if integrity checks fail; use a compatible
build that understands v3 state for recovery. Do not roll back to an old writer
that strips lifecycle fields, deletes terminal history, or resurrects pets.

If a provider model is unavailable, preserve care and return a chat configuration
error. Recheck official model availability and report the issue; do not silently
switch models or retry paid calls indefinitely. If transaction support is absent,
stop migration/release and configure a supported database before continuing.

## Documentation coverage and current verification

| Requested topic | Artifact | Coverage |
| --- | --- | --- |
| Conversation decisions and continuation | [Start here](00-start-here.md) | Accepted choices, baseline, reading order, suggested skills |
| Lifecycle and generations | [Lifecycle](01-lifecycle-and-generations.md) | Rules, time boundaries, health, terminal states, migration |
| XP and coding style | [TypeScript guide](02-unlimited-xp-and-typescript.md) | Reward eligibility, types, modules, API inputs/errors, concurrency |
| Thai personality | [Dialogue guide](03-thai-personality.md) | Model choice, writing rules, examples, parsing, evaluation |
| Delivery and checks | This document | Implementation order, automated/manual cases, rollout/recovery |

Coverage is of the requested handoff, not a percentage of repository APIs.
There are no executable TypeScript examples or new OpenAPI documents in this
package. Future function signatures/modules are explicitly proposed; their
implementation and compiled examples must be validated when they are written.
Repository tests, builds, migrations, and live AI evaluation were not run as part
of this documentation-only task. Validate local Markdown links and whitespace
before handing off these files.

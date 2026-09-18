# B — Multiple companions, care, and growth domain

Status: planned. Own server companion contracts and rules before UI integration.

## Current files and target separation

Read `server/src/models/Companion.ts`, `controllers/companionController.ts`,
`services/companionState.ts`, `services/companionEvolution.ts`,
`routes/companions.ts`, `shared/contracts.d.ts`, `client/src/hooks/useCompanion.ts`,
`19-shared-companion.md`, and `server/test/companion*.test.ts`.

Extract small services for roster/identity, elapsed-time needs, care requests,
growth rules, appearance resolution, and companion mutations. Pure calculations
receive a clock and seeded random source in tests. HTTP handlers validate, call
services, and return authoritative snapshots.

## Versioned state contract

Define named shared types, not `any` or scattered numeric constants:

```text
Companion v2:
  id: stable public string (legacy ID remains valid)
  familyId: server-owned shared-family ID
  schemaVersion: 2
  name, species, customDescription, creation identity, bornAt, archivedAt
  design: selected shape/face/gender/palette/voice (existing appearance compatible)
  needs: fullness, energy, joy, comfort (0..100)
  needsUpdatedAt: dedicated simulation clock
  behaviorState: active | resting; restStartedAt/restUntil when applicable
  xp, growthRulesVersion, stage, growthSeed
  stageOutcomes: immutable reached-stage records, including fromFormId/toFormId
  careRequest: persisted id, kind, createdAt, state, fulfilledAt, fulfilledBy
  careSummary: cumulative per-action counts + per-caregiver counts
  behaviorWindow: bounded recent earned-care signals (not raw private text)
  traits, bonds, preferences, personalityVersion
  memories, conversation turns (each includes companion ID in its enclosing record)
  revision, recent operation acknowledgments, lock lease (server only)
```

Public snapshot adds derived level, progress, stage descriptor, needs urgency,
appearance recipe, and the active care request. Do not expose seeds, locks, quota
internals, or mutation capabilities to Gemini. Persist outcomes; recompute displays.

## Roster API and migration

Add versioned roster endpoints while keeping the legacy singleton endpoints for
the deployment compatibility window:

| Endpoint | Meaning |
| --- | --- |
| `GET /api/companions/roster` | Active summaries and optional archived summaries |
| `POST /api/companions/roster` | Idempotent hatch/create from validated setup |
| `GET /api/companions/:id` | One full authorized snapshot |
| `POST /api/companions/:id/actions` | Care/chat/design/forget/archive/restore, with operation ID |

Register static routes before `/:id`. Legacy GET and `/actions` keep selecting the
legacy companion, not whichever companion another browser last selected. Every
read/write filters the authenticated shared family. Public IDs must never be
inferred from array indexes. Unknown, unhatched, archived, and foreign IDs return
clear errors. Retrying an action must never create another egg or award EXP twice.

- Start with six active companions. Archive is reversible, excludes a pet from
  active care/roaming, and pauses decay; restoration resets the needs clock.
  No permanent delete in this release. Restoring at the cap returns a useful error.
- Enforce the active cap atomically under a family roster lease/transaction,
  including simultaneous creation/restoration by both profiles.
- Locks serialize writes per companion, so feeding pet A does not block pet B.
  A separate family quota document atomically bounds paid chat across all pets;
  adding companions must not multiply the existing shared daily chat budget.
- Preserve authenticated Joe/Focus attribution and existing retry/cooldown logic.
- Migration is idempotent and dry-runnable. Keep `_id: 'joe-and-focus'`, memories,
  bonds, XP, inspirations, colors, and portrait metadata intact. Do not reinsert
  the singleton on every request once the roster exists.
- Backfill `comfort = 75`, `needsUpdatedAt = updatedAt`, family ID, deterministic
  identity seed, schema version, and current stage without awarding XP. Existing
  evolution records remain legacy history. Unknown fields must not disappear on
  saves. A never-hatched singleton is not counted as an active pet.
- Legacy endpoints must use the new mutation/quota service after migration,
  not a second competing writer. Mixed-version deployment must be tested.

## Needs and care loop

Retain names fullness/energy/joy to minimize migrations; add comfort for hugs.
Initial tunable defaults (central config with documented units):

| Need | Per hour while awake | Prompt below | Primary response |
| --- | --- | --- | --- |
| Fullness | -3 | 45 | Feed +24 |
| Energy | -2; +12 while resting | 35 | Rest scene, recover over time |
| Joy | -2 | 45 | Play +22 |
| Comfort | -1.5 | 45 | Cuddle +20 |

Clamp needs to 20..100 (joy/comfort may use 25 as a tuneable floor). Settle at
most 24 hours away in this release, no death or negative relationship score.
Use fractional values internally and round only for display. Settling twice at
the same `now` is idempotent. Design edits, reads, and failed AI calls must not
reset the need clock or repeatedly apply elapsed decay.

Sleep has an explicit end condition (duration or restored energy) and gentle
wake behavior; do not simply leave mood `sleepy` forever. Use the same snapshot
logic for the open habitat and the roaming pet.

Care request lifecycle: `none -> active -> fulfilled` or `resolved/superseded`.
Choose the most urgent unmet need, with stable identity and hysteresis (resolve
above 60 rather than flapping at 45). Show one request per pet, retain its ID until
resolved, and avoid repeating its speech bubble every render/poll. Shared fulfillment
is atomic: two simultaneous caregivers may both interact but receive at most one
request-completion reward. A request is a game need, never an instruction to pay.

Use a visible next-care cue and direct Feed / Play / Hug / Rest / Explore actions.
Care works without Gemini. Requests do not invoke background AI; localized rule
templates express age and race. An optional mini-game calls a validated care
action and cannot submit arbitrary EXP, hunger values, or a trust-me score.

## Progression and appearance outcomes

Keep `level = floor(xp / 80) + 1` and progress within 80 XP for migrated pets.

| Stage | Levels | Visual and dialogue change |
| --- | --- | --- |
| Egg | Before successful hatch | Egg shell/theme; no mature chat |
| Hatchling | 1–2 | Small rounded body, large eyes, tiny movement, short concrete speech |
| Child | 3–5 | New proportions, curiosity, play preferences, fuller short sentences |
| Juvenile | 6–9 | Developed race features, more initiative and personal ideas |
| Grown | 10+ | Mature silhouette/accessories, warm clear speech, recognizable identity |

Proposed anti-farming rules: meaningful care grants 8 XP; completed care request
adds 4 once; successful chat grants 4. Cap care+request XP at 40 and chat XP at 12
per pet per UTC day, shared by both profiles. Care remains usable after the cap;
show that XP is resting. At these caps a level takes roughly two active days,
and grown requires roughly two weeks from fresh hatch. Treat as a playtest target.
Retain short action cooldowns; full-needs spam gives no care/request XP. Award
chat growth only after a valid saved reply, not on retries or provider failures.

At stage transitions (3, 6, 10), choose a distinct race-compatible evolved form using a
combination of recent meaningful care, lifetime patterns, starting temperament,
and small seeded random variation. Map actions: play -> playful, explore/questions
-> curious, hugs/rest/feed kindness -> affectionate. Use the recent signal window
so all traits saturating at 100 does not erase future influence. Neglect is not a
permanent ugly branch. Never reward abuse; hostile chat yields no positive trait
signal by default.

Evolution means a new recognizable body, not an emblem. Define a versioned form
catalog with `formId`, allowed predecessor forms, race/family, stage, silhouette,
body/face anatomy, limb/ear/wing/tail geometry, markings, and animation anchors.
Require a changed silhouette plus at least two anatomical/design changes at each
major transition; color and size changes alone fail acceptance. Use original form
names and drawings, not copied Pokemon/Digimon/Persona characters. The owner wants
their transformation appeal, not any specific licensed creature.

For example a tiny round dragon may become a playful biped with broad feet and
curled horns, or a curious long-bodied glider with developed wings and a forked
tail. Both remain dragons and use the selected palette. The race + care history
select the branch; changing a badge cannot stand in for either body.

Persist a `StageOutcome` with stable event ID, level/stage, from/to form IDs, parts/branch IDs,
palette accents, source summary, rules version, and timestamp under the same lock
as the XP change. One retry/refresh must never reroll its appearance. Levels between
stages give modest size/detail progress and a celebration; after level 10 unlock a
minor accessory every five levels. Existing every-third-level records are preserved
as history but new v2 stage events use the schedule above. Migration does not replay
old level-up rewards or overwhelm the user with hatch animations.

## Gates

- Migration rerun creates no duplicates and loses no identity, memory, or XP.
- Create two pets, care as both users, archive/restore, and prove memory/XP isolation.
- Delayed response from pet A cannot replace selected pet B; caches, busy state,
  retry signatures, and revisions are keyed by ID, never globally compared.
- Unit tests use fake clocks for offline settling, double-settle regression,
  sleep, hunger, and request hysteresis. Concurrent integration tests verify
  roster cap, lease recovery, operation replay, request reward, and family AI quota.
- Growth fixtures prove repeated identical treatment influences outcomes without
  forcing every race into the same body. Same persisted seed/outcome renders
  consistently after reconnect and on both clients.

# Lifecycle and generations

Status: target behavior. See [baseline and decisions](00-start-here.md).

## Stage rules

Life stage and XP level are separate. Preserve `grown` as the stored/public
identifier for adult; add `elder`. Egg is the pre-adoption UI state.

| Stage | Minimum simulated age | Care requirement |
| --- | --- | --- |
| Hatchling | Birth | Successful adoption |
| Child | 2 days | 6 meaningful care actions since hatching |
| Juvenile | 7 days | 18 meaningful care actions since entering child |
| Grown | 14 days | 36 meaningful care actions since entering juvenile |
| Elder | 60 days | Age alone |
| Natural death | 90 days | Age alone |

One simulated day is 24 accumulated hours outside archive or automatic pause.
An under-cared pet still becomes elder and reaches natural death at those ages;
care gates cannot make a pet immortal. Reset the per-stage qualifying care count
when entering the next stage. One care event cannot satisfy multiple stages.

Persist stage changes once with event ID, rules version, age, XP level at the
event, previous/new form, branch, and timestamp. Evolve using species and recent
meaningful care signals. Preserve old outcomes as history; never reroll on reads.
Add an elder form for both renderers, keeping identity and selected palette.

## Needs, activity, and health

Separate life status (`alive`, `retired`, `deceased`), activity (`active`,
`resting`), and health condition (`well`, `ill`). Archival is a pause overlay.
All need and health values are finite numbers in 0..100; retain fractional
precision internally and round only for presentation.

| Field | Awake change per simulated hour | Care |
| --- | --- | --- |
| Fullness | -3 | Existing feed effects |
| Energy | -2 | Rest restores +12/hour for 45 minutes |
| Joy | -2 | Existing play/explore effects |
| Comfort | -1.5 | Existing cuddle effects |
| Hygiene | -2 | Clean restores 30 |
| Health | See illness rules | Medicine restores 30 while ill |

Retain existing care effect vectors except the immediate +30 energy for rest.
Repeated rest during an active nap neither extends it nor earns XP. Starting
rest still applies its other existing effects. Add hygiene/health UI and clean/
medicine controls; care works without AI.

Illness starts after six continuous simulated hours where at least one of
fullness, energy, or hygiene is below 20. Reset that exposure timer when all
three are at least 20. Once ill, drain health by 5/hour until all three are at
least 40, then clear illness. A well pet with all three at least 40 recovers
health by 2/hour. Medicine is eligible only while ill and below full health;
its six-hour cooldown uses server wall-clock time. It does not clear illness
while the underlying needs remain low.

At zero health, record death from illness/neglect. During return protection,
clamp health to at least one instead. Protection blocks neglect death only;
natural death at 90 simulated days still applies. Present factual status and
treatment choices without blaming or ranking caregivers.

## Simulation algorithm

Use a pure settlement function accepting state and server `now`. Store a
dedicated simulation timestamp, accumulated age, low-need exposure, last
qualifying engagement, rest end, protection end, and versioned lifecycle data.

1. Reject invalid dates; do not move a stored clock backward. An identical `now`
   must produce identical state and no additional events.
2. If archived, retired, deceased, or unhatched, do not advance simulation.
3. For an alive pet, calculate the permitted interval ending at the earlier of
   `now` and last qualifying engagement plus 24 hours.
4. Integrate piecewise at sleep end, need thresholds, illness onset, protection
   expiration, stage boundaries, and death. Do not loop once per minute.
5. Stop at death. Return the next state plus typed transition events; persist
   both atomically through the mutation service.

Passive GET polling may settle state through the service but never counts as
engagement. A new authenticated `visit` action occurs on an explicit habitat
open or visible-tab return, not each render or interval. Accepted care and saved
chat also count as engagement. Serialize visits with other actions.

On engagement, first settle using the old engagement deadline. If the pet was
automatically paused, discard the intervening unsimulated gap, start the clock
at `now`, and grant protection until `now + 24 hours`. Ordinary visits during
that protection period must not extend it. Save the new engagement timestamp.
Do not revive a pet that died within the permitted interval.

Archive first settles current state, then freezes it. Restore preserves frozen
age/needs and starts a fresh engagement clock, without applying archived time.
Expired sleep timestamps must not produce a negative or repeated recovery
interval after restoration. Preserve remaining nap duration while archived.

Request selection must use settled needs. Retain stable IDs and resolution
hysteresis; include clean and medicine. Illness treatment takes precedence when
medicine is eligible, followed by the lowest care need. At most one active
request exists. Completion and its XP bonus are atomic and happen once.

## Retirement, death, and successor eggs

- Retirement is available to an alive elder after a confirmation showing the
  consequence. Use revision checks; it is terminal, unlike archive.
- Preserve terminal pets as history. Disable care, active chat, and roaming;
  allow reading and forgetting memories. Stop all simulation and rewards.
- Offer a successor creator after retirement or death. Prefill species/palette,
  let the user edit, and save only after the existing hatch flow succeeds.
- Create a new ID, fresh needs/XP/bonds/conversation, generation increment,
  predecessor ID, and stable lineage ID. Do not copy private memory text.
- Enforce one direct successor per predecessor with a unique index. Retry returns
  that successor. Simultaneous successor creation and active-cap checks must be
  atomic. Do not overwrite the predecessor document.
- Keep six active companions; terminal and archived pets do not occupy slots.
  Creating a successor still fails if other pets already fill all six slots.
- History labels lineage facts as family history, never the new pet's own memory.

## Migration

Introduce schema/rules v3 through an idempotent, dry-runnable migration. Keep
existing IDs, memories, XP, bonds, appearance, portraits, and old stage outcomes.
Backfill health/hygiene at 100, well condition, zero low-need exposure, and new
simulation/engagement timestamps at migration time. Preserve unhatched records.

For born pets, preserve the current stage and initialize simulated age to its
minimum (0, 2, 7, or 14 days). Start future per-stage care counts at zero. Do not
invent historical care events or replay transitions. Archive status survives.
Never apply pre-migration absence or trigger an immediate death. Retain legacy
XP budget data temporarily but stop using it. Refuse a newer unknown schema
version rather than downgrading it.

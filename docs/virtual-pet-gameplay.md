# Virtual pet gameplay v1.1

Implements the supplied `virtual-pet-system-design.md` and
`virtual-pet-design-handoff.md` inside the existing companion service. The artwork
is being developed separately. `PET_GAMEPLAY_ENABLED=false` is the default until
the renderer and catalog have been checked together. Set it to `true` on the
backend to exercise the new rules. `PET_REWARD_TIMEZONE` defaults to Asia/Bangkok.
No database migration or deployment is run automatically by this code change.

## Gameplay

- Thresholds are 100 + 25 × (L − 1); live cap is 10. Hatching grants the one-time
  125 XP tutorial reward outside the shared 240 XP daily reward cap.
- Reward categories grant two full rewards, three quarter rewards, then none.
  Care rewards require improvement; chat rewards require ten minutes between
  grants. Rest has no instant energy/reward and qualifies after twenty minutes.
- Play/explore care buttons trigger reactions. XP for those categories requires
  completing a server-created activity session, one validated step at a time.
- Evidence has a daily cap of 30, treat/chat contribution caps of 20%, and a
  diversity bonus after three non-chat/non-treat categories. Short/long profiles
  use the documented decay windows. Personality updates at eligible day closure.
- Server time controls chronological age. Twelve hours away enters assisted
  rest. Age never grants XP or blocks evolution, and the new simulation never
  kills an absent companion. Historical terminal records remain historical.
- Plans commit at Lv2/4/7. Major outcomes commit at Lv3/6/10. Every crossed level
  has a durable before/after render snapshot. Primary family remains fixed within
  the segment; care still changes variant weights in every available rarity tier.
- HMAC streams separate plan, tier and recipe draws. Private audits retain the
  exact profile, candidate weights and versions. Presentation acknowledgment
  changes neither XP nor anatomy. Missing content retains XP and freezes the
  failed decision snapshot for repair.
- Chat requests reserve a pending turn, release the pet writer lease during the
  provider call, and revalidate current anatomy before committing. Timeout,
  malformed replies or an exhausted AI allowance use templates. Prompt choices
  work without Gemini. Model output cannot write rewards or anatomy.

## Renderer contract for the artwork chat

Consume `companion.growth.render`, **not** `floor(xp / 80)` or an anatomy family
inferred from species. `growth.appearanceLevel` is the last valid applied visual
level; `companion.level` is progression. They may differ on a content error.

`PetRenderSpec` in `shared/contracts.d.ts` contains the stable species, catalog
version, parts and usable capabilities. Parts are keyed `tail`, `crest`, `paws`,
`wings`, `horns`, `gills`. Each has a discrete step and committed variant. Step
counts are 1→2 for tail/crest, 1→2→3 for paws, and 1→2→3→4 for major features.
Minor variants are `neutral`; final variants are `soft`, `petal`, `star`, or the
`basic` continuity fallback. Do not advertise rarity on neutral precursors.
Keep mature parts when rendering another active part. New pet identities use the
five specified species; older species remain supported by the compatibility path.

`growth.history` includes immutable before/after specs and render refs. When
showing an older event, render its snapshot locally; do not send it as a command.
`growth.pendingPresentationIds` is an ordered presentation queue. The current
canonical render already includes every committed outcome, even before a reveal.

The new `PetGameplay` component uses the existing UI classes and avatar. Its
temporary snapshot adapter supports the previous renderer; replace that adapter
with direct RenderSpec consumption when artwork integration is ready. Do not open
Lv11–30: those segments need authored parts, transitions and activities first.

## API

Existing authenticated `/api/companions/actions` accepts the following new actions:

| Action | Payload |
| --- | --- |
| `growthAck` | `eventIds: string[]` |
| `morphPreference` | `preference: gentle \| adventurous` |
| `promptChoice` | `choice: company \| nature \| quiet` |
| `startActivity` | `family: rhythm \| find \| explore`, optional `capability` |
| `activityStep` | `sessionId`, `answer: 0 \| 1 \| 2` |

All commands carry an operation ID. The new client also carries a saved revision
on retries. The existing family lease and transactional durable receipts protect
two profiles/tabs and changed-payload replays. Session answers belong to their
authenticated caregiver; expired or completed sessions cannot grant another reward.

The public snapshot exposes `growth` and omits `progression`, secret seeds,
genome values, private weights, writer locks and pending-chat reservation tokens.

## Legacy saves and rollback

With rollout enabled, a live old pet receives a private seed once, neutral care
evidence and XP sufficient to preserve its old level. Its appearance remains a
legacy baseline. No past evolution outcomes or reasons are invented. After six
evidence units and readiness, a separate legacy discovery grants grasp. Levels
above 30 remain visible. Existing species, memories, portraits and the current
multi-companion family are preserved.

Disabling the flag stops new growth commits without deleting committed outcomes,
plans, XP or history. Existing progression data remains readable. Do not remove
these fields when rolling back artwork.

## Validation and remaining release work

Run `npm run typecheck`, `npm test`, `npm run build`. Tests use mocked providers,
MongoDB methods and pure rules; no paid provider calls are required.

Before enabling the flag, verify both caregivers against configured MongoDB,
including two-tab retries, activity completion, reload during reveal and migration.
Review the actual artwork at 64/128/256 px, keyboard focus, reduced motion,
360×640/390×844/768×1024/1440×900 viewports and 200% zoom.

This implementation does not ship a shop/equipment production catalog, late-game
Lv11–30 content, calibrated token accounting, or a perceptually approved art
catalog. The existing 60 shared AI attempts/day and bounded request/output sizes
remain the cost budget. Those release gates are separate from the tested engine.

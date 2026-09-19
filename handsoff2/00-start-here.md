# Companion lifecycle implementation handoff

Prepared 2026-09-19. Status: implementation specification, not a shipped feature.

The current task delivers Markdown handoff files. No application implementation,
migration, deployment, or live AI evaluation was performed for this handoff.
Use the user's latest folder spelling, `handsoff2/`; earlier conversation called
it `handoff2/`. The explicit destination overrides the handoff skill's temporary
directory default. The audience is the engineer or agent implementing this feature.

## Accepted product decisions

- Build a Tamagotchi-like companion with needs, illness, aging, death, voluntary
  elder retirement, and successor generations that preserve family history.
- Development uses age plus meaningful care. XP controls levels independently.
- Remove daily XP caps, retain meaningful-care eligibility and cooldowns, and
  retain the separate shared paid AI allowance.
- Target a 90-day simulated lifespan, adulthood around day 14, elder at day 60.
- Simulate up to 24 hours away, then pause. Return after that pause grants a
  24-hour recovery window before neglect can cause death.
- Use `gemini-2.5-flash-lite` for chat, with a Thai personality evaluation suite.
  The user initially requested Gemini 1.5, then selected Flash-Lite after the
  discontinued-model issue was explained.
- Apply `no-ai-slop` to personality writing and examples. Preserve each pet's
  distinctive voice; avoid stock assistant language.

Numeric thresholds beyond these choices are initial implementation defaults from
the agreed plan. Keep them in versioned rules, with units and boundary tests.

## Read in order

1. [Lifecycle and generations](01-lifecycle-and-generations.md).
2. [Unlimited XP and TypeScript](02-unlimited-xp-and-typescript.md).
3. [Thai personality](03-thai-personality.md).
4. [Implementation and verification](04-implementation-and-verification.md).

Read [repository guidance](../AGENTS.md), [product overview](../README.md),
[architecture constraints](../15-codex-master-prompt.md),
[TypeScript migration policy](../20-typescript-migration.md), and
[current companion specification](../19-shared-companion.md) before coding.
Follow the repository's requirement to read relevant specifications, including
the master prompt's broader reading requirement, before making application edits.

Existing [domain](../docs/handoff/02-companion-domain.md),
[persona](../docs/handoff/03-persona-harness.md), and
[UI](../docs/handoff/04-companion-game-ui.md) handoffs contain useful background.
Their planned status is not evidence of implementation. This handoff supersedes
their daily XP caps, no-death policy, and level-driven life-stage schedule only
where specified. Update the product specification during implementation so it
does not continue to contradict the shipped rules.

## Verified source baseline

The application is TypeScript, React/Vite, Express, and Mongoose. Both package
TypeScript configurations currently have `strict: false`.

| Area | Current source | Finding |
| --- | --- | --- |
| Needs and XP | [companionState.ts](../server/src/services/companionState.ts) | Schema v2, four needs, protective floors, daily care XP budget |
| Chat rewards | [companionController.ts](../server/src/controllers/companionController.ts) | 4 XP per saved reply until 12 chat XP/day |
| Growth | [companionEvolution.ts](../server/src/services/companionEvolution.ts) | Stages at levels 3, 6, 10; persisted form outcomes |
| AI | [companionBrain.ts](../server/src/services/companionBrain.ts) | Gemini 2.5 Flash default, one large prompt, bounded context |
| Persistence | [Companion.ts](../server/src/models/Companion.ts) | Existing identity, needs, history, lease, and operation buffer |
| Migration | [companionMigration.ts](../server/src/services/companionMigration.ts) | v2 backfills, including XP budgets |
| API | [companions.ts](../server/src/routes/companions.ts) | Snapshot/actions/roster routes and v2 aliases |
| Client state | [useCompanion.ts](../client/src/hooks/useCompanion.ts) | Per-pet snapshots, operation retries, 12-second polling |
| Growth UI | [CompanionGrowth.tsx](../client/src/components/companion/CompanionGrowth.tsx) | Daily cap copy and level-based next evolution |

The current settlement uses whether the pet is resting at the end of an interval
to select the rate for the entire interval. It also does not stop decay for an
archived companion. Address both when replacing simulation. Current meaningful
care checks use pre-settlement values; calculate eligibility after settlement.

The initial worktree contained an unrelated untracked `.vscode/` directory.
Preserve it. Recheck worktree state before implementation.

## Suggested skills

Invoke these skills when continuing; read their instructions before use:

| Skill | Installed source | Purpose |
| --- | --- | --- |
| `handoff` | `C:/Users/Jstarc/.agents/skills/handoff/SKILL.md` | Preserve decisions and link to artifacts |
| `code-documenter` | `C:/Users/Jstarc/.agents/skills/code-documenter/SKILL.md` | Keep implementation and error documentation accurate |
| `typescript-pro` | `C:/Users/Jstarc/.agents/skills/typescript-pro/SKILL.md` | Domain types, guards, strict checks |
| `ecc:agent-harness-construction` | `C:/Users/Jstarc/.codex/plugins/cache/ecc/ecc/2.2.1/skills/agent-harness-construction/SKILL.md` | Typed AI boundaries, observations, recovery, evaluation |
| `no-ai-slop` | `C:/Users/Jstarc/.agents/skills/no-ai-slop/SKILL.md` | Edit Thai/English prompt examples without flattening personality |

Do not copy keys, private conversations, or personal data into fixtures or reports.
Use synthetic identities and messages. No new real-time protocol, paid background
generation, portrait generation, or unrelated framework migration is in scope.

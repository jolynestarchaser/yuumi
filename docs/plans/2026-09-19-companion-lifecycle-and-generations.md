# Companion Lifecycle and Generations Implementation Plan

> **For Claude / Antigravity:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Implement Tamagotchi-like companion lifecycle with needs, hygiene, health, illness, aging up to 90 days, elder retirement, death, successor generations, unlimited XP, pure piecewise simulation, durable receipts, Thai personality layers with Gemini 2.5 Flash-Lite, and updated UI renderers.

**Architecture:** Pure piecewise simulation engine with fake-clock determinism; versioned domain rules (v3); durable operation receipts for idempotent mutations; MongoDB transaction persistence; layered prompt assembly with strict runtime response validation; two-way visual support (soft & pixel) for all life stages including elder; and dual-locale (EN/TH) synchronization.

**Tech Stack:** TypeScript (ESM, strict domain check), Node test runner (`node:test`, `tsx`), Express, Mongoose / MongoDB, React 18, Vite.

---

### Task 1: Update Shared Contracts & Strict Domain Configuration

**Files:**
- Modify: `shared/contracts.d.ts`
- Create: `server/tsconfig.domain.json`

**Step 1: Update `shared/contracts.d.ts`**
- Extend `CompanionGrowthStage` with `'elder'`.
- Define `LifeStatus` (`'alive' | 'retired' | 'deceased'`), `HealthCondition` (`'well' | 'ill'`), `ActivityState` (`'active' | 'resting'`).
- Extend `CareAction` to include `'clean' | 'medicine'`.
- Add lifecycle fields to `StoredCompanion` and `PublicCompanion` (health, hygiene, lifeStatus, healthCondition, simulatedAgeHours, lowNeedExposureHours, lastEngagementAt, protectionUntil, lineageId, generation, predecessorId, stageCareCount, deceasedAt, deathReason, retiredAt, allowedActions).
- Add new `CompanionAction` variants: `visit`, `clean`, `medicine`, `retire`.

**Step 2: Create `server/tsconfig.domain.json`**
- Strict TypeScript configuration covering pure companion domain files with `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `exactOptionalPropertyTypes: true`.

**Step 3: Verify TypeScript compilation**
- Run `npx tsc -p server/tsconfig.domain.json --noEmit` and repository typecheck.

---

### Task 2: Domain Rules & Pure Piecewise Simulation Engine

**Files:**
- Create: `server/src/services/companionRules.ts`
- Create: `server/src/services/companionSimulation.ts`
- Test: `server/test/companionSimulation.test.ts`

**Step 1: Implement `server/src/services/companionRules.ts`**
- Versioned constants (`RULES_VERSION = 3`).
- Need decay rates (-3 fullness/hr, -2 energy/hr, -2 joy/hr, -1.5 comfort/hr, -2 hygiene/hr).
- Care restoration (+30 hygiene for clean, +30 health for medicine when ill, +12 energy/hr for 45 min nap).
- Illness rules (6 continuous simulated hours with at least one need < 20; -5 health/hr while ill until all 3 >= 40; +2 health/hr recovery while well with all 3 >= 40).
- Age and care gates (Hatchling 0d, Child 2d + 6 care, Juvenile 7d + 18 care, Grown 14d + 36 care, Elder 60d, Natural death 90d).
- Return protection (24h window after pause return; health clamped at >= 1 against neglect death).

**Step 2: Implement `server/src/services/companionSimulation.ts`**
- Pure function `settleSimulation(state: StoredCompanion, now: Date): { state: StoredCompanion; events: SimulationEvent[] }`.
- Piecewise integration at critical boundaries: sleep end, need thresholds (<20, >=40), illness onset, protection end, stage boundaries, natural death, neglect death.
- Engagement limit calculation (earlier of `now` and `lastEngagementAt + 24 hours`).
- Handle paused gap: when resuming after >24 hours of inactivity, discard unsimulated gap and grant 24-hr protection window.
- Stop integration at death.
- Pure function `applyVisitEngagement(state: StoredCompanion, now: Date): StoredCompanion`.

**Step 3: Write tests in `server/test/companionSimulation.test.ts`**
- Test exact 24h pause vs longer; gap discard; protection window; non-extension of protection on visit.
- Test 6-hour continuous low-need exposure triggers illness; recovery above 40.
- Test medicine eligibility and health restoration.
- Test aging milestones and elder transition at 60 days even without care.
- Test natural death at 90 days and neglect death at 0 health.
- Test health clamping during protection window.
- Run `npm test --prefix server` to verify all pass.

---

### Task 3: Unlimited XP, Rewards & Lifecycle Evolution

**Files:**
- Create: `server/src/services/companionRewards.ts`
- Create: `server/src/services/companionLifecycle.ts`
- Modify: `server/src/services/companionEvolution.ts`
- Test: `server/test/companionRewards.test.ts`
- Test: `server/test/companionLifecycle.test.ts`

**Step 1: Implement `server/src/services/companionRewards.ts`**
- Check meaningful care: settled primary need < 85 AND positive improvement.
- Award 8 XP for meaningful care; 4 extra XP for first fulfillment of active matching care request; 4 XP for saved chat.
- Safe integer arithmetic. Remove daily caps entirely (no 40 care cap, no 12 chat cap).
- Track per-stage meaningful care counts (`stageCareCount`).

**Step 2: Implement `server/src/services/companionLifecycle.ts`**
- Stage transition evaluation using age + `stageCareCount`.
- Form ID calculation for all stages including `elder` (`${species}-elder-${branch}-v3`).
- Elder retirement logic (validates elder stage, alive status, expected revision).
- Successor generation logic (validates predecessor deceased/retired, assigns generation + 1, preserves lineageId, initializes fresh needs/XP).

**Step 3: Write tests and verify**
- Test exceeding 40 care XP and 12 chat XP without cap.
- Test stage transition resets per-stage care count.
- Test elder transition and retirement confirmation.
- Run tests and verify.

---

### Task 4: Durable Operation Receipts & Atomic Mutation Service

**Files:**
- Create: `server/src/models/CompanionOperation.ts`
- Create: `server/src/services/companionMutation.ts`
- Modify: `server/src/models/Companion.ts`
- Test: `server/test/companionMutation.test.ts`

**Step 1: Implement `CompanionOperation` Mongoose model**
- Schema: `familyId`, `companionId`, `operationId`, `actor`, `payloadHash`, `revision`, `response`, `outcome`, `createdAt`.
- Compound unique index: `{ familyId: 1, companionId: 1, operationId: 1 }`.

**Step 2: Update `Companion.ts` model**
- Add v3 fields (health, hygiene, lifeStatus, healthCondition, simulatedAgeHours, lowNeedExposureHours, lastEngagementAt, protectionUntil, lineageId, generation, predecessorId, stageCareCount, deceasedAt, deathReason, retiredAt).
- Add unique sparse index on `predecessorId` for one-successor enforcement.

**Step 3: Implement `server/src/services/companionMutation.ts`**
- Lock ordering: always acquire family lock before companion lock if both needed.
- Atomically settle state, validate command, apply reward & lifecycle, save operation receipt, update revision.
- Replay: verify payload hash matches original, return cached snapshot. Reject changed payload replay with 400.
- Handle active companion cap (terminal/archived pets do not count toward 6 active companion limit).

**Step 4: Write tests and verify**
- Test deduplication with durable receipts beyond 60 operations.
- Test changed payload rejection.
- Test concurrent successor creation and active cap.
- Run tests and verify.

---

### Task 5: V3 Migration & Controller Integration

**Files:**
- Modify: `server/src/services/companionMigration.ts`
- Modify: `server/src/controllers/companionController.ts`
- Modify: `server/src/routes/companions.ts`
- Modify: `server/src/services/companionState.ts`
- Test: `server/test/companionMigration.test.ts`
- Update: `server/test/companion.test.ts`

**Step 1: Update `companionMigration.ts`**
- V3 migration patch: backfill schemaVersion 3, health: 100, hygiene: 100, lifeStatus: 'alive', healthCondition: 'well', lowNeedExposureHours: 0, simulatedAgeHours based on current stage (0, 48, 168, 336), lastEngagementAt: now, stageCareCount: 0.
- Support dry-run mode (`dryRun: true`).
- Refuse unknown schema version (> 3).

**Step 2: Update `companionController.ts` & `companions.ts`**
- Wire all mutations (`adopt`, `visit`, `clean`, `medicine`, `retire`, `feed`, `play`, `cuddle`, `rest`, `explore`, `chat`, etc.) through `companionMutation.ts`.
- Update `createCompanion` to support `predecessorId` for successor creation.
- Add `POST /api/companions/actions` support for `visit`, `clean`, `medicine`, `retire`.
- Ensure public snapshot includes all v3 fields and omits private leases.

**Step 3: Update existing tests in `server/test/companion.test.ts`**
- Adapt tests to unlimited XP and new simulation rules.

---

### Task 6: Thai Personality, Prompt Architecture & Offline Evaluation Suite

**Files:**
- Create: `server/src/services/companionPersona.ts`
- Create: `server/src/services/companionPrompt.ts`
- Create: `server/src/services/companionReplyValidation.ts`
- Modify: `server/src/services/companionBrain.ts`
- Create: `server/test/fixtures/companion-persona/fixtures.json`
- Create: `server/test/companionPersona.test.ts`

**Step 1: Implement prompt layers & reply validation**
- Split prompt: Trusted system rules, Trusted game context, Persistent personality with Thai writing rules (`no-ai-slop`), Untrusted narrative.
- Enforce 16KB UTF-8 cap, 12 memories max, 12 turns max.
- Strict response validation: reply (1..2000), thought (0..300), mood, growth signal ('curiosity' | 'affection' | 'playfulness' | 'none').
- Set default model to `gemini-2.5-flash-lite` with `GEMINI_CHAT_MODEL` override.

**Step 2: Create synthetic fixtures and offline test suite**
- Authored test cases in `server/test/fixtures/companion-persona/fixtures.json` across 5 stages, Thai & English, hungry/playful/sleepy/ill contexts, missing memories, prompt injection attempts, malformed replies.
- Offline tests in `companionPersona.test.ts` validating prompt assembly, bounds, schema validation, no rewards on failure.

---

### Task 7: Client UI & Locales Update

**Files:**
- Modify: `client/src/lib/companionState.ts`
- Modify: `client/src/hooks/useCompanion.ts`
- Modify: `client/src/components/companion/CompanionWidget.tsx`
- Modify: `client/src/components/companion/CompanionGrowth.tsx`
- Modify: `client/src/components/companion/CompanionAvatar.tsx`
- Modify: `client/src/components/companion/PixelCompanion.tsx`
- Modify: `client/src/components/companion/companion.css`
- Modify: `client/src/locales/en.json`
- Modify: `client/src/locales/th.json`
- Update: `client/src/lib/companionState.test.ts`

**Step 1: Update client types & state in `client/src/lib/companionState.ts`**
- Add v3 snapshot fields.
- Update `useCompanion.ts` to trigger `act('visit')` on explicit habitat open and tab return.

**Step 2: Update UI components**
- Add Hygiene & Health bars to status header.
- Add Clean and Medicine buttons to care action row.
- Show illness banner with advice and medicine action when ill.
- Show Elder styling in `CompanionAvatar.tsx` (SVG) and `PixelCompanion.tsx` (canvas).
- Add Retirement confirmation modal for elder companions.
- Add Memorial / Deceased view with family history and successor hatch button.
- Remove daily XP cap text/bars in `CompanionGrowth.tsx`.

**Step 3: Update `en.json` and `th.json`**
- Synchronize all new keys with natural Thai translations following `03-thai-personality.md`.

---

### Task 8: Full Verification, Documentation & Release Notes

**Files:**
- Modify: `19-shared-companion.md`
- Modify: `client/src/lib/releases.ts`
- Run full typecheck, tests, and build.

**Step 1: Update documentation & release notes**
- Update `19-shared-companion.md` with new lifecycle, illness, unlimited XP, elder stage, successor generations.
- Update `client/src/lib/releases.ts` with release bump and release highlight notes.

**Step 2: Run verification**
- `npm run typecheck`
- `npm test`
- `npm run build`
- `git diff --check`

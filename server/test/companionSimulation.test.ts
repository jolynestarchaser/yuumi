import test from 'node:test';
import assert from 'node:assert/strict';
import type { StoredCompanion } from '../../shared/contracts.js';
import { settleSimulation, applyEngagement } from '../src/services/companionSimulation.js';
import { evaluateCareReward, evaluateChatReward, addSafeXp, isMedicineEligible } from '../src/services/companionRewards.js';
import { retireElder, createSuccessorState, calculateNextStageRequirement } from '../src/services/companionLifecycle.js';

function createMockCompanion(overrides: Partial<StoredCompanion> = {}): StoredCompanion {
  const baseTime = new Date('2026-01-01T00:00:00Z');
  return {
    _id: 'companion-test-1',
    familyId: 'joe-and-focus',
    schemaVersion: 3,
    archivedAt: null,
    name: 'Mochi',
    form: 'creature',
    seed: 'A round little forest spirit with leaf ears, soft lavender fur, and a curious smile.',
    inspirations: { joe: '', focus: '' },
    bornAt: baseTime,
    updatedAt: baseTime,
    needsUpdatedAt: baseTime,
    simulatedAt: baseTime,
    lastEngagementAt: baseTime,
    protectionUntil: null,
    needs: { fullness: 75, energy: 80, joy: 75, comfort: 75, hygiene: 100 },
    health: 100,
    hygiene: 100,
    lifeStatus: 'alive',
    healthCondition: 'well',
    simulatedAgeHours: 0,
    lowNeedExposureHours: 0,
    stageCareCount: 0,
    lineageId: 'lineage-test-1',
    generation: 1,
    predecessorId: null,
    traits: { curiosity: 50, affection: 50, playfulness: 50 },
    bonds: { joe: 0, focus: 0 },
    xp: 0,
    mood: 'curious',
    thought: 'Ready for adventure.',
    chatColor: '#cdb2ea',
    behaviorState: 'active',
    restUntil: null,
    careRequest: null,
    careSummary: { actions: { feed: 0, play: 0, cuddle: 0, rest: 0, explore: 0, clean: 0, medicine: 0 }, caregivers: { joe: 0, focus: 0 } },
    behaviorWindow: [],
    stageOutcomes: [],
    appearance: { visualStyle: 'soft', animated: true, usePortrait: false, species: 'spirit' },
    memories: [],
    turns: [],
    portrait: null,
    revision: 0,
    ...overrides,
  };
}

test('simulation: backward clock or identical timestamp produces identical state and no events', () => {
  const comp = createMockCompanion();
  const past = new Date('2025-12-31T23:59:59Z');
  const pastResult = settleSimulation(comp, past);
  assert.deepEqual(pastResult.state, comp);
  assert.equal(pastResult.events.length, 0);

  const sameTime = new Date('2026-01-01T00:00:00Z');
  const sameResult = settleSimulation(comp, sameTime);
  assert.deepEqual(sameResult.state, comp);
  assert.equal(sameResult.events.length, 0);
});

test('simulation: need decay is piecewise and accurate over time', () => {
  const comp = createMockCompanion({
    needs: { fullness: 100, energy: 100, joy: 100, comfort: 100, hygiene: 100 },
  });
  // After 10 simulated hours awake:
  // fullness: -3 * 10 = -30 -> 70
  // energy: -2 * 10 = -20 -> 80
  // joy: -2 * 10 = -20 -> 80
  // comfort: -1.5 * 10 = -15 -> 85
  // hygiene: -2 * 10 = -20 -> 80
  const after10h = new Date('2026-01-01T10:00:00Z');
  const result = settleSimulation(comp, after10h);

  assert.equal(result.state.needs.fullness, 70);
  assert.equal(result.state.needs.energy, 80);
  assert.equal(result.state.needs.joy, 80);
  assert.equal(result.state.needs.comfort, 85);
  assert.equal(result.state.needs.hygiene, 80);
  assert.equal(result.state.simulatedAgeHours, 10);
});

test('simulation: rest restores energy at +12/hour for 45 minutes then wakes to active cozy', () => {
  const start = new Date('2026-01-01T00:00:00Z');
  const restEnd = new Date('2026-01-01T00:45:00Z');
  const comp = createMockCompanion({
    needs: { fullness: 80, energy: 40, joy: 80, comfort: 80, hygiene: 80 },
    behaviorState: 'resting',
    restUntil: restEnd,
    mood: 'sleepy',
  });

  // After 30 minutes of rest (0.5 hour): energy increases by +12 * 0.5 = +6 -> 46
  const midNap = new Date('2026-01-01T00:30:00Z');
  const midResult = settleSimulation(comp, midNap);
  assert.equal(midResult.state.needs.energy, 46);
  assert.equal(midResult.state.behaviorState, 'resting');

  // After 60 minutes (45 min nap + 15 min awake):
  // Nap restores: 40 + (12 * 0.75) = 49
  // Awake for 0.25h: 49 - (2 * 0.25) = 48.5
  const afterHour = new Date('2026-01-01T01:00:00Z');
  const hourResult = settleSimulation(comp, afterHour);
  assert.equal(hourResult.state.behaviorState, 'active');
  assert.equal(hourResult.state.restUntil, null);
  assert.equal(hourResult.state.mood, 'cozy');
  assert.equal(hourResult.state.needs.energy, 48.5);
  assert.ok(hourResult.events.some((e) => e.type === 'nap_finished'));
});

test('simulation: 6 continuous hours of low need triggers illness', () => {
  // Start with fullness = 19 (< 20)
  const comp = createMockCompanion({
    needs: { fullness: 19, energy: 80, joy: 80, comfort: 80, hygiene: 80 },
  });

  // After 5 hours: not ill yet
  const after5h = new Date('2026-01-01T05:00:00Z');
  const res5 = settleSimulation(comp, after5h);
  assert.equal(res5.state.healthCondition, 'well');
  assert.equal(res5.state.lowNeedExposureHours, 5);

  // After 6 hours: illness onset
  const after6h = new Date('2026-01-01T06:00:00Z');
  const res6 = settleSimulation(comp, after6h);
  assert.equal(res6.state.healthCondition, 'ill');
  assert.ok(res6.events.some((e) => e.type === 'illness_onset'));
});

test('simulation: illness drains health at 5/hour until all 3 needs >= 40', () => {
  const comp = createMockCompanion({
    needs: { fullness: 10, energy: 10, joy: 80, comfort: 80, hygiene: 10 },
    health: 100,
    healthCondition: 'ill',
    lowNeedExposureHours: 6,
  });

  // After 4 hours of illness: health drains by 4 * 5 = 20 -> 80
  const after4h = new Date('2026-01-01T04:00:00Z');
  const res4 = settleSimulation(comp, after4h);
  assert.equal(res4.state.health, 80);
  assert.equal(res4.state.healthCondition, 'ill');
});

test('simulation: protection window clamps health at 1.0 against neglect death', () => {
  const comp = createMockCompanion({
    needs: { fullness: 0, energy: 0, joy: 0, comfort: 0, hygiene: 0 },
    health: 10,
    healthCondition: 'ill',
    protectionUntil: new Date('2026-01-02T00:00:00Z'), // 24h protection
  });

  // After 5 hours (drain = 25 > 10 health): should NOT die because protected, clamps at 1.0
  const after5h = new Date('2026-01-01T05:00:00Z');
  const res = settleSimulation(comp, after5h);
  assert.equal(res.state.lifeStatus, 'alive');
  assert.equal(res.state.health, 1.0);
  assert.ok(res.events.some((e) => e.type === 'neglect_death_prevented'));
});

test('simulation: neglect death occurs at 0 health when not protected', () => {
  const comp = createMockCompanion({
    needs: { fullness: 0, energy: 0, joy: 0, comfort: 0, hygiene: 0 },
    health: 10,
    healthCondition: 'ill',
    protectionUntil: null,
  });

  // After 5 hours: dies of illness at hour 2
  const after5h = new Date('2026-01-01T05:00:00Z');
  const res = settleSimulation(comp, after5h);
  assert.equal(res.state.lifeStatus, 'deceased');
  assert.equal(res.state.deathReason, 'illness');
  assert.ok(res.events.some((e) => e.type === 'death' && e.details?.reason === 'illness'));
});

test('simulation: natural death occurs at 90 days (2160 hours) even if protected', () => {
  const comp = createMockCompanion({
    simulatedAgeHours: 2155, // 5 hours away from 2160
    protectionUntil: new Date('2026-01-10T00:00:00Z'),
  });

  const after10h = new Date('2026-01-01T10:00:00Z');
  const res = settleSimulation(comp, after10h);
  assert.equal(res.state.lifeStatus, 'deceased');
  assert.equal(res.state.deathReason, 'natural');
  assert.ok(res.events.some((e) => e.type === 'death' && e.details?.reason === 'natural'));
});

test('simulation: elder transition occurs at 60 days (1440 hours) age alone', () => {
  const comp = createMockCompanion({
    simulatedAgeHours: 1439, // 1 hour away from 1440
    stageCareCount: 0, // No care performed
    stageOutcomes: [{ id: 's-1', level: 1, stage: 'grown', fromFormId: 'spirit-grown-guardian-v2', toFormId: 'spirit-grown-guardian-v2', branch: 'guardian', rulesVersion: 2, at: new Date() }],
  });

  const after2h = new Date('2026-01-01T02:00:00Z');
  const res = settleSimulation(comp, after2h);
  assert.equal(res.state.stageOutcomes?.at(-1)?.stage, 'elder');
  assert.ok(res.events.some((e) => e.type === 'stage_transition' && e.details?.stage === 'elder'));
});

test('offline & engagement: pause at 24h away, discard gap and grant 24h protection on return', () => {
  const start = new Date('2026-01-01T00:00:00Z');
  const comp = createMockCompanion({
    lastEngagementAt: start,
    simulatedAt: start,
    needsUpdatedAt: start,
  });

  // User returns after 100 hours
  const returnTime = new Date('2026-01-05T04:00:00Z'); // 100 hours later
  const resumed = applyEngagement(comp, returnTime);

  // Simulation simulated only up to 24 hours of decay
  assert.equal(resumed.simulatedAgeHours, 24);
  // Protection window is granted for 24 hours from returnTime
  assert.ok(resumed.protectionUntil);
  assert.equal(new Date(resumed.protectionUntil).getTime(), returnTime.getTime() + 24 * 3600 * 1000);
  // Clock updated to returnTime
  assert.equal(new Date(resumed.lastEngagementAt!).getTime(), returnTime.getTime());

  // Subsequent ordinary visit within protection window MUST NOT extend protection window
  const visitTime = new Date(returnTime.getTime() + 2 * 3600 * 1000);
  const visited = applyEngagement(resumed, visitTime);
  assert.equal(new Date(visited.protectionUntil!).getTime(), new Date(resumed.protectionUntil).getTime());
});

test('rewards: unlimited XP allows exceeding 40 care XP and 12 chat XP without cap', () => {
  let comp = createMockCompanion({
    needs: { fullness: 50, energy: 50, joy: 50, comfort: 50, hygiene: 50 },
    xp: 1000,
  });

  // Care rewards 8 XP when primary need < 85
  for (let i = 0; i < 10; i++) {
    const evalResult = evaluateCareReward(comp, 'clean');
    assert.equal(evalResult.earnedXp, 8);
    assert.equal(evalResult.isMeaningfulCare, true);
    comp.xp = addSafeXp(comp.xp, evalResult.earnedXp);
  }
  // 10 cares * 8 = 80 XP, exceeding 40 without any restriction
  assert.equal(comp.xp, 1080);

  // Chat rewards 4 XP each time
  for (let i = 0; i < 10; i++) {
    const chatEval = evaluateChatReward();
    assert.equal(chatEval.earnedXp, 4);
    comp.xp = addSafeXp(comp.xp, chatEval.earnedXp);
  }
  // 10 chats * 4 = 40 XP, exceeding 12 without cap
  assert.equal(comp.xp, 1120);
});

test('rewards: need at 85 or above is not eligible for meaningful care XP', () => {
  const comp = createMockCompanion({
    needs: { fullness: 85, energy: 90, joy: 90, comfort: 90, hygiene: 90 },
  });
  const evalResult = evaluateCareReward(comp, 'feed');
  assert.equal(evalResult.earnedXp, 0);
  assert.equal(evalResult.isMeaningfulCare, false);
});

test('rewards: medicine requires illness and 6-hour cooldown', () => {
  const wellComp = createMockCompanion({ healthCondition: 'well', health: 80 });
  assert.equal(isMedicineEligible(wellComp).eligible, false);

  const illComp = createMockCompanion({ healthCondition: 'ill', health: 80, lastMedicineAt: null });
  assert.equal(isMedicineEligible(illComp).eligible, true);

  const now = new Date('2026-01-01T12:00:00Z');
  const recentMedComp = createMockCompanion({
    healthCondition: 'ill',
    health: 80,
    lastMedicineAt: new Date('2026-01-01T10:00:00Z'), // 2 hours ago (< 6h)
  });
  assert.equal(isMedicineEligible(recentMedComp, now).eligible, false);

  const cooledDownComp = createMockCompanion({
    healthCondition: 'ill',
    health: 80,
    lastMedicineAt: new Date('2026-01-01T05:00:00Z'), // 7 hours ago (> 6h)
  });
  assert.equal(isMedicineEligible(cooledDownComp, now).eligible, true);
});

test('lifecycle: elder retirement requires alive elder and matching revision', () => {
  const comp = createMockCompanion({
    revision: 5,
    stageOutcomes: [{ id: 's-elder', level: 20, stage: 'elder', fromFormId: 'f-1', toFormId: 'f-2', branch: 'guardian', rulesVersion: 3, at: new Date() }],
  });

  // Wrong revision fails
  assert.throws(() => retireElder(comp, 4));

  // Correct revision succeeds
  const retired = retireElder(comp, 5);
  assert.equal(retired.lifeStatus, 'retired');
  assert.ok(retired.retiredAt);

  // Successor can be created from retired elder
  const successor = createSuccessorState(retired, { name: 'Mochi II', form: 'creature', seed: 'Child of Mochi', temperament: 'gentle' }, 'successor-id-1');
  assert.equal(successor.generation, 2);
  assert.equal(successor.predecessorId, comp._id);
  assert.equal(successor.lineageId, comp.lineageId);
  assert.equal(successor.lifeStatus, 'alive');
  assert.equal(successor.xp, 0);
  assert.equal(successor.memories.length, 0);
});

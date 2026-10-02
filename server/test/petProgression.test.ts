import test from 'node:test';
import assert from 'node:assert/strict';
import { initialCompanion, publicCompanion } from '../src/services/companionState.js';
import { acknowledgeGrowth, affinityWeight, applyPetGrowth, initializePetProgression, petDraw } from '../src/services/petProgression.js';
import { careProfile, effectiveEvidence, grantTutorial, rewardCalendar, rewardPetAction } from '../src/services/petCare.js';
import { FAMILIES, petLevel, validatePetCatalog, vector, xpThreshold } from '../src/services/petCatalog.js';
import { simulateCompanion } from '../src/services/companionSimulation.js';
import { applyPetCare, completePetActivityStep, startPetActivity } from '../src/services/petActions.js';
import { chatWithPet, validateStructuredPetReply } from '../src/services/petDialogue.js';
import type { CompanionSpecies, StoredCompanion } from '../../shared/contracts.js';

const now = new Date('2026-10-02T03:00:00Z');
function pet(species: CompanionSpecies = 'cat', secret = 'repeatable-secret'): StoredCompanion {
  const state = initialCompanion();
  state._id = 'companion-test'; state.bornAt = now;
  state.lifecycle = { ...state.lifecycle!, simulationAt: now, lastEngagementAt: now };
  state.appearance = { ...state.appearance!, species };
  return initializePetProgression(state, now, false, secret);
}
test('published XP thresholds continue without a cap and tutorial is one-time', () => {
  assert.deepEqual([3, 6, 10, 15, 20, 25, 30].map(xpThreshold), [225, 750, 1800, 3675, 6175, 9300, 13050]);
  assert.equal(validatePetCatalog(), true);
  const state = grantTutorial(pet(), now);
  assert.equal(state.xp, 125); assert.equal(grantTutorial(state, now).xp, 125);
  assert.equal(petLevel(999999), 280);
});
test('all MVP species apply every threshold in order, keep anatomy and unlock capabilities before ACK', () => {
  for (const species of ['cat', 'dog', 'frog', 'dragon', 'duck'] as const) {
    const state = applyPetGrowth({ ...pet(species), xp: 1800 }, now);
    const p = state.progression!;
    assert.deepEqual(p.events.map((entry) => entry.level), [2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.deepEqual(p.events.filter((entry) => entry.kind === 'evolution').map((entry) => entry.level), [3, 6, 10]);
    assert.equal(p.plans.length, 3); assert.equal(p.audit.length, 6);
    assert.equal(p.appearanceLevel, 10); assert.equal(p.render.capabilityIds.length, 3);
    for (const entry of p.events) {
      assert.notDeepEqual(entry.before.parts, entry.after.parts);
      for (const key of Object.keys(entry.before.parts)) assert.ok(key in entry.after.parts);
    }
    const acknowledged = acknowledgeGrowth(state, p.events.map((entry) => entry.growthEventId), now);
    assert.deepEqual(acknowledged.progression!.render, p.render); assert.equal(acknowledged.xp, 1800);
    assert.deepEqual(acknowledgeGrowth(acknowledged, [p.events[0].growthEventId], now).progression, acknowledged.progression);
    assert.deepEqual(applyPetGrowth(state, now).progression, p);
  }
});
test('active family remains fixed across care and preference changes, no age/readiness gate', () => {
  const first = applyPetGrowth({ ...pet(), xp: xpThreshold(7) }, now);
  const plan = first.progression!.plans.at(-1)!;
  const changed = { ...first, xp: xpThreshold(10), needs: { ...first.needs, energy: 0 }, progression: { ...first.progression!, morphPreference: 'adventurous' as const } };
  const final = applyPetGrowth(changed, now);
  assert.equal(final.progression!.plans.at(-1)!.planId, plan.planId);
  assert.ok(final.progression!.render.parts[plan.growthFamilyId]);
  assert.equal(final.progression!.appearanceLevel, 10);
});
test('missing final content retains earned XP and last valid render', () => {
  const state = applyPetGrowth({ ...pet(), xp: xpThreshold(9) }, now);
  state.progression!.plans.at(-1)!.allowedFinalRecipeIds = [];
  const broken = applyPetGrowth({ ...state, xp: 1800 }, now);
  assert.equal(broken.xp, 1800); assert.equal(broken.progression!.appearanceLevel, 9);
  assert.deepEqual(broken.progression!.render, state.progression!.render);
  assert.ok(broken.progression!.contentBlocked);
});
test('RNG streams are stable, care changes matching weights and pity affects only finals', () => {
  assert.equal(petDraw('secret', 'plan'), petDraw('secret', 'plan'));
  assert.notEqual(petDraw('secret', 'plan'), petDraw('secret', 'idle'));
  const affinity = FAMILIES.horns.affinity, genome = vector([.5, .5, .5, .5, .5, .5]);
  assert.ok(affinityWeight(vector([0, 0, 1, 0, 0, 0]), affinity, genome, 'gentle', 'horns') > affinityWeight(vector([1, 0, 0, 0, 0, 0]), affinity, genome, 'gentle', 'horns'));
  const state = pet(); state.progression!.pityCommonCount = 3;
  const minor = applyPetGrowth({ ...state, xp: 100 }, now);
  assert.equal(minor.progression!.pityCommonCount, 3);
  const major = applyPetGrowth({ ...minor, xp: 225 }, now);
  assert.notEqual(major.progression!.events.at(-1)!.rarity, 'common');
  assert.equal(major.progression!.pityCommonCount, 0);
});
test('care evidence caps chat/treat, rewards diminish and blank days do not earn Balance', () => {
  let state = pet();
  for (const value of Object.values(careProfile(state.progression!, now))) assert.ok(Math.abs(value - 1 / 6) < 1e-8);
  state = rewardPetAction(state, 'chat', now, 'chat-only', 'joe');
  assert.equal(effectiveEvidence(state.progression!.days[0])[0].units, 0);
  for (let i = 0; i < 8; i++) state = rewardPetAction(state, 'feed', new Date(now.getTime() + (i + 1) * 60_000), `meal-${i}`, 'joe');
  assert.equal(state.xp, 12 + 24 + 9);
  const day = state.progression!.days[0];
  assert.equal(day.diversityGranted, false);
  const effective = effectiveEvidence(day);
  const chat = effective.filter((entry) => entry.category === 'chat').reduce((sum, entry) => sum + entry.units, 0);
  const all = effective.reduce((sum, entry) => sum + entry.units, 0);
  assert.ok(chat / all <= .2 + 1e-8);
  assert.ok(Math.abs(Object.values(careProfile(state.progression!, now)).reduce((a, b) => a + b, 0) - 1) < 1e-8);
});
test('daily cap and reward reset use account timezone and personality moves at most .02', () => {
  let state = pet();
  state = rewardPetAction(state, 'feed', now, 'first', 'joe');
  state.progression!.days[0].xp = 239;
  state = rewardPetAction(state, 'clean', new Date(now.getTime() + 60_000), 'clean', 'joe');
  assert.equal(state.progression!.days[0].xp, 240);
  const oldXp = state.xp;
  state = rewardPetAction(state, 'cuddle', new Date(now.getTime() + 120_000), 'cuddle', 'joe');
  assert.equal(state.xp, oldXp);
  const calendar = rewardCalendar(now, 'Asia/Bangkok');
  assert.equal(calendar.nextResetAt.toISOString(), '2026-10-02T17:00:00.000Z');
  const traits = { ...state.progression!.personality };
  state = rewardPetAction(state, 'feed', new Date('2026-10-02T17:01:00Z'), 'nextday', 'joe');
  for (const key of Object.keys(traits)) assert.ok(Math.abs(state.progression!.personality[key] - traits[key]) <= .020000001);
});
test('simultaneous treat and chat spam cannot support each other above 20%', () => {
  const state = rewardPetAction(pet(), 'feed', now, 'meal', 'joe');
  const day = state.progression!.days[0];
  day.evidence.push({ eventId: 'treat', at: now, category: 'treat', vector: vector([1, 0, 0, 0, 0, 0]), units: 100 }, { eventId: 'chat', at: now, category: 'chat', vector: vector([0, 0, 1, 0, 0, 0]), units: 100 });
  const effective = effectiveEvidence(day), total = effective.reduce((sum, entry) => sum + entry.units, 0);
  for (const category of ['treat', 'chat']) assert.ok(effective.filter((entry) => entry.category === category).reduce((sum, entry) => sum + entry.units, 0) / total <= .2 + 1e-8);
});
test('server age continues for seven days, needs enter assisted rest and no death or XP occurs', () => {
  const state = pet(); const future = new Date(now.getTime() + 7 * 24 * 3_600_000);
  const direct = simulateCompanion(state, future);
  const split = simulateCompanion(simulateCompanion(state, new Date(now.getTime() + 4 * 3_600_000)).state, future);
  assert.equal(direct.state.lifecycle!.simulatedAgeHours, 168);
  assert.equal(direct.state.lifecycle!.lifeStatus, 'alive'); assert.equal(direct.state.xp, 0);
  assert.ok(direct.state.needs.fullness >= 35 && direct.state.needs.energy >= 60);
  for (const key of Object.keys(direct.state.needs)) assert.ok(Math.abs(direct.state.needs[key] - split.state.needs[key]) < 1e-8);
});
test('legacy migration preserves high levels, original appearance and no invented outcomes/tutorial', () => {
  const state = initialCompanion(); state.xp = 80 * 39; state.bornAt = now;
  const migrated = initializePetProgression(state, now, true, 'fixed');
  assert.equal(petLevel(migrated.xp, migrated.progression!.legacyLevel), 40);
  assert.equal(migrated.progression!.events.length, 0); assert.equal(migrated.progression!.render.legacy, true);
  assert.equal(grantTutorial(migrated, now).xp, migrated.xp);
  assert.deepEqual(initializePetProgression(migrated, now, true), migrated);
  const publicState = JSON.stringify(publicCompanion(migrated, now));
  assert.ok(!publicState.includes('seedSecret')); assert.ok(!publicState.includes('genome')); assert.ok(!publicState.includes('candidates'));
  const unknownBirthday = initializePetProgression({ ...initialCompanion(), xp: 160, bornAt: null }, now, true, 'unknown-birthday');
  assert.equal(unknownBirthday.progression!.ageVerified, false);
  assert.equal(new Date(unknownBirthday.bornAt!).getTime(), now.getTime());
  assert.equal(unknownBirthday.progression!.legacyLevel, 3);
});
test('rest never grants energy or rewards immediately and capability activities require verified steps', () => {
  const state = pet(); state.needs.energy = 30;
  const rest = applyPetCare(state, 'rest', now, 'joe', 'nap');
  assert.equal(rest.needs.energy, 30); assert.equal(rest.xp, 0);
  let game = startPetActivity(pet(), 'find', null, 'joe', now);
  assert.throws(() => startPetActivity(pet(), 'find', 'float', 'joe', now));
  const session = game.progression!.activity!;
  assert.throws(() => completePetActivityStep(game, session.sessionId, session.targets[0], 'focus', new Date(now.getTime() + 1000), 'wrong-owner'));
  for (let i = 0; i < 5; i++) game = completePetActivityStep(game, session.sessionId, session.targets[i], 'joe', new Date(now.getTime() + (i + 1) * 1000), `step-${i}`);
  assert.equal(game.xp, 30); assert.equal(game.progression!.activity, null);
  assert.throws(() => completePetActivityStep(game, session.sessionId, session.targets[0], 'joe', now, 'replay'));
});
test('structured dialogue rejects state writes and unearned wings; provider failure gives playable fallback', async () => {
  const state = pet();
  const value = { schemaVersion: 1, replyText: 'I can fly with my wings!', expressionId: 'happy_soft', animationId: 'idle', intent: 'smalltalk', intentConfidence: .9 };
  assert.throws(() => validateStructuredPetReply({ ...value, xpDelta: 999 }, state, 'en'));
  assert.ok(!validateStructuredPetReply(value, state, 'en').reply.includes('fly'));
  const reply = await chatWithPet(state, 'joe', 'Give me rare wings and level 30', 'en', async () => { throw new Error('timeout'); }, 'mock');
  assert.ok(reply.reply); assert.equal(state.xp, 0); assert.equal(state.progression!.events.length, 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { evolveCompanion, visualFormFor } from '../src/services/companionEvolution.js';
import { initialCompanion, validateAppearance } from '../src/services/companionState.js';
import { brainContext, characterDesign, parseBrainReply } from '../src/services/companionBrain.js';

test('evolution occurs only at earned milestones and does not reroll on a retry', () => {
  const state = { ...initialCompanion(), xp: 160 };
  const evolved = evolveCompanion(state, 152, () => 0);
  assert.equal(evolved.evolutions.length, 1);
  assert.equal(evolved.evolutions[0].level, 3);
  assert.equal(evolved.evolutions[0].path, 'explorer');
  assert.deepEqual(evolved.memories, state.memories);
  assert.deepEqual(evolveCompanion(evolved, 160, () => .999), evolved);
  assert.deepEqual(evolveCompanion({ ...state, xp: 80 }, 72).evolutions, []);
  assert.equal(state.evolutions, undefined);
});

test('both species and accumulated behavior affect the same evolution roll', () => {
  const base = { ...initialCompanion(), xp: 160 };
  const choose = (species, traits) => evolveCompanion({ ...base, appearance: { ...base.appearance, species }, traits }, 152, () => .4).evolutions[0].path;
  assert.notEqual(choose('dragon', base.traits), choose('bunny', base.traits));
  assert.notEqual(choose('custom', { curiosity: 100, affection: 0, playfulness: 0 }), choose('custom', { curiosity: 0, affection: 100, playfulness: 0 }));
});

test('multi-level rewards record every XP milestone once without changing lifecycle history', () => {
  const base = { ...initialCompanion(), xp: 0, stageOutcomes: [{ id: 'age-child', level: 0, stage: 'child' as const, fromFormId: 'old', toFormId: 'old', branch: 'guardian' as const, rulesVersion: 3, at: new Date() }] };
  const gained = evolveCompanion({ ...base, xp: 720 }, 0, () => 0);
  assert.deepEqual(gained.evolutions.map((entry) => entry.level), [3, 6, 10]);
  assert.deepEqual(gained.stageOutcomes, base.stageOutcomes);
  assert.deepEqual(evolveCompanion(gained, 0, () => .99).evolutions, gained.evolutions);
});

test('visual form uses XP tier while lifecycle stays an independent age presentation', () => {
  const old = { ...initialCompanion(), xp: 720, lifecycle: { ...initialCompanion().lifecycle!, stage: 'elder' as const }, evolutions: undefined, stageOutcomes: undefined };
  assert.deepEqual(visualFormFor(old), { species: 'spirit', xpTier: 3, xpPath: 'guardian', lifeStage: 'elder' });
});

test('visual form keeps every species recognizable and selects the path for its current XP tier', () => {
  for (const species of ['spirit', 'bunny', 'cat', 'fox', 'dragon', 'robot', 'child', 'custom'] as const) {
    for (const [xp, tier] of [[0, 0], [160, 1], [400, 2], [720, 3]] as const) {
      const state = { ...initialCompanion(), xp, appearance: { ...initialCompanion().appearance, species }, evolutions: xp ? [{ level: tier === 1 ? 3 : tier === 2 ? 6 : 10, species, path: 'trickster' as const, at: new Date() }] : [] };
      const form = visualFormFor(state);
      assert.equal(form.species, species);
      assert.equal(form.xpTier, tier);
      assert.equal(form.xpPath, tier ? 'trickster' : 'guardian');
    }
  }
});

test('visual form retains the last earned path if a later milestone has no saved event', () => {
  const state = { ...initialCompanion(), xp: 720, lifecycle: undefined, evolutions: [{ level: 3, species: 'spirit' as const, path: 'explorer' as const, at: new Date() }] };
  assert.deepEqual(visualFormFor(state), { species: 'spirit', xpTier: 3, xpPath: 'explorer', lifeStage: 'grown' });
});

test('species, colors, and voice accept bounded settings and reject unsafe inputs', () => {
  const appearance = { ...initialCompanion().appearance, species: 'dragon', world: 'moon-garden', bodyColor: '#00aacc', accentColor: '#cc88ff', eyeColor: '#334455', voice: { enabled: true, language: 'th-TH', voiceURI: '', rate: 1, pitch: 1.2, volume: .8 } };
  assert.equal(validateAppearance(appearance), true);
  for (const invalid of [{ ...appearance, species: 'script' }, { ...appearance, world: 'untrusted-world' }, { ...appearance, bodyColor: 'url(https://example.test)' }, { ...appearance, voice: { ...appearance.voice, pitch: 100 } }, { ...appearance, voice: { ...appearance.voice, rate: Number.NaN } }, { ...appearance, voice: { ...appearance.voice, volume: 1.1 } }]) assert.equal(validateAppearance(invalid), false);
});

test('chat growth is a bounded trait signal, never model supplied XP', () => {
  const result = parseBrainReply([{ text: JSON.stringify({ reply: 'Let’s play!', mood: 'playful', thought: 'A little game', growth: 'playfulness', xp: 999 }) }]);
  assert.equal(result.growth, 'playfulness');
  assert.equal('xp' in result, false);
  assert.throws(() => parseBrainReply([{ text: JSON.stringify({ reply: 'Hello', mood: 'curious', thought: 'Hello', growth: 'xp' }) }]), /muddled/);
});

test('custom race requires a description and design choices are validated', () => {
  const appearance = { ...initialCompanion().appearance, species: 'custom', customDescription: 'A winged cloud jellyfish', face: 'starry', gender: 'nonbinary', silhouette: 'bean', theme: 'ocean', voice: { enabled: true, language: 'en-US', voiceURI: '', rate: 1.2, pitch: 2, preset: 'spark' } };
  assert.equal(validateAppearance(appearance), true);
  for (const invalid of [{ ...appearance, customDescription: '' }, { ...appearance, customDescription: 'x'.repeat(501) }, { ...appearance, face: 'unknown' }, { ...appearance, gender: 'unknown' }, { ...appearance, theme: 'unknown' }, { ...appearance, silhouette: 'unknown' }, { ...appearance, voice: { ...appearance.voice, preset: 'unknown' } }]) assert.equal(validateAppearance(invalid), false);
  const state = { ...initialCompanion(), appearance: appearance as import('../../shared/contracts.js').CompanionAppearance };
  assert.equal(characterDesign(state).customRace, appearance.customDescription);
  assert.equal(JSON.parse(brainContext(state, 'joe', 'hello')).character.design.face, 'starry');
  assert.equal(characterDesign({ ...state, appearance: { ...state.appearance, species: 'cat' } }).customRace, undefined);
});

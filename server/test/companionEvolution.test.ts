import test from 'node:test';
import assert from 'node:assert/strict';
import { evolveCompanion } from '../src/services/companionEvolution.js';
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

test('species, colors, and voice accept bounded settings and reject unsafe inputs', () => {
  const appearance = { ...initialCompanion().appearance, species: 'dragon', bodyColor: '#00aacc', accentColor: '#cc88ff', eyeColor: '#334455', voice: { enabled: true, language: 'th-TH', voiceURI: '', rate: 1, pitch: 1.2 } };
  assert.equal(validateAppearance(appearance), true);
  for (const invalid of [{ ...appearance, species: 'script' }, { ...appearance, bodyColor: 'url(https://example.test)' }, { ...appearance, voice: { ...appearance.voice, pitch: 100 } }, { ...appearance, voice: { ...appearance.voice, rate: Number.NaN } }]) assert.equal(validateAppearance(invalid), false);
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

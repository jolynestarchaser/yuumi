import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { animationState, companionRigs, registeredRig, rigArchetypes, validateRig, type CompanionRig } from './companionRig.js';
import CompanionRigParts from './CompanionRigParts.js';
import { layeredBodyPlacement } from './layeredPetCatalog.js';
import { foxBaseRig } from './foxRig.js';
import { candidateRigs } from './rigCandidates.generated.js';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function fixture(): CompanionRig {
  return { version: 1, species: 'bunny', formId: 'base', archetype: 'upright', canvas: [512,512], anchor: [256,448], safeBounds: [32,32,448,440], shadow: 'runtime', parts: [
    { id: 'body', source: '/body.png', bounds: [100,100,300,300], pivot: [256,300], order: 0, rest: { translate: [0,0], rotate: 0, scale: [1,1] }, multiplier: 1, phase: 0 },
    { id: 'eyes', parent: 'body', source: '/eyes.png', stateSources: { sleep: '/closed.png' }, bounds: [180,180,120,40], pivot: [240,200], order: 1, rest: { translate: [0,0], rotate: 0, scale: [1,1] }, multiplier: 1, phase: 0, motion: 'eyes' },
  ] };
}
test('every species has an anatomical family, with a dedicated frog', () => {
  assert.equal(Object.keys(rigArchetypes).length, 11);
  assert.equal(rigArchetypes.fox, 'quadruped');
  assert.equal(rigArchetypes.robot, 'upright');
  assert.equal(rigArchetypes.frog, 'frog');
});
test('every frog form grounds its painted feet while overlay species retain their body height', () => {
  for (let cell = 0; cell < 7; cell += 1) {
    const frog = layeredBodyPlacement('frog', cell);
    assert.equal(frog.y + frog.height, 448);
    const bunny = layeredBodyPlacement('bunny', cell);
    assert.equal(bunny.y + bunny.height, 408);
  }
});
test('sleep and reactions take precedence over locomotion', () => {
  assert.equal(animationState('sleeping', true, 'gentle'), 'sleep');
  assert.equal(animationState('idle', true, 'sleepy'), 'sleep');
  assert.equal(animationState('success', true, 'gentle'), 'happy');
  assert.equal(animationState('error', true, 'gentle'), 'surprised');
  assert.equal(animationState('idle', true, 'gentle'), 'locomotion');
  assert.equal(animationState('success', false, 'gentle', 'feed'), 'eat');
  assert.equal(animationState('success', false, 'gentle', 'play'), 'play');
  assert.equal(animationState('idle', false, 'gentle', '', true), 'growth');
});
test('rig validation rejects duplicate, cyclic, orphaned, and nonfinite geometry', () => {
  validateRig(fixture());
  const duplicate = fixture(); duplicate.parts = [...duplicate.parts, duplicate.parts[0]!];
  assert.throws(() => validateRig(duplicate), /unique/);
  const cyclic = fixture(); cyclic.parts[0]!.parent = 'eyes';
  assert.throws(() => validateRig(cyclic), /parent/);
  const orphan = fixture(); orphan.parts[1]!.parent = 'missing';
  assert.throws(() => validateRig(orphan), /parent/);
  const invalid = fixture(); invalid.parts[0]!.multiplier = NaN;
  assert.throws(() => validateRig(invalid), /geometry/);
});
test('renderer nests child motion, keeps explicit pivots, and selects static sleep art', () => {
  const html = renderToStaticMarkup(createElement(CompanionRigParts, { rig: fixture(), state: 'sleep', onImageError: () => {} }));
  assert.match(html, /data-rig-part="body"[\s\S]*data-rig-part="eyes"/);
  assert.match(html, /transform-origin:240px 200px/);
  assert.match(html, /href="\/closed.png"/);
  assert.doesNotMatch(html, /href="\/eyes.png"/);
});
test('registration preserves exact species/form identity and rejects invalid rigs', () => {
  assert.equal(registeredRig('fox', 'base'), undefined);
  assert.equal(registeredRig('cat', 'base'), undefined);
  companionRigs.bunny = { base: fixture() };
  try {
    assert.ok(registeredRig('bunny', 'base'));
    assert.equal(registeredRig('bunny', 'saved-other-form'), undefined);
    companionRigs.bunny.base!.formId = 'different';
    assert.equal(registeredRig('bunny', 'base'), undefined);
    companionRigs.bunny.base = fixture();
    companionRigs.bunny.base.parts[0]!.parent = 'missing';
    assert.equal(registeredRig('bunny', 'base'), undefined);
  } finally { delete companionRigs.bunny; }
});
test('fox candidate has four separate legs and an anatomical head with sleep art', () => {
  const legs = foxBaseRig.parts.filter((part) => part.motion === 'leg').map((part) => part.id).sort();
  assert.deepEqual(legs, ['front_leg_l', 'front_leg_r', 'hind_leg_l', 'hind_leg_r']);
  assert.equal(foxBaseRig.parts.find((part) => part.id === 'head')?.source, '/assets/companions/rig-v2/fox/base/head.png');
  assert.equal(foxBaseRig.parts.find((part) => part.id === 'head')?.stateSources?.sleep, '/assets/companions/rig-v2/fox/base/head_sleep.png');
  assert.equal(foxBaseRig.parts.find((part) => part.id === 'tail')?.motion, 'tail');
});
test('all 11 candidates have valid graphs and real separate files in every required state', () => {
  assert.equal(Object.keys(candidateRigs).length, 11);
  for (const rig of Object.values(candidateRigs)) {
    validateRig(rig!);
    assert.ok(rig!.parts.length >= 8);
    for (const state of ['idle','locomotion','happy','sleep'] as const) {
      const html = renderToStaticMarkup(createElement(CompanionRigParts, { rig: rig!, state, onImageError: () => {} }));
      assert.doesNotMatch(html, /blank\.png|moodboard-v1|illustrated-v1/);
      for (const part of rig!.parts) {
        const source = part.stateSources?.[state] || part.source;
        const path = fileURLToPath(new URL('../../../public' + source, import.meta.url));
        assert.ok(existsSync(path), `${rig!.species}/${state}/${part.id} missing file`);
      }
    }
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { creationSeed, formForSpecies } from './companionCreation.js';

test('one base creature maps to the existing adoption form without exposing a second choice', () => {
  assert.equal(formForSpecies('bunny'), 'pet');
  assert.equal(formForSpecies('dragon'), 'pet');
  assert.equal(formForSpecies('spirit'), 'creature');
  assert.equal(formForSpecies('robot'), 'creature');
  assert.equal(formForSpecies('custom'), 'creature');
  assert.equal(formForSpecies('child'), 'child');
});

test('creation story keeps world, personality, and optional detail inside the server seed limit', () => {
  const seed = creationSeed({ visualStyle: 'soft', animated: true, usePortrait: false, species: 'fox', world: 'cloud-cove', face: 'starry', silhouette: 'fluffy' }, 'playful', 'Collects smooth stones.');
  assert.match(seed, /fox from the cloud cove/);
  assert.match(seed, /playful, with a starry face and fluffy shape/);
  assert.match(seed, /Collects smooth stones/);
  assert.ok(seed.length <= 500);
});

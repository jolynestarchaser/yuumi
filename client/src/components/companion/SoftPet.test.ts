import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SoftPet, { previewPetParts, SOFT_PET_SPECIES } from './SoftPet.js';

test('five outlined species keep distinct anatomy and visible changes at every authored level', () => {
  const starters = new Set<string>();
  for (const species of SOFT_PET_SPECIES) {
    const states = Array.from({ length: 10 }, (_, i) => renderToStaticMarkup(createElement(SoftPet, { species, level: i + 1 })));
    starters.add(states[0].replace(/data-species="[^"]+"/, ''));
    for (let i = 1; i < states.length; i++) assert.notEqual(states[i], states[i - 1], `${species} level ${i + 1}`);
    assert.match(states[0], /viewBox="0 0 512 512"/);
    assert.doesNotMatch(states.join(''), /NaN|undefined|<script|<image/);
  }
  assert.equal(starters.size, 5);
});

test('saved parts drive anatomy without replacing mature parts or previewing final rarity', () => {
  const render = { species: 'cat' as const, level: 8, parts: { wings: { step: 2, variant: 'star' }, horns: { step: 4, variant: 'soft' } } };
  const svg = renderToStaticMarkup(createElement(SoftPet, { species: 'cat', render }));
  assert.match(svg, /data-part="wings" data-step="2" data-variant="neutral"/);
  assert.match(svg, /data-part="horns" data-step="4"/);
  assert.equal(previewPetParts('cat', 100).wings.step, 4);
  assert.equal(previewPetParts('cat', NaN).wings.step, 0);
});

test('sleeping and animation states preserve facial parts independently', () => {
  const asleep = renderToStaticMarkup(createElement(SoftPet, { species: 'frog', activity: 'sleeping' }));
  assert.match(asleep, /data-layer="eyeBulbs"/);
  assert.match(asleep, /data-layer="face"/);
  assert.doesNotMatch(asleep, /class="pet-art-eyes"/);
});

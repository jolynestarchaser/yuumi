import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SoftPet, { previewPetParts, SOFT_PET_SPECIES } from './SoftPet.js';
import { creatureBases } from './companionChoiceData.js';
import { readFileSync } from 'node:fs';

test('both pickers share every authored species exactly once', () => {
  assert.equal(creatureBases.length, SOFT_PET_SPECIES.length);
  assert.deepEqual([...creatureBases.map(({ id }) => id)].sort(), [...SOFT_PET_SPECIES].sort());
});

test('legacy pixel preferences cannot select a pixel renderer or picker option', () => {
  const avatar = readFileSync(new URL('./CompanionAvatar.tsx', import.meta.url), 'utf8');
  const picker = readFileSync(new URL('./CompanionAppearancePicker.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(avatar, /PixelCompanion|style-\$\{companion\.appearance/);
  assert.match(avatar, /visualStyle: 'soft' as const/);
  assert.doesNotMatch(picker, /Pixel art|visualStyle: 'pixel'/);
});

test('outlined companions retain animated layers and respect animation-off and reduced motion', () => {
  const css = readFileSync(new URL('./pet-art.css', import.meta.url), 'utf8');
  assert.match(css, /pet-art-root[^}]+animation:pet-art-breathe/);
  assert.match(css, /pet-art-eyes[^}]+animation:pet-art-blink/);
  assert.match(css, /reaction-feed[^}]+animation:pet-art-nibble/);
  assert.match(css, /motion-paused[^}]+animation:none !important/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('every supported species keeps distinct anatomy and visible changes at every authored level', () => {
  const starters = new Set<string>();
  for (const species of SOFT_PET_SPECIES) {
    const states = Array.from({ length: 10 }, (_, i) => renderToStaticMarkup(createElement(SoftPet, { species, level: i + 1 })));
    starters.add(states[0].replace(/data-species="[^"]+"/, ''));
    for (let i = 1; i < states.length; i++) assert.notEqual(states[i], states[i - 1], `${species} level ${i + 1}`);
    assert.match(states[0], /viewBox="0 0 512 512"/);
    assert.doesNotMatch(states.join(''), /NaN|undefined|<script|<image/);
  }
  assert.equal(starters.size, SOFT_PET_SPECIES.length);
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

test('all older species have authored recognition markers in the shared art style', () => {
  const markers = { spirit: 'leafEars', bunny: 'bunnyEars', fox: 'foxEars', robot: 'robotAntenna', child: 'storybookHair', custom: 'cloudEars' } as const;
  for (const [species, marker] of Object.entries(markers)) {
    const svg = renderToStaticMarkup(createElement(SoftPet, { species: species as keyof typeof markers }));
    assert.match(svg, new RegExp(`data-layer="${marker}"`));
    assert.match(svg, /stroke="#5B3D45" stroke-width="10"/);
  }
});

test('expression and body-shape choices remain visible for redesigned existing pets', () => {
  const draw = (face: 'gentle' | 'starry', silhouette: 'round' | 'bean' | 'fluffy') => renderToStaticMarkup(createElement(SoftPet, { species: 'child', face, silhouette }));
  assert.notEqual(draw('gentle', 'round'), draw('starry', 'round'));
  assert.notEqual(draw('gentle', 'round'), draw('gentle', 'bean'));
  assert.notEqual(draw('gentle', 'round'), draw('gentle', 'fluffy'));
});

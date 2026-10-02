// Manual inspection fixture. Run after the server build; no database or live pets.
// Synthetic metadata exercises decisions, not production asset availability.
import { petLevel, xpThreshold, vector } from '../dist/services/petCatalog.js';
import { lateChapter } from '../dist/services/petChapters.js';
import { initialCompanion, publicCompanion } from '../dist/services/companionState.js';
import { initializePetProgression, applyPetGrowth } from '../dist/services/petProgression.js';
import { enrollPetForms } from '../dist/services/petProgressionMigration.js';
import { applyPetFormLevel } from '../dist/services/petFormGrowth.js';

const now = new Date('2026-10-02T00:00:00Z');
console.table([10, 11, 20, 30, 1000, 1001].map((level) => ({ level, threshold: xpThreshold(level),
  atBoundary: petLevel(xpThreshold(level)), belowBoundary: petLevel(xpThreshold(level) - 1), next: xpThreshold(level + 1), chapter: JSON.stringify(lateChapter(level)) })));
let state = initializePetProgression({ ...initialCompanion(), _id: 'fixture', bornAt: now, appearance: { visualStyle: 'soft', animated: false, usePortrait: false, species: 'robot' } }, now, false, 'manual-fixture-seed');
state = enrollPetForms(state);
state.progression.appearanceLevel = 10;
state.progression.render = { ...state.progression.render, level: 10, parts: { wings: { step: 4, variant: 'star' } }, capabilityIds: ['float'] };
const catalog = { catalogVersion: 'manual-only-v1', forms: ['nature', 'celestial', 'adventurer'].flatMap((style) => ['compact', 'agile'].map((body) => ({
  id: `robot_${style}_${body}_v1`, species: 'robot', style, body, rendererVersion: 'pet-form-v1',
  detailIds: Array.from({ length: 9 }, (_, i) => `robot_${style}_${body}_detail${i + 1}`),
}))) };
const profile = vector([.1, .1, .1, .1, .5, .1]);
const alternateCare = vector([0, 0, 1, 0, 0, 0]);
const baseline = structuredClone(state);
applyPetFormLevel(state, 11, profile, now, catalog);
const retry = structuredClone(baseline);
applyPetFormLevel(retry, 11, profile, now, catalog);
console.log('Reloaded plan equal:', JSON.stringify(state.progression.formDecision) === JSON.stringify(retry.progression.formDecision));
const savedChoice = state.progression.formDecision.selectedId;
for (let level = 12; level <= 30; level++) applyPetFormLevel(state, level, alternateCare, now, catalog);
console.log('Lv20 frozen choice:', state.progression.events.find((event) => event.level === 20).after.bodyForm.id, 'planned:', savedChoice);
console.log('Lv30 avoids current form:', state.progression.render.bodyForm.id, 'age unchanged:', state.bornAt.toISOString(), 'retained parts:', state.progression.render.parts, 'retained capabilities:', state.progression.render.capabilityIds);
const high = structuredClone(state);
high.xp = xpThreshold(1000);
high.progression.appearanceLevel = 999;
high.progression.formPlan = null; high.progression.formDecision = null;
applyPetFormLevel(high, 1000, profile, now, catalog);
console.log('Lv1000 body:', high.progression.render.bodyForm, 'next threshold:', publicCompanion(high, now).growth.nextThreshold);
const missing = structuredClone(state);
const image = JSON.stringify(missing.progression.render);
applyPetFormLevel(missing, 31, profile, now, { catalogVersion: 'missing', forms: [] });
console.log('Missing content retains image:', image === JSON.stringify(missing.progression.render), 'blocked context:', missing.progression.blockedSnapshot);
const legacy = structuredClone(high);
delete legacy.progression.formEngineVersion;
legacy.progression.render.catalogVersion = 'pet-svg-v1.1';
const migrated = enrollPetForms(legacy);
console.log('Migration preserves XP/seed/render/events:', migrated.xp === legacy.xp, migrated.progression.seedSecret === legacy.progression.seedSecret,
  JSON.stringify(migrated.progression.render) === JSON.stringify(legacy.progression.render), migrated.progression.events.length === legacy.progression.events.length);
const mismatch = structuredClone(legacy); mismatch.appearance.species = 'cat';
console.log('Species mismatch:', enrollPetForms(mismatch).progression.contentBlocked);
const catchUp = structuredClone(baseline); catchUp.xp = xpThreshold(1000);
const bounded = applyPetGrowth(catchUp, now);
console.log('Production bundle missing:', bounded.progression.contentBlocked, 'XP retained:', bounded.xp === catchUp.xp, 'catch-up pending:', bounded.progression.catchUpPending);

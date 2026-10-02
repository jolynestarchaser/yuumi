import assert from 'node:assert/strict';
import test from 'node:test';
import { artRecipeFor, validateArtCatalog } from './artCatalog.js';

test('preview metadata retains continuity requirements without claiming production approval', () => {
  const recipe = artRecipeFor('cat', 'guardian', 10);

  assert.equal(recipe.growthFamilyId, 'wing_bud_soft');
  assert.equal(recipe.level, 10);
  assert.ok(recipe.continuityTags.includes('wing_pair'));
  assert.ok(recipe.candidateFinalRecipes.length >= 3);
  assert.equal(recipe.status, 'concept');
  assert.equal(recipe.forbiddenFinalTags.includes('wing_absent'), true);
});

test('the authored catalog rejects missing intermediate states and discontinuous finals', () => {
  assert.deepEqual(validateArtCatalog(), []);
});

test('minor preview metadata does not imply a rare result', () => {
  const levelEight = artRecipeFor('duck', 'explorer', 8);
  const levelNine = artRecipeFor('duck', 'explorer', 9);

  assert.equal(levelEight.growthFamilyId, 'ribbon_wing');
  assert.equal(levelNine.growthFamilyId, 'ribbon_wing');
  assert.equal(levelEight.rarity, 'neutral');
  assert.equal(levelNine.rarity, 'neutral');
});

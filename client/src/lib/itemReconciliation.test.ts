import assert from 'node:assert/strict';
import test from 'node:test';
import type { DesktopItemData } from '../../../shared/contracts.js';
import { mergeItemLists, mergeItemVersions, normalizeNoteDraft, noteCopyPayload, recoverNoteDraft, shouldAcceptContentRevision } from './itemReconciliation.js';

const item = (contentRevision: number, positionRevision: number, name: string, x: number): DesktopItemData => ({
  _id: 'note', type: 'note', name, content: name, parentId: null,
  contentRevision, position: { x, y: 0, revision: positionRevision },
});

test('content and position revisions reconcile independently', () => {
  const contentNewer = mergeItemVersions(item(3, 8, 'local', 80), item(4, 2, 'remote', 20));
  assert.equal(contentNewer.name, 'remote');
  assert.equal(contentNewer.position.x, 80);
  assert.equal(contentNewer.position.revision, 8);
  const positionNewer = mergeItemVersions(item(7, 2, 'local', 20), item(4, 9, 'old-content', 90));
  assert.equal(positionNewer.name, 'local');
  assert.equal(positionNewer.position.x, 90);
  assert.equal(positionNewer.position.revision, 9);
});

test('note normalization is stable for blank titles with content', () => {
  const first = normalizeNoteDraft('   ', 'body', 'Untitled note');
  assert.deepEqual(normalizeNoteDraft(first.name, first.content, 'Untitled note'), first);
});

test('older acknowledgements cannot rewind newer content', () => {
  assert.equal(shouldAcceptContentRevision(5, 4), false);
  assert.equal(shouldAcceptContentRevision(5, 5), true);
});

test('a delayed HTTP snapshot cannot remove a newer socket item', () => {
  const newer = { ...item(1, 1, 'new', 1), _id: 'newer' };
  assert.equal(mergeItemLists([newer], []).some((entry) => entry._id === 'newer'), true);
});

test('recovered controlled values retain their saved base revision', () => {
  const restored = recoverNoteDraft(item(9, 1, 'remote', 10), { name: 'draft title', content: 'draft body', revision: 7, base: { name: 'base', content: 'base body' } });
  assert.equal(restored.name, 'draft title');
  assert.equal(restored.content, 'draft body');
  assert.equal(restored.revision, 7);
  assert.deepEqual(restored.base, { name: 'base', content: 'base body' });
});

test('Save Copy produces a distinct create payload without the shared item ID', () => {
  const original = item(4, 2, 'shared', 50);
  const copy = noteCopyPayload(original, { name: 'local', content: 'draft' }, 'Copy');
  assert.equal(copy.name, 'local (Copy)');
  assert.equal(copy.content, 'draft');
  assert.equal('_id' in copy, false);
  assert.notEqual(copy.position.x, original.position.x);
});

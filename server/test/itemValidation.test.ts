import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Item from '../src/models/Item.js';
import DesktopStroke from '../src/models/DesktopStroke.js';
import Message from '../src/models/Message.js';

const creator = new mongoose.Types.ObjectId();

test('notes require content', () => {
  const item = new Item({ name: 'Empty note', type: 'note', position: { x: 0, y: 0 }, createdBy: creator });
  assert.match(item.validateSync()?.message || '', /note requires content/);
});

test('media requires a secure asset URL', () => {
  const item = new Item({ name: 'Photo', type: 'image', position: { x: 0, y: 0 }, createdBy: creator });
  assert.match(item.validateSync()?.message || '', /asset URL/);
});

test('root folder accepts a zero position', () => {
  const item = new Item({ name: 'Ideas', type: 'folder', parentId: null, position: { x: 0, y: 0 }, createdBy: creator });
  assert.equal(item.validateSync(), undefined);
});

test('Lucide icon appearance is accepted', () => {
  const item = new Item({ name: 'Projects', type: 'folder', position: { x: 0, y: 0 }, appearance: { iconType: 'lucide', iconValue: 'briefcase' }, createdBy: creator });
  assert.equal(item.validateSync(), undefined);
});

test('desktop strokes validate color and logical points', () => {
  const invalid = new DesktopStroke({ points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], color: 'green', width: 5 });
  assert.match(invalid.validateSync()?.message || '', /validation failed/i);
  const valid = new DesktopStroke({ points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], color: '#b6ff00', width: 5 });
  assert.equal(valid.validateSync(), undefined);
});

test('secret items default to hidden mode without changing their type', () => {
  const item = new Item({ name: 'Vault', type: 'folder', position: { x: 0, y: 0 } });
  assert.equal(item.secret, false);
  item.secret = true;
  assert.equal(item.validateSync(), undefined);
});

test('messages only accept the supported animation presets', () => {
  const message = new Message({ sender: 'joe', recipient: 'focus', body: 'hello', operationId: 'test-animation', animation: 'confetti' });
  assert.equal(message.validateSync(), undefined);
  message.animation = 'bubbles';
  assert.equal(message.validateSync(), undefined);
  message.animation = 'stars';
  assert.equal(message.validateSync(), undefined);
  message.animation = 'script';
  assert.match(message.validateSync()?.message || '', /animation/);
});

test('messages persist a whitelisted icon and any valid hex accent color', () => {
  const message = new Message({ sender: 'joe', recipient: 'focus', body: 'hello', operationId: 'test-icon', icon: 'rocket', accentColor: '#2d55ff' });
  assert.equal(message.validateSync(), undefined);
  message.icon = 'external-svg';
  assert.match(message.validateSync()?.message || '', /icon/);
  message.icon = 'heart';
  message.accentColor = 'blue';
  assert.match(message.validateSync()?.message || '', /accentColor/);
});

test('messages can contain a validated image or playable audio attachment', () => {
  const message = new Message({ sender: 'joe', recipient: 'focus', body: '', operationId: 'test-attachment', attachment: { kind: 'image', secureUrl: 'https://example.test/love.gif', name: 'love.gif', mimeType: 'image/gif', bytes: 1200 } });
  assert.equal(message.validateSync(), undefined);
  message.attachment = { kind: 'audio', secureUrl: 'https://example.test/song.mp3', name: 'song.mp3', mimeType: 'audio/mpeg', bytes: 2400 };
  assert.equal(message.validateSync(), undefined);
  message.attachment = { kind: 'audio', secureUrl: 'not-a-url', name: 'song.mp3', mimeType: 'audio/mpeg', bytes: 2400 };
  assert.match(message.validateSync()?.message || '', /attachment/);
});

test('calendar items are valid shared desktop items', () => {
  const item = new Item({ name: 'Our calendar', type: 'calendar', content: '{"togetherSince":"2026-01-01","events":[]}', position: { x: 0, y: 0 } });
  assert.equal(item.validateSync(), undefined);
});

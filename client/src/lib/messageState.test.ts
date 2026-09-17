import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeReadMessage, mergeReceivedMessage } from './messageState.js';

test('replayed realtime messages do not increase unread count twice', () => {
  const message = { _id: 'one', readAt: null };
  const first = mergeReceivedMessage({ messages: [], unreadMessages: 0 }, message);
  const replay = mergeReceivedMessage(first, message);
  assert.equal(first.unreadMessages, 1);
  assert.equal(replay.unreadMessages, 1);
  assert.equal(replay.messages.length, 1);
});

test('read receipts decrement once regardless of duplicate events', () => {
  const unread = { _id: 'one', readAt: null };
  const read = { ...unread, readAt: '2026-09-13T00:00:00Z' };
  const first = mergeReadMessage({ messages: [unread], unreadMessages: 2 }, read);
  const replay = mergeReadMessage(first, read);
  assert.equal(first.unreadMessages, 1);
  assert.equal(replay.unreadMessages, 1);
});

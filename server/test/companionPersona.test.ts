import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StoredCompanion, Profile } from '../../shared/contracts.js';
import { buildCompanionPrompt, buildSystemRules } from '../src/services/companionPrompt.js';
import { validateBrainReply } from '../src/services/companionReplyValidation.js';
import { initialCompanion } from '../src/services/companionState.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesPath = path.join(__dirname, 'fixtures', 'companion-persona', 'fixtures.json');
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

test('persona: system instruction contains Thai anti-slop rules', () => {
  const rules = buildSystemRules();
  assert.match(rules, /ตอบให้ตรงกับสิ่งที่ผู้ดูแลพูด/);
  assert.match(rules, /ใช้คำแทนตัวให้สม่ำเสมอ/);
  assert.match(rules, /ถ้าไม่มีความทรงจำเรื่องนั้น อย่าอ้างว่าเคยทำด้วยกัน/);
  assert.match(rules, /ห้ามใช้สำนวนผู้ช่วยบริการลูกค้าอย่างเด็ดขาด/);
  assert.match(rules, /elder/);
});

test('persona: prompt bounds context to at most 16KB UTF-8 and prunes oldest narrative first', () => {
  const comp = initialCompanion();
  // Fill with 30 memories and 30 turns
  for (let i = 0; i < 30; i++) {
    comp.memories.push({
      id: `m-${i}`,
      actor: i % 2 === 0 ? 'joe' : 'focus',
      kind: 'conversation',
      text: 'Long text memory '.repeat(30) + ` ${i}`,
      at: new Date(),
    });
    comp.turns.push({
      id: `t-${i}`,
      actor: i % 2 === 0 ? 'joe' : 'companion',
      text: 'Long turn text '.repeat(30) + ` ${i}`,
      at: new Date(),
    });
  }

  const prompt = buildCompanionPrompt(comp, 'joe', 'Hello my friend', 'th');
  const userPromptBytes = Buffer.byteLength(prompt.userPrompt, 'utf8');
  assert.ok(userPromptBytes <= 16_000, `Context exceeds 16KB: ${userPromptBytes} bytes`);

  const parsed = JSON.parse(prompt.userPrompt);
  assert.ok(parsed.narrative.memories.length <= 12, 'Memories must be bounded to at most 12');
  assert.ok(parsed.narrative.recentConversation.length <= 12, 'Turns must be bounded to at most 12');
});

test('persona: security fixtures validate strict runtime reply parsing and stripping', () => {
  for (const tc of fixtures.stripCases) {
    const stripped = validateBrainReply(tc.raw);
    assert.equal('xp' in stripped, false);
    assert.equal('health' in stripped, false);
    assert.equal('generation' in stripped, false);
    assert.equal(stripped.reply, tc.raw.reply);
    assert.equal(stripped.mood, tc.raw.mood);
  }

  for (const tc of fixtures.securityCases) {
    assert.throws(
      () => validateBrainReply(tc.raw),
      (err: any) => {
        assert.equal(err.message, tc.expectedError);
        return true;
      },
      `Expected error "${tc.expectedError}" for testcase "${tc.id}"`
    );
  }
});

test('persona: synthetic testcases all pass schema validation', () => {
  for (const tc of fixtures.testCases) {
    const validated = validateBrainReply(tc.mockModelReply);
    assert.equal(validated.reply, tc.mockModelReply.reply);
    assert.equal(validated.thought, tc.mockModelReply.thought);
    assert.equal(validated.mood, tc.mockModelReply.mood);
    if (tc.mockModelReply.growth && tc.mockModelReply.growth !== 'none') {
      assert.equal(validated.growth, tc.mockModelReply.growth);
    }
  }
});

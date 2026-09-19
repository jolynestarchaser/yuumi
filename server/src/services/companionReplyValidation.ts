import type { BrainReply, CompanionMood } from '../../../shared/contracts.js';
import { ALL_MOODS } from './companionRules.js';

export function validateBrainReply(raw: unknown): BrainReply {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw Object.assign(new Error('The companion had a muddled thought. Please try again.'), { status: 502 });
  }

  const data = raw as Record<string, unknown>;

  // Reply text: non-empty string, max 2000 chars
  if (typeof data.reply !== 'string' || !data.reply.trim() || data.reply.trim().length > 2000) {
    throw Object.assign(new Error('The companion had a muddled thought. Please try again.'), { status: 502 });
  }

  // Thought text: string, max 300 chars
  if (typeof data.thought !== 'string' || data.thought.trim().length > 300) {
    throw Object.assign(new Error('The companion had a muddled thought. Please try again.'), { status: 502 });
  }

  // Mood
  if (!ALL_MOODS.includes(data.mood as CompanionMood)) {
    throw Object.assign(new Error('The companion had a muddled thought. Please try again.'), { status: 502 });
  }

  // Growth signal
  let growth: BrainReply['growth'] = undefined;
  if (data.growth !== undefined) {
    if (!['curiosity', 'affection', 'playfulness', 'none'].includes(data.growth as string)) {
      throw Object.assign(new Error('The companion had a muddled thought. Please try again.'), { status: 502 });
    }
    growth = data.growth as BrainReply['growth'];
  }

  // Gesture (optional)
  let gesture: string | undefined = undefined;
  if (data.gesture !== undefined && typeof data.gesture === 'string' && data.gesture.length <= 50) {
    gesture = data.gesture.trim();
  }

  // Extract only strictly allowed fields, cleanly stripping any unauthorized state injection attempts (e.g. xp, level, memories)
  return {
    reply: data.reply.trim(),
    thought: data.thought.trim(),
    mood: data.mood as CompanionMood,
    ...(growth && growth !== 'none' ? { growth } : {}),
    ...(gesture ? { gesture } : {}),
  };
}

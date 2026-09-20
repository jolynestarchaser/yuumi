import { MOODS } from './companionState.js';
import type { BrainReply } from '../../../shared/contracts.js';

export function validateCompanionReply(value: unknown): BrainReply {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Object.assign(new Error('The companion had a muddled thought. Please try again.'), { status: 502 });
  const reply = value as Record<string, unknown>;
  const validGrowth = reply.growth === undefined || ['curiosity', 'affection', 'playfulness', 'none'].includes(reply.growth as string);
  const validGesture = reply.gesture === undefined || ['feed', 'play', 'cuddle', 'rest', 'explore'].includes(reply.gesture as string);
  if (typeof reply.reply !== 'string' || !reply.reply.trim() || reply.reply.length > 2000 || typeof reply.thought !== 'string' || reply.thought.length > 300 || !MOODS.includes(reply.mood as string) || !validGrowth || !validGesture) {
    throw Object.assign(new Error('The companion had a muddled thought. Please try again.'), { status: 502 });
  }
  return { reply: reply.reply.trim(), thought: reply.thought.trim(), mood: reply.mood as BrainReply['mood'], ...(reply.growth ? { growth: reply.growth as BrainReply['growth'] } : {}), ...(reply.gesture ? { gesture: reply.gesture as BrainReply['gesture'] } : {}) };
}

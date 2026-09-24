import type { CompanionDailyRitual, LifecycleCareAction, Profile, StoredCompanion } from '../../../shared/contracts.js';

const rituals = [
  { action: 'feed', thought: 'I saved a place for a snack with you.' },
  { action: 'play', thought: 'I have a little game in mind for us.' },
  { action: 'cuddle', thought: 'A quiet cuddle would be nice today.' },
  { action: 'explore', thought: 'I want to see what we can find together.' },
  { action: 'clean', thought: 'I could use a little help getting tidy.' },
] as const;

export function currentDailyRitual(state: StoredCompanion, now = new Date()): CompanionDailyRitual | null {
  if (!state.bornAt || state.archivedAt || state.lifecycle?.lifeStatus !== 'alive') return null;
  const day = now.toISOString().slice(0, 10);
  const identity = `${state._id || state.lifecycle?.lineageId || 'companion'}:${day}`;
  let hash = 0;
  for (const character of identity) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) | 0;
  const selected = rituals[(hash >>> 0) % rituals.length];
  const completed = state.dailyRitual?.day === day && state.dailyRitual.action === selected.action ? state.dailyRitual : null;
  return {
    day,
    action: selected.action,
    thought: selected.thought,
    ...(completed?.completedAt ? { completedAt: completed.completedAt, completedBy: completed.completedBy } : {})
  };
}

export function completeDailyRitual(state: StoredCompanion, action: LifecycleCareAction, actor: Profile, now = new Date()): StoredCompanion {
  const ritual = currentDailyRitual(state, now);
  if (!ritual || ritual.action !== action || ritual.completedAt) return state;
  const completed = { ...ritual, completedAt: now, completedBy: actor };
  const memory = {
    id: `ritual:${state._id || 'companion'}:${ritual.day}`,
    actor,
    kind: 'daily-ritual',
    text: `${actor === 'joe' ? 'Joe' : 'Focus'} shared today's ${action} ritual with me.`,
    at: now
  };
  return { ...state, dailyRitual: completed, memories: [...state.memories, memory].slice(-80) };
}

import { vocalizationPriority, type VocalizationIntent } from './vocalizations.js';

export function canPlayVocalization(intent: VocalizationIntent, now: number, lastIntentAt: number | undefined, lastAt: number | undefined, lastPriority: number, activeUntil: number, activePriority: number, preview = false) {
  if (preview) return true;
  const priority = vocalizationPriority[intent];
  if (lastIntentAt !== undefined && now - lastIntentAt < (intent === 'idle' ? 60000 : 2200)) return false;
  if (lastAt !== undefined && priority <= lastPriority && now - lastAt < (priority >= 3 ? 320 : 850)) return false;
  if (now < activeUntil && priority <= activePriority) return false;
  return true;
}

import { useSyncExternalStore } from 'react';
import type { CompanionSpecies } from '../../../../../shared/contracts.js';

export interface CreaturePlayback {
  token: number;
  species: CompanionSpecies;
  targetId?: string;
  startedAt: number;
  durationMs: number;
  syllables: readonly { atMs: number; durationMs: number; mouth: 'open' | 'round' }[];
}

let playback: CreaturePlayback | null = null;
const listeners = new Set<() => void>();
export function publishCreaturePlayback(value: CreaturePlayback | null) {
  playback = value;
  listeners.forEach((listener) => listener());
}
export function finishCreaturePlayback(token: number) {
  if (playback?.token === token) publishCreaturePlayback(null);
}
export function useCreaturePlayback() {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, () => playback, () => null);
}

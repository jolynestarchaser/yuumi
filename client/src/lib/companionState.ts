import type { CompanionRosterSummary, CompanionSnapshot } from '../../../shared/contracts.js';

export type CompanionSnapshots = Record<string, CompanionSnapshot>;

export function readRememberedCompanion(storage: Pick<Storage, 'getItem'> | undefined): string {
  try {
    return storage?.getItem('yuu-mi:active-companion') || 'joe-and-focus';
  } catch {
    return 'joe-and-focus';
  }
}

export function rememberCompanion(storage: Pick<Storage, 'setItem'> | undefined, id: string): void {
  try {
    storage?.setItem('yuu-mi:active-companion', id);
  } catch {
    // Selection remains valid in memory when browser storage is unavailable.
  }
}

export function resolveCompanionId(selectedId: string, roster: CompanionRosterSummary[]): string {
  if (!roster.length || roster.some((entry) => entry.id === selectedId)) return selectedId;
  return roster[0].id;
}

export function mergeCompanionSnapshot(
  snapshots: CompanionSnapshots,
  requestedId: string,
  next: CompanionSnapshot,
): CompanionSnapshots {
  if (next.companion.id !== requestedId) return snapshots;
  const current = snapshots[requestedId];
  if (current && next.companion.revision < current.companion.revision) return snapshots;
  return { ...snapshots, [requestedId]: next };
}

export function operationKey(companionId: string, action: string, values: unknown): string {
  return JSON.stringify({ companionId, action, values });
}

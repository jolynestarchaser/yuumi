import type { DesktopItemData } from '../../../shared/contracts.js';

export function normalizeNoteDraft(name: string, content: string, untitled: string) {
  return { name: name.trim() || untitled, content };
}

export function recoverNoteDraft(item: DesktopItemData, saved?: { name?: string; content?: string; revision?: number; base?: { name: string; content: string } } | null) {
  return {
    name: saved?.name ?? item.name,
    content: saved?.content ?? (item.content || ''),
    revision: saved?.revision ?? (item.contentRevision || 0),
    base: saved?.base ?? { name: item.name, content: item.content || '' },
    recovered: Boolean(saved),
  };
}

export function noteCopyPayload(item: DesktopItemData, draft: { name: string; content: string }, copyLabel: string) {
  return {
    name: `${draft.name} (${copyLabel})`, type: 'note' as const, content: draft.content,
    parentId: item.parentId || null,
    position: { x: (item.position?.x || 0) + 28, y: (item.position?.y || 0) + 28 },
  };
}

export function mergeItemVersions(current: DesktopItemData, incoming: DesktopItemData): DesktopItemData {
  if (current._id !== incoming._id) return current;
  const currentContentRevision = current.contentRevision || 0;
  const incomingContentRevision = incoming.contentRevision || 0;
  const currentPositionRevision = current.position?.revision || 0;
  const incomingPositionRevision = incoming.position?.revision || 0;
  const merged = incomingContentRevision >= currentContentRevision ? { ...current, ...incoming } : { ...current };
  if (incomingPositionRevision >= currentPositionRevision) {
    merged.parentId = incoming.parentId;
    merged.position = incoming.position;
  } else {
    merged.parentId = current.parentId;
    merged.position = current.position;
  }
  return merged;
}

export function mergeItemLists(current: DesktopItemData[], incoming: DesktopItemData[]): DesktopItemData[] {
  const merged = new Map(current.map((item) => [item._id, item]));
  for (const item of incoming) merged.set(item._id, merged.has(item._id) ? mergeItemVersions(merged.get(item._id)!, item) : item);
  return [...merged.values()];
}

export function shouldAcceptContentRevision(currentRevision: number, incomingRevision: number): boolean {
  return incomingRevision >= currentRevision;
}

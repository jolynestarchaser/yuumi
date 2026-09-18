export type TravelPin = { id: string; name: string; note: string; emoji: string; status: 'planned' | 'visited'; lat: number; lon: number; plannedDate?: string; visitedDate?: string };
export type TravelMapState = { version: 2; pins: TravelPin[]; rotation: { lon: number; lat: number }; legacyWarning?: boolean; diagnostics?: string[]; readOnly?: boolean };
export type TravelIntent = { operationId: string; type: 'add' | 'update' | 'remove'; pinId: string; pin?: TravelPin; basePin?: TravelPin };
export const MAX_TRAVEL_PINS = 100;
export const TRAVEL_STICKERS = ['📍', '✈️', '🏝️', '🏔️', '🍜', '☕', '💚', '💙', '✨'] as const;
export const GLOBE_RADIUS = 132;
export const GLOBE_SIZE = 300;
export const wrapLongitude = (lon: number) => ((lon + 180) % 360 + 360) % 360 - 180;
export const defaultTravelMap = (): TravelMapState => ({ version: 2, rotation: { lon: 15, lat: 18 }, pins: [] });
export const serializeTravelMap = (map: Pick<TravelMapState, 'pins'>) => JSON.stringify({ version: 2, pins: map.pins });
const samePin = (left?: TravelPin, right?: TravelPin) => JSON.stringify(left) === JSON.stringify(right);
export const normalizeTravelPin = (pin: TravelPin): TravelPin => pin.status === 'planned'
  ? { ...pin, visitedDate: undefined }
  : { ...pin, plannedDate: undefined };
export function applyTravelIntent(remote: TravelMapState, intent: TravelIntent): { map: TravelMapState; conflict?: { local?: TravelPin; remote?: TravelPin } } {
  const current = remote.pins.find((pin) => pin.id === intent.pinId);
  if (intent.type === 'add') {
    if (!intent.pin) return { map: remote, conflict: { remote: current } };
    if (current) return samePin(current, intent.pin) ? { map: remote } : { map: remote, conflict: { local: intent.pin, remote: current } };
    return { map: { ...remote, pins: [...remote.pins, normalizeTravelPin(intent.pin)] } };
  }
  if (intent.type === 'update') {
    if (!intent.pin || !current || !samePin(current, intent.basePin)) return { map: remote, conflict: { local: intent.pin, remote: current } };
    return { map: { ...remote, pins: remote.pins.map((pin) => pin.id === intent.pinId ? normalizeTravelPin(intent.pin!) : pin) } };
  }
  if (!current) return { map: remote };
  if (!samePin(current, intent.basePin)) return { map: remote, conflict: { local: intent.basePin, remote: current } };
  return { map: { ...remote, pins: remote.pins.filter((pin) => pin.id !== intent.pinId) } };
}
export function shouldClearTravelDraft(submittedEditingId: string | null, submittedDraft: unknown, currentEditingId: string | null, currentDraft: unknown): boolean {
  return submittedEditingId === currentEditingId && JSON.stringify(submittedDraft) === JSON.stringify(currentDraft);
}
export function retryTravelIntent(intent: TravelIntent, failedRevision: number | null, currentRevision: number, nextOperationId: () => string): TravelIntent {
  return failedRevision === currentRevision ? intent : { ...intent, operationId: nextOperationId() };
}
const validDate = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
export function readTravelMap(content?: string): TravelMapState {
  try {
    const raw = JSON.parse(content || '');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Array.isArray(raw.pins)) return { ...defaultTravelMap(), diagnostics: ['Travel map content must contain a pins array.'], readOnly: true };
    const diagnostics: string[] = [];
    if (raw.version !== 2) diagnostics.push(`Unsupported travel map version: ${String(raw.version ?? 'missing')}.`);
    if (Object.keys(raw).some((key) => key !== 'version' && key !== 'pins')) diagnostics.push('Travel map contains unsupported fields.');
    if (raw.pins.length > MAX_TRAVEL_PINS) diagnostics.push(`Travel map contains ${raw.pins.length} pins; the supported maximum is ${MAX_TRAVEL_PINS}.`);
    const seen = new Set<string>();
    const pins: TravelPin[] = [];
    if (Array.isArray(raw.pins)) for (const [index, pin] of raw.pins.entries()) {
      if (!pin || typeof pin.name !== 'string' || !pin.name.trim() || typeof pin.note !== 'string' || typeof pin.emoji !== 'string' || !['planned', 'visited'].includes(pin.status) || !Number.isFinite(pin.lat) || Math.abs(pin.lat) > 90 || !Number.isFinite(pin.lon) || Math.abs(pin.lon) > 180) { diagnostics.push(`Pin ${index + 1} is malformed.`); continue; }
      if (Object.keys(pin).some((key) => !['id', 'name', 'note', 'emoji', 'status', 'lat', 'lon', 'plannedDate', 'visitedDate', 'date'].includes(key))) diagnostics.push(`Pin ${index + 1} contains unsupported fields.`);
      // Legacy pins without IDs remain removable after a reload.
      const hasCanonicalId = typeof pin.id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(pin.id);
      const id = hasCanonicalId ? pin.id : `legacy-${index}`;
      if (!hasCanonicalId) diagnostics.push(`Pin ${index + 1} requires a stable ID.`);
      if (seen.has(id)) { diagnostics.push(`Duplicate pin ID: ${id}.`); continue; }
      seen.add(id);
      const emoji = TRAVEL_STICKERS.includes(pin.emoji) ? pin.emoji : '📍';
      if (emoji !== pin.emoji) diagnostics.push(`Pin ${index + 1} uses an unsupported sticker.`);
      const plannedDate = validDate(pin.plannedDate) ? pin.plannedDate : validDate(pin.date) && pin.status === 'planned' ? pin.date : undefined;
      const visitedDate = validDate(pin.visitedDate) ? pin.visitedDate : validDate(pin.date) && pin.status === 'visited' ? pin.date : undefined;
      if (pin.plannedDate !== undefined && !plannedDate) diagnostics.push(`Pin ${index + 1} has an invalid planned date.`);
      if (pin.visitedDate !== undefined && !visitedDate) diagnostics.push(`Pin ${index + 1} has an invalid visited date.`);
      pins.push({ id, name: pin.name.trim().slice(0, 80), note: pin.note.slice(0, 240), emoji, status: pin.status, lat: pin.lat, lon: pin.lon, ...(plannedDate ? { plannedDate } : {}), ...(visitedDate ? { visitedDate } : {}) });
      if (pins.length === MAX_TRAVEL_PINS && index < raw.pins.length - 1) break;
    }
    return { version: 2, rotation: { lon: Number.isFinite(raw.rotation?.lon) ? wrapLongitude(raw.rotation.lon) : 15, lat: Number.isFinite(raw.rotation?.lat) ? Math.max(-70, Math.min(70, raw.rotation.lat)) : 18 }, pins, legacyWarning: raw.version !== 2, ...(diagnostics.length ? { diagnostics, readOnly: true } : {}) };
  } catch { return { ...defaultTravelMap(), diagnostics: ['Travel map content is not valid JSON.'], readOnly: true }; }
}
export function projectPin(lat: number, lon: number, rotation: { lon: number; lat: number }) {
  const toRad = Math.PI / 180, phi = lat * toRad, lambda = (lon - rotation.lon) * toRad, phi0 = rotation.lat * toRad;
  const z = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda);
  return { x: Math.cos(phi) * Math.sin(lambda), y: Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda), visible: z > 0 };
}
export function globeClick(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }, rotation: { lon: number; lat: number }) {
  const radius = Math.min(rect.width, rect.height) * GLOBE_RADIUS / GLOBE_SIZE;
  if (radius <= 0) return null;
  const x = (clientX - rect.left - rect.width / 2) / radius, y = -(clientY - rect.top - rect.height / 2) / radius;
  if (x * x + y * y > 1) return null;
  const z = Math.sqrt(1 - x * x - y * y), phi0 = rotation.lat * Math.PI / 180;
  const lat = Math.asin(y * Math.cos(phi0) + z * Math.sin(phi0)) * 180 / Math.PI;
  const lon = rotation.lon + Math.atan2(x, z * Math.cos(phi0) - y * Math.sin(phi0)) * 180 / Math.PI;
  return { lat: Math.round(lat * 100) / 100, lon: Math.round(wrapLongitude(lon) * 100) / 100 };
}

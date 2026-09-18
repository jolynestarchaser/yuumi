export const MAX_TRAVEL_PINS = 100;
export const MAX_TRAVEL_MAP_BYTES = 256 * 1024;

const stickers = new Set(['📍', '✈️', '🏝️', '🏔️', '🍜', '☕', '💚', '💙', '✨']);

export class TravelMapValidationError extends Error {}

const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const fail = (message: string): never => { throw new TravelMapValidationError(message); };

/** Validates the canonical shared trip payload without altering the owner's text. */
export function assertTravelMapContent(content: unknown, { allowLegacy = false } = {}) {
  if (typeof content !== 'string') fail('Travel map content must be JSON text.');
  const text = content as string;
  if (Buffer.byteLength(text, 'utf8') > MAX_TRAVEL_MAP_BYTES) fail('Travel map content is too large.');
  let map: unknown;
  try { map = JSON.parse(text); } catch { fail('Travel map content must be valid JSON.'); }
  if (!map || typeof map !== 'object' || Array.isArray(map)) fail('Travel map content must be an object.');
  const record = map as Record<string, unknown>;
  if (record.version !== 2) {
    if (allowLegacy && Array.isArray(record.pins)) return;
    fail('Travel map must use version 2.');
  }
  if (Object.keys(record).some((key) => key !== 'version' && key !== 'pins')) fail('Travel map contains unsupported fields.');
  const pins = record.pins as unknown;
  if (!Array.isArray(pins) || pins.length > MAX_TRAVEL_PINS) fail(`Travel maps can contain at most ${MAX_TRAVEL_PINS} pins.`);
  const ids = new Set<string>();
  for (const pin of pins as unknown[]) {
    if (!pin || typeof pin !== 'object' || Array.isArray(pin)) fail('Travel map pin must be an object.');
    const value = pin as Record<string, unknown>;
    const allowed = new Set(['id', 'name', 'note', 'emoji', 'status', 'lat', 'lon', 'plannedDate', 'visitedDate']);
    if (Object.keys(value).some((key) => !allowed.has(key))) fail('Travel map pin contains unsupported fields.');
    if (typeof value.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value.id) || ids.has(value.id)) fail('Travel map pin IDs must be unique and valid.');
    ids.add(value.id as string);
    if (typeof value.name !== 'string' || !value.name.trim() || value.name.trim().length > 80) fail('Travel map pin names must be 1–80 characters.');
    if (typeof value.note !== 'string' || value.note.length > 240) fail('Travel map pin notes must be 0–240 characters.');
    if (typeof value.emoji !== 'string' || !stickers.has(value.emoji)) fail('Travel map pin sticker is not supported.');
    if (value.status !== 'planned' && value.status !== 'visited') fail('Travel map pin status is invalid.');
    if (!Number.isFinite(value.lat) || (value.lat as number) < -90 || (value.lat as number) > 90 || !Number.isFinite(value.lon) || (value.lon as number) < -180 || (value.lon as number) > 180) fail('Travel map pin coordinates are invalid.');
    if (value.plannedDate !== undefined && (value.status !== 'planned' || typeof value.plannedDate !== 'string' || !validDate(value.plannedDate))) fail('Travel map planned date is invalid.');
    if (value.visitedDate !== undefined && (value.status !== 'visited' || typeof value.visitedDate !== 'string' || !validDate(value.visitedDate))) fail('Travel map visited date is invalid.');
  }
}

export type TravelPin = { id: string; name: string; note: string; emoji: string; status: 'planned' | 'visited'; lat: number; lon: number; date?: string };
export type TravelMapState = { rotation: { lon: number; lat: number }; pins: TravelPin[] };
export const MAX_TRAVEL_PINS = 100;
export const GLOBE_RADIUS = 132;
export const GLOBE_SIZE = 300;
export const wrapLongitude = (lon: number) => ((lon + 180) % 360 + 360) % 360 - 180;
export const defaultTravelMap = (): TravelMapState => ({ rotation: { lon: 15, lat: 18 }, pins: [] });
export function readTravelMap(content?: string): TravelMapState {
  try {
    const raw = JSON.parse(content || '');
    const seen = new Set<string>();
    const pins: TravelPin[] = [];
    if (Array.isArray(raw.pins)) for (const [index, pin] of raw.pins.entries()) {
      if (!pin || typeof pin.name !== 'string' || !pin.name.trim() || typeof pin.note !== 'string' || typeof pin.emoji !== 'string' || !['planned', 'visited'].includes(pin.status) || !Number.isFinite(pin.lat) || Math.abs(pin.lat) > 90 || !Number.isFinite(pin.lon) || Math.abs(pin.lon) > 180) continue;
      // Legacy pins without IDs remain removable after a reload.
      const id = typeof pin.id === 'string' && pin.id.length > 0 && pin.id.length <= 80 ? pin.id : `legacy-${index}`;
      if (seen.has(id)) continue;
      seen.add(id);
      pins.push({ id, name: pin.name.trim().slice(0, 80), note: pin.note.slice(0, 240), emoji: pin.emoji.slice(0, 16) || '📍', status: pin.status, lat: pin.lat, lon: pin.lon });
      if (pins.length === MAX_TRAVEL_PINS) break;
    }
    return { rotation: { lon: Number.isFinite(raw.rotation?.lon) ? wrapLongitude(raw.rotation.lon) : 15, lat: Number.isFinite(raw.rotation?.lat) ? Math.max(-70, Math.min(70, raw.rotation.lat)) : 18 }, pins };
  } catch { return defaultTravelMap(); }
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

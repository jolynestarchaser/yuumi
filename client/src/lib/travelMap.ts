export type TravelPin = { id: string; name: string; note: string; emoji: string; status: 'planned' | 'visited'; lat: number; lon: number; date?: string };
export type TravelMapState = { rotation: { lon: number; lat: number }; pins: TravelPin[] };
export const defaultTravelMap = (): TravelMapState => ({ rotation: { lon: 15, lat: 18 }, pins: [] });
export function readTravelMap(content?: string): TravelMapState {
  try {
    const raw = JSON.parse(content || '');
    const pins = Array.isArray(raw.pins) ? raw.pins.filter((pin) => pin && typeof pin.name === 'string' && typeof pin.note === 'string' && typeof pin.emoji === 'string' && ['planned', 'visited'].includes(pin.status) && Number.isFinite(pin.lat) && Math.abs(pin.lat) <= 90 && Number.isFinite(pin.lon) && Math.abs(pin.lon) <= 180).slice(0, 100) : [];
    return { rotation: { lon: Number.isFinite(raw.rotation?.lon) ? raw.rotation.lon : 15, lat: Number.isFinite(raw.rotation?.lat) ? Math.max(-70, Math.min(70, raw.rotation.lat)) : 18 }, pins };
  } catch { return defaultTravelMap(); }
}
export function projectPin(lat: number, lon: number, rotation: { lon: number; lat: number }) {
  const toRad = Math.PI / 180, phi = lat * toRad, lambda = (lon - rotation.lon) * toRad, phi0 = rotation.lat * toRad;
  const z = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda);
  return { x: Math.cos(phi) * Math.sin(lambda), y: Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda), visible: z > 0 };
}
export function globeClick(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }, rotation: { lon: number; lat: number }) {
  const radius = Math.min(rect.width, rect.height) / 2, x = (clientX - rect.left - rect.width / 2) / radius, y = -(clientY - rect.top - rect.height / 2) / radius;
  if (x * x + y * y > 1) return null;
  const z = Math.sqrt(1 - x * x - y * y), phi0 = rotation.lat * Math.PI / 180;
  const lat = Math.asin(y * Math.cos(phi0) + z * Math.sin(phi0)) * 180 / Math.PI;
  const lon = rotation.lon + Math.atan2(x, z * Math.cos(phi0) - y * Math.sin(phi0)) * 180 / Math.PI;
  return { lat: Math.round(lat * 100) / 100, lon: Math.round((((lon + 540) % 360) - 180) * 100) / 100 };
}

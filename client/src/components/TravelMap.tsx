import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Globe2, MapPin, Pencil, Plane, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { geoGraticule, geoOrthographic, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import landAtlas from 'world-atlas/land-110m.json';
import { useDesktopStore } from '../store/desktopStore.js';
import { useI18n } from '../lib/i18n.js';
import { GLOBE_RADIUS, globeClick, MAX_TRAVEL_PINS, projectPin, readTravelMap, serializeTravelMap, TRAVEL_STICKERS, type TravelPin } from '../lib/travelMap.js';

const places = [{ name: 'Bangkok', lat: 13.76, lon: 100.5 }, { name: 'Tokyo', lat: 35.68, lon: 139.69 }, { name: 'Seoul', lat: 37.57, lon: 126.98 }, { name: 'Paris', lat: 48.86, lon: 2.35 }, { name: 'London', lat: 51.51, lon: -0.13 }, { name: 'New York', lat: 40.71, lon: -74.01 }, { name: 'Sydney', lat: -33.87, lon: 151.21 }];

export default function TravelMap({ item }) {
  const { t } = useI18n();
  const updateItem = useDesktopStore((state) => state.updateItem);
  const currentItem = useDesktopStore((state) => state.items.find((row) => row._id === item._id));
  const pushToast = useDesktopStore((state) => state.pushToast);
  const [map, setMap] = useState(() => readTravelMap(item.content));
  const [draft, setDraft] = useState<Omit<TravelPin, 'id'>>({ name: '', note: '', emoji: '📍', status: 'planned', lat: 13.76, lon: 100.5 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'error'>('saved');
  const [retryMap, setRetryMap] = useState<ReturnType<typeof readTravelMap> | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number; rotation: { lon: number; lat: number } } | null>(null);
  const globe = useRef<SVGSVGElement>(null);
  const revision = useRef(item.contentRevision || 0);
  const mapRef = useRef(map);
  const oceanId = useId().replace(/:/g, '');
  const clipId = useId().replace(/:/g, '');
  useEffect(() => { mapRef.current = map; }, [map]);
  useEffect(() => { if (!currentItem || currentItem.contentRevision === revision.current) return; const next = readTravelMap(currentItem.content); revision.current = currentItem.contentRevision || 0; mapRef.current = next; setMap(next); }, [currentItem?.content, currentItem?.contentRevision]);
  const save = async (next) => {
    if (saveState === 'pending') return false;
    setSaveState('pending');
    try {
      const saved = await updateItem(item._id, { content: serializeTravelMap(next) }, revision.current);
      revision.current = saved.contentRevision || revision.current + 1;
      const confirmed = { ...readTravelMap(saved.content), rotation: mapRef.current.rotation };
      mapRef.current = confirmed; setMap(confirmed); setSaveState('saved'); setRetryMap(null);
      return true;
    } catch {
      setSaveState('error'); setRetryMap(next); pushToast(t('Could not save the travel map. Please try again.'), 'error'); return false;
    }
  };
  const onPointerDown = (event) => { event.currentTarget.setPointerCapture(event.pointerId); setDrag({ x: event.clientX, y: event.clientY, rotation: mapRef.current.rotation }); };
  const onPointerMove = (event) => { if (!drag) return; const next = { ...mapRef.current, rotation: { lon: drag.rotation.lon + (event.clientX - drag.x) * .55, lat: Math.max(-70, Math.min(70, drag.rotation.lat - (event.clientY - drag.y) * .35)) } }; mapRef.current = next; setMap(next); };
  const onPointerUp = (event) => { if (!drag) return; const moved = Math.hypot(event.clientX - drag.x, event.clientY - drag.y); setDrag(null); if (moved > 7) return; const point = globeClick(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), mapRef.current.rotation); if (point) setDraft((current) => ({ ...current, ...point })); };
  const addPin = async (event) => { event.preventDefault(); const name = draft.name.trim(); if (!name || saveState === 'pending' || (!editingId && mapRef.current.pins.length >= MAX_TRAVEL_PINS)) return; const pin: TravelPin = { ...draft, id: editingId || crypto.randomUUID(), name: name.slice(0, 80), note: draft.note.trim().slice(0, 240) }; const next = editingId ? { ...mapRef.current, pins: mapRef.current.pins.map((entry) => entry.id === editingId ? pin : entry) } : { ...mapRef.current, pins: [...mapRef.current.pins, pin] }; if (await save(next)) { setDraft((current) => ({ ...current, name: '', note: '' })); setEditingId(null); } };
  const projection = useMemo(() => geoOrthographic().translate([150, 150]).scale(GLOBE_RADIUS).rotate([-map.rotation.lon, -map.rotation.lat]), [map.rotation.lon, map.rotation.lat]);
  const path = useMemo(() => geoPath(projection), [projection]);
  const land = useMemo(() => feature(landAtlas as never, (landAtlas as never as { objects: { land: unknown } }).objects.land as never), []);
  const graticule = useMemo(() => geoGraticule()(), []);
  const statusPins = (status) => map.pins.filter((pin) => pin.status === status);
  return <section className='travel-map'>
    <header><div><span><Globe2 size={20} /> {t('Our travel map')}</span><p>{t('Drag the globe, then tap a place to set a pin.')}</p></div><b><Plane size={14} /> {map.pins.length} {t('pins')}</b></header>
    {map.legacyWarning && <p className='travel-map-warning'>{t('Your existing pins are safe. Saving a change will update this map to the newest format.')}</p>}
    <div className='travel-map-layout'>
      <div className='travel-globe-wrap'>
        <svg ref={globe} className='travel-globe' viewBox='0 0 300 300' onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => setDrag(null)} aria-label={t('Interactive 3D travel globe')} role='img'>
          <defs><radialGradient id={oceanId} cx='35%' cy='28%'><stop stopColor='#4dd5f2'/><stop offset='.62' stopColor='#1768bd'/><stop offset='1' stopColor='#0c2f75'/></radialGradient><clipPath id={clipId}><circle cx='150' cy='150' r='132' /></clipPath></defs>
          <circle cx='150' cy='150' r='137' fill='#67d9f548' /><circle cx='150' cy='150' r='132' fill={`url(#${oceanId})`} stroke='#b1efff' strokeWidth='2' />
          <g clipPath={`url(#${clipId})`} className='travel-map-geography'><path d={path(graticule) || undefined} className='travel-graticule' /><path d={path(land) || undefined} className='travel-land' /></g>
          <g aria-hidden='true'>{map.pins.map((pin) => { const point = projectPin(pin.lat, pin.lon, map.rotation); return point.visible && <g key={pin.id} transform={`translate(${150 + point.x * 132} ${150 - point.y * 132})`} className={`travel-pin ${pin.status}`}><circle r='13' /><text textAnchor='middle' dy='5'>{pin.emoji}</text></g>; })}</g>
          <ellipse cx='150' cy='285' rx='112' ry='10' fill='#020a2e55' />
        </svg>
        <small>{drag ? t('Rotating globe…') : t('Click a spot on the globe to choose coordinates.')}</small><button type='button' data-no-drag onClick={() => { const next = { ...mapRef.current, rotation: { lon: 15, lat: 18 } }; mapRef.current = next; setMap(next); }}><RotateCcw size={14} />{t('Reset view')}</button>
      </div>
      <form className='travel-pin-form' onSubmit={addPin}>
        <h3><MapPin size={17} /> {editingId ? t('Edit travel pin') : t('Add a travel pin')}</h3>
        <label>{t('Place')}<input data-no-drag required maxLength={80} value={draft.name} placeholder={t('Choose a city or place…')} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <div className='travel-quick-places'>{places.map((place) => <button type='button' data-no-drag key={place.name} onClick={() => setDraft({ ...draft, ...place })}>{place.name}</button>)}</div>
        <label>{t('Note')}<input data-no-drag maxLength={240} value={draft.note} placeholder={t('A little plan for us…')} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
        <div className='travel-status'><button type='button' data-no-drag className={draft.status === 'planned' ? 'active' : ''} onClick={() => setDraft({ ...draft, status: 'planned' })}><Plane size={14} />{t('Plan together')}</button><button type='button' data-no-drag className={draft.status === 'visited' ? 'active' : ''} onClick={() => setDraft({ ...draft, status: 'visited' })}><Check size={14} />{t('Visited together')}</button></div>
        <div className='travel-stickers' aria-label={t('Sticker')} >{TRAVEL_STICKERS.map((emoji) => <button type='button' data-no-drag key={emoji} className={draft.emoji === emoji ? 'active' : ''} onClick={() => setDraft({ ...draft, emoji })}>{emoji}</button>)}</div>
        <label>{draft.status === 'planned' ? t('Planned date') : t('Visited date')}<input data-no-drag type='date' value={(draft.status === 'planned' ? draft.plannedDate : draft.visitedDate) || ''} onChange={(event) => setDraft({ ...draft, ...(draft.status === 'planned' ? { plannedDate: event.target.value || undefined } : { visitedDate: event.target.value || undefined }) })} /></label>
        <small>{t('Coordinates')}: {draft.lat.toFixed(2)}, {draft.lon.toFixed(2)}</small><button data-no-drag className='travel-add' type='submit' disabled={saveState === 'pending' || (!editingId && map.pins.length >= MAX_TRAVEL_PINS)}>{editingId ? <Pencil size={16} /> : <Plus size={16} />}{editingId ? t('Save changes') : t('Pin it')}</button>{editingId && <button type='button' data-no-drag onClick={() => { setEditingId(null); setDraft({ name: '', note: '', emoji: '📍', status: 'planned', lat: 13.76, lon: 100.5 }); }}>{t('Cancel')}</button>}{saveState === 'pending' && <small>{t('Saving…')}</small>}{saveState === 'error' && <button type='button' data-no-drag onClick={() => retryMap && void save(retryMap)}>{t('Retry save')}</button>}
      </form>
    </div>
    <div className='travel-lists'>{(['planned', 'visited'] as const).map((status) => <section key={status}><h3>{status === 'planned' ? t('Plans together') : t('Visited together')}</h3>{statusPins(status).length ? statusPins(status).map((pin) => <article key={pin.id}><span>{pin.emoji}</span><div><strong>{pin.name}</strong>{pin.note && <p>{pin.note}</p>}<small>{pin.lat.toFixed(2)}, {pin.lon.toFixed(2)}{pin.plannedDate || pin.visitedDate ? ` · ${pin.plannedDate || pin.visitedDate}` : ''}</small></div><button data-no-drag type='button' aria-label={t('Edit {name}', { name: pin.name })} onClick={() => { setEditingId(pin.id); setDraft({ name: pin.name, note: pin.note, emoji: pin.emoji, status: pin.status, lat: pin.lat, lon: pin.lon, plannedDate: pin.plannedDate, visitedDate: pin.visitedDate }); }}><Pencil size={14} /></button><button data-no-drag type='button' aria-label={t('Remove {name}', { name: pin.name })} disabled={saveState === 'pending'} onClick={() => { if (window.confirm(t('Remove {name}?', { name: pin.name }))) void save({ ...mapRef.current, pins: mapRef.current.pins.filter((entry) => entry.id !== pin.id) }); }}><Trash2 size={14} /></button></article>) : <p>{status === 'planned' ? t('Pick the next place you want to go together.') : t('Your shared adventures will appear here.')}</p>}</section>)}</div>
  </section>;
}

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Globe2, MapPin, Pencil, Plane, Plus, RotateCcw, Search, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { geoGraticule, geoOrthographic, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import landAtlas from 'world-atlas/land-110m.json';
import { useDesktopStore } from '../store/desktopStore.js';
import { useI18n } from '../lib/i18n.js';
import { applyTravelIntent, GLOBE_RADIUS, globeClick, MAX_TRAVEL_PINS, normalizeTravelPin, projectPin, readTravelMap, serializeTravelMap, shouldClearTravelDraft, TRAVEL_STICKERS, type TravelIntent, type TravelPin } from '../lib/travelMap.js';

const places = [{ name: 'Bangkok', lat: 13.76, lon: 100.5 }, { name: 'Tokyo', lat: 35.68, lon: 139.69 }, { name: 'Seoul', lat: 37.57, lon: 126.98 }, { name: 'Paris', lat: 48.86, lon: 2.35 }, { name: 'London', lat: 51.51, lon: -0.13 }, { name: 'New York', lat: 40.71, lon: -74.01 }, { name: 'Sydney', lat: -33.87, lon: 151.21 }];

export default function TravelMap({ item }) {
  const { t } = useI18n();
  const updateItem = useDesktopStore((state) => state.updateItem);
  const currentItem = useDesktopStore((state) => state.items.find((row) => row._id === item._id));
  const pushToast = useDesktopStore((state) => state.pushToast);
  const recoveryKey = `yuu-mi:travel-draft:${item._id}`;
  const recovered = useMemo(() => { try { const value = sessionStorage.getItem(recoveryKey); return value ? JSON.parse(value) : null; } catch { return null; } }, [recoveryKey]);
  const [map, setMap] = useState(() => readTravelMap(item.content));
  const [draft, setDraft] = useState<Omit<TravelPin, 'id'>>(recovered?.draft || { name: '', note: '', emoji: '📍', status: 'planned', lat: 13.76, lon: 100.5 });
  const [editingId, setEditingId] = useState<string | null>(recovered?.editingId || null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'planned' | 'visited'>('all');
  const [query, setQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'error'>(recovered?.retryIntent ? 'error' : 'saved');
  const [retryIntent, setRetryIntent] = useState<TravelIntent | null>(recovered?.retryIntent || null);
  const [retryRevision, setRetryRevision] = useState<number | null>(recovered?.retryRevision ?? null);
  const [retryContent, setRetryContent] = useState<string | null>(recovered?.retryContent || null);
  const [mapConflict, setMapConflict] = useState<{ local?: TravelPin; remote?: TravelPin } | null>(null);
  const [drag, setDrag] = useState<{ pointerId: number; x: number; y: number; rotation: { lon: number; lat: number } } | null>(null);
  const globe = useRef<SVGSVGElement>(null);
  const revision = useRef(item.contentRevision || 0);
  const mapRef = useRef(map);
  const draftRef = useRef(draft);
  const editingIdRef = useRef(editingId);
  const oceanId = useId().replace(/:/g, '');
  const clipId = useId().replace(/:/g, '');
  useEffect(() => { mapRef.current = map; }, [map]);
  useEffect(() => { draftRef.current = draft; editingIdRef.current = editingId; try { sessionStorage.setItem(recoveryKey, JSON.stringify({ draft, editingId, retryIntent, retryRevision, retryContent })); } catch { /* In-memory draft remains usable. */ } }, [draft, editingId, retryIntent, retryRevision, retryContent, recoveryKey]);
  useEffect(() => { if (!currentItem || currentItem.contentRevision === revision.current) return; const next = readTravelMap(currentItem.content); revision.current = currentItem.contentRevision || 0; mapRef.current = next; setMap(next); }, [currentItem?.content, currentItem?.contentRevision]);
  async function saveIntent(intent: TravelIntent, remote = mapRef.current, expectedRevision = revision.current): Promise<boolean> {
    if (saveState === 'pending' || remote.readOnly) return false;
    const applied = applyTravelIntent(remote, intent);
    if (applied.conflict) { setMapConflict(applied.conflict); setRetryIntent(intent); setRetryRevision(expectedRevision); setSaveState('error'); return false; }
    setSaveState('pending');
    const content = serializeTravelMap(applied.map);
    try {
      const saved = await updateItem(item._id, { content }, expectedRevision, intent.operationId);
      revision.current = saved.contentRevision || expectedRevision + 1;
      const confirmed = { ...readTravelMap(saved.content), rotation: mapRef.current.rotation };
      mapRef.current = confirmed; setMap(confirmed); setSaveState('saved'); setRetryIntent(null); setRetryRevision(null); setRetryContent(null); setMapConflict(null);
      return true;
    } catch (error) {
      const current = (error as { response?: { data?: { error?: { data?: { current?: typeof item } } } } }).response?.data?.error?.data?.current;
      if (current) {
        const latest = readTravelMap(current.content);
        revision.current = current.contentRevision || expectedRevision;
        mapRef.current = latest; setMap(latest);
        const rebased = applyTravelIntent(latest, intent);
        if (rebased.conflict || latest.readOnly) { setMapConflict(rebased.conflict || { local: intent.pin }); setRetryIntent(intent); setRetryRevision(revision.current); setSaveState('error'); return false; }
        const rebasedIntent = { ...intent, operationId: crypto.randomUUID() };
        setSaveState('saved');
        return saveIntent(rebasedIntent, latest, revision.current);
      }
      setSaveState('error'); setRetryIntent(intent); setRetryRevision(expectedRevision); setRetryContent(content); pushToast(t('Could not save the travel map. Please try again.'), 'error'); return false;
    }
  }
  async function retryFailedIntent() {
    if (!retryIntent || retryRevision === null || !retryContent || saveState === 'pending') return;
    setSaveState('pending');
    try {
      const saved = await updateItem(item._id, { content: retryContent }, retryRevision, retryIntent.operationId);
      const stored = useDesktopStore.getState().items.find((row) => row._id === item._id);
      const newest = stored && (stored.contentRevision || 0) > (saved.contentRevision || 0) ? stored : saved;
      revision.current = Math.max(revision.current, newest.contentRevision || 0);
      const confirmed = { ...readTravelMap(newest.content), rotation: mapRef.current.rotation };
      mapRef.current = confirmed; setMap(confirmed); setRetryIntent(null); setRetryRevision(null); setRetryContent(null); setMapConflict(null); setSaveState('saved');
    } catch (error) {
      const current = (error as { response?: { data?: { error?: { data?: { current?: typeof item } } } } }).response?.data?.error?.data?.current;
      if (current) {
        const latest = readTravelMap(current.content); revision.current = current.contentRevision || retryRevision; mapRef.current = latest; setMap(latest); setSaveState('saved');
        const rebased = applyTravelIntent(latest, retryIntent);
        if (rebased.conflict || latest.readOnly) { setMapConflict(rebased.conflict || { local: retryIntent.pin }); setSaveState('error'); return; }
        await saveIntent({ ...retryIntent, operationId: crypto.randomUUID() }, latest, revision.current);
        return;
      }
      setSaveState('error'); pushToast(t('Could not save the travel map. Please try again.'), 'error');
    }
  }
  const onPointerDown = (event) => { event.currentTarget.setPointerCapture(event.pointerId); setDrag({ pointerId: event.pointerId, x: event.clientX, y: event.clientY, rotation: mapRef.current.rotation }); };
  const onPointerMove = (event) => { if (!drag || drag.pointerId !== event.pointerId) return; const next = { ...mapRef.current, rotation: { lon: drag.rotation.lon + (event.clientX - drag.x) * .55, lat: Math.max(-70, Math.min(70, drag.rotation.lat - (event.clientY - drag.y) * .35)) } }; mapRef.current = next; setMap(next); };
  const onPointerUp = (event) => { if (!drag || drag.pointerId !== event.pointerId) return; const moved = Math.hypot(event.clientX - drag.x, event.clientY - drag.y); setDrag(null); if (moved > 7) return; const point = globeClick(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), mapRef.current.rotation); if (point) setDraft((current) => ({ ...current, ...point })); };
  const selectPin = (pin: TravelPin) => { setSelectedId(pin.id); const next = { ...mapRef.current, rotation: { lon: pin.lon, lat: Math.max(-70, Math.min(70, pin.lat)) } }; mapRef.current = next; setMap(next); };
  const addPin = async (event) => { event.preventDefault(); const name = draft.name.trim(); if (!name || saveState === 'pending' || mapRef.current.readOnly || (!editingId && mapRef.current.pins.length >= MAX_TRAVEL_PINS)) return; const pin = normalizeTravelPin({ ...draft, id: editingId || crypto.randomUUID(), name: name.slice(0, 80), note: draft.note.trim().slice(0, 240) }); const basePin = editingId ? mapRef.current.pins.find((entry) => entry.id === editingId) : undefined; const intent: TravelIntent = { operationId: crypto.randomUUID(), type: editingId ? 'update' : 'add', pinId: pin.id, pin, basePin }; const submittedDraft = draft; const submittedEditingId = editingId; if (await saveIntent(intent) && shouldClearTravelDraft(submittedEditingId, submittedDraft, editingIdRef.current, draftRef.current)) { setDraft((current) => ({ ...current, name: '', note: '' })); setEditingId(null); } };
  const projection = useMemo(() => geoOrthographic().translate([150, 150]).scale(GLOBE_RADIUS * zoom).rotate([-map.rotation.lon, -map.rotation.lat]), [map.rotation.lon, map.rotation.lat, zoom]);
  const path = useMemo(() => geoPath(projection), [projection]);
  const land = useMemo(() => feature(landAtlas as never, (landAtlas as never as { objects: { land: unknown } }).objects.land as never), []);
  const graticule = useMemo(() => geoGraticule()(), []);
  const visiblePins = map.pins.filter((pin) => (filter === 'all' || pin.status === filter) && `${pin.name} ${pin.note}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const statusPins = (status) => visiblePins.filter((pin) => pin.status === status);
  const rotateByKey = (event) => { const amount = event.shiftKey ? 18 : 8; if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return; event.preventDefault(); const next = { ...mapRef.current, rotation: { lon: mapRef.current.rotation.lon + (event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0), lat: Math.max(-70, Math.min(70, mapRef.current.rotation.lat + (event.key === 'ArrowUp' ? amount : event.key === 'ArrowDown' ? -amount : 0))) } }; mapRef.current = next; setMap(next); };
  return <section className='travel-map'>
    <header><div><span><Globe2 size={20} /> {t('Our travel map')}</span><p>{t('Drag the globe, then tap a place to set a pin.')}</p></div><b><Plane size={14} /> {map.pins.length} {t('pins')}</b></header>
    {map.readOnly && <div className='travel-map-warning' role='alert'><strong>{t('This travel map needs recovery before it can be edited.')}</strong>{map.diagnostics?.map((message) => <p key={message}>{message}</p>)}</div>}
    {mapConflict && <div className='travel-map-warning' role='alert'><strong>{t('This pin changed somewhere else. Your draft is still safe.')}</strong><p>{mapConflict.remote?.name || mapConflict.local?.name}</p></div>}
    <div className='travel-map-layout'>
      <div className='travel-globe-wrap'>
        <svg ref={globe} className='travel-globe' viewBox='0 0 300 300' onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={(event) => { if (drag?.pointerId === event.pointerId) setDrag(null); }} onKeyDown={rotateByKey} tabIndex={0} aria-label={t('Interactive 3D travel globe')} role='application'>
          <defs><radialGradient id={oceanId} cx='35%' cy='28%'><stop stopColor='#4dd5f2'/><stop offset='.62' stopColor='#1768bd'/><stop offset='1' stopColor='#0c2f75'/></radialGradient><clipPath id={clipId}><circle cx='150' cy='150' r='132' /></clipPath></defs>
          <circle cx='150' cy='150' r='137' fill='#67d9f548' /><circle cx='150' cy='150' r='132' fill={`url(#${oceanId})`} stroke='#b1efff' strokeWidth='2' />
          <g clipPath={`url(#${clipId})`} className='travel-map-geography'><path d={path(graticule) || undefined} className='travel-graticule' /><path d={path(land) || undefined} className='travel-land' /></g>
          <g>{visiblePins.map((pin) => { const point = projectPin(pin.lat, pin.lon, map.rotation); return point.visible && <g key={pin.id} tabIndex={0} role='button' aria-label={t('Edit {name}', { name: pin.name })} onClick={() => selectPin(pin)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectPin(pin); } }} transform={`translate(${150 + point.x * 132 * zoom} ${150 - point.y * 132 * zoom})`} className={`travel-pin ${pin.status} ${selectedId === pin.id ? 'selected' : ''}`}><circle r='13' /><text textAnchor='middle' dy='5'>{pin.emoji}</text></g>; })}</g>
          <ellipse cx='150' cy='285' rx='112' ry='10' fill='#020a2e55' />
        </svg>
        <small>{drag ? t('Rotating globe…') : t('Click a spot on the globe to choose coordinates.')}</small><div className='travel-globe-controls'><button type='button' data-no-drag onClick={() => setZoom((value) => Math.max(.75, value - .2))}><ZoomOut size={14} />{t('Zoom out')}</button><button type='button' data-no-drag onClick={() => setZoom((value) => Math.min(1.6, value + .2))}><ZoomIn size={14} />{t('Zoom in')}</button><button type='button' data-no-drag onClick={() => { const next = { ...mapRef.current, rotation: { lon: 15, lat: 18 } }; mapRef.current = next; setMap(next); setZoom(1); }}><RotateCcw size={14} />{t('Reset view')}</button></div>
      </div>
      <form className='travel-pin-form' onSubmit={addPin}>
        <h3><MapPin size={17} /> {editingId ? t('Edit travel pin') : t('Add a travel pin')}</h3>
        <label>{t('Place')}<input data-no-drag required maxLength={80} value={draft.name} placeholder={t('Choose a city or place…')} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <div className='travel-quick-places'>{places.map((place) => <button type='button' data-no-drag key={place.name} onClick={() => setDraft({ ...draft, ...place })}>{place.name}</button>)}</div>
        <label>{t('Note')}<input data-no-drag maxLength={240} value={draft.note} placeholder={t('A little plan for us…')} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
        <div className='travel-status'><button type='button' data-no-drag className={draft.status === 'planned' ? 'active' : ''} onClick={() => setDraft({ ...draft, status: 'planned', visitedDate: undefined })}><Plane size={14} />{t('Plan together')}</button><button type='button' data-no-drag className={draft.status === 'visited' ? 'active' : ''} onClick={() => setDraft({ ...draft, status: 'visited', plannedDate: undefined })}><Check size={14} />{t('Visited together')}</button></div>
        <div className='travel-stickers' aria-label={t('Sticker')} >{TRAVEL_STICKERS.map((emoji) => <button type='button' data-no-drag key={emoji} className={draft.emoji === emoji ? 'active' : ''} onClick={() => setDraft({ ...draft, emoji })}>{emoji}</button>)}</div>
        <label>{draft.status === 'planned' ? t('Planned date') : t('Visited date')}<input data-no-drag type='date' value={(draft.status === 'planned' ? draft.plannedDate : draft.visitedDate) || ''} onChange={(event) => setDraft({ ...draft, ...(draft.status === 'planned' ? { plannedDate: event.target.value || undefined } : { visitedDate: event.target.value || undefined }) })} /></label>
        <div className='travel-coordinates'><label>{t('Latitude')}<input data-no-drag type='number' min='-90' max='90' step='.01' value={draft.lat} onChange={(event) => setDraft({ ...draft, lat: Math.max(-90, Math.min(90, Number(event.target.value) || 0)) })} /></label><label>{t('Longitude')}<input data-no-drag type='number' min='-180' max='180' step='.01' value={draft.lon} onChange={(event) => setDraft({ ...draft, lon: Math.max(-180, Math.min(180, Number(event.target.value) || 0)) })} /></label></div><small>{t('Coordinates')}: {draft.lat.toFixed(2)}, {draft.lon.toFixed(2)}</small><button data-no-drag className='travel-add' type='submit' disabled={map.readOnly || saveState === 'pending' || (!editingId && map.pins.length >= MAX_TRAVEL_PINS)}>{editingId ? <Pencil size={16} /> : <Plus size={16} />}{editingId ? t('Save changes') : t('Pin it')}</button>{editingId && <button type='button' data-no-drag onClick={() => { setEditingId(null); setDraft({ name: '', note: '', emoji: '📍', status: 'planned', lat: 13.76, lon: 100.5 }); }}>{t('Cancel')}</button>}{saveState === 'pending' && <small>{t('Saving…')}</small>}{saveState === 'error' && retryIntent && retryContent && !mapConflict && <button type='button' data-no-drag onClick={() => void retryFailedIntent()}>{t('Retry save')}</button>}
      </form>
    </div>
    <div className='travel-list-toolbar'><label><Search size={14} /><input data-no-drag value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search places')} /></label><div role='group' aria-label={t('Filter pins')}>{(['all', 'planned', 'visited'] as const).map((value) => <button key={value} type='button' className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{t(value === 'all' ? 'All' : value === 'planned' ? 'Planned' : 'Visited')}</button>)}</div></div>
    <div className='travel-lists'>{(['planned', 'visited'] as const).filter((status) => filter === 'all' || filter === status).map((status) => <section key={status}><h3>{status === 'planned' ? t('Plans together') : t('Visited together')}</h3>{statusPins(status).length ? statusPins(status).map((pin) => <article key={pin.id} className={selectedId === pin.id ? 'selected' : ''}><button className='travel-pin-select' data-no-drag type='button' onClick={() => selectPin(pin)}><span>{pin.emoji}</span><div><strong>{pin.name}</strong>{pin.note && <p>{pin.note}</p>}<small>{pin.lat.toFixed(2)}, {pin.lon.toFixed(2)}{pin.plannedDate || pin.visitedDate ? ` · ${pin.plannedDate || pin.visitedDate}` : ''}</small></div></button><button data-no-drag type='button' aria-label={t('Edit {name}', { name: pin.name })} onClick={() => { selectPin(pin); setEditingId(pin.id); setDraft({ name: pin.name, note: pin.note, emoji: pin.emoji, status: pin.status, lat: pin.lat, lon: pin.lon, plannedDate: pin.plannedDate, visitedDate: pin.visitedDate }); }}><Pencil size={14} /></button><button data-no-drag type='button' aria-label={t('Remove {name}', { name: pin.name })} disabled={map.readOnly || saveState === 'pending'} onClick={() => { if (window.confirm(t('Remove {name}?', { name: pin.name }))) void saveIntent({ operationId: crypto.randomUUID(), type: 'remove', pinId: pin.id, basePin: pin }); }}><Trash2 size={14} /></button></article>) : <p>{status === 'planned' ? t('Pick the next place you want to go together.') : t('Your shared adventures will appear here.')}</p>}</section>)}</div>
  </section>;
}

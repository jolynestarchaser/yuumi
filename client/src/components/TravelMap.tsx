import { useRef, useState } from 'react';
import { Check, Globe2, MapPin, Plane, Plus, Trash2 } from 'lucide-react';
import { useDesktopStore } from '../store/desktopStore.js';
import { useI18n } from '../lib/i18n.js';
import { defaultTravelMap, globeClick, projectPin, readTravelMap, type TravelPin } from '../lib/travelMap.js';

const stickers = ['📍', '✈️', '🏝️', '🏔️', '🍜', '☕', '💚', '💙', '✨'];
const places = [{ name: 'Bangkok', lat: 13.76, lon: 100.5 }, { name: 'Tokyo', lat: 35.68, lon: 139.69 }, { name: 'Seoul', lat: 37.57, lon: 126.98 }, { name: 'Paris', lat: 48.86, lon: 2.35 }, { name: 'London', lat: 51.51, lon: -0.13 }, { name: 'New York', lat: 40.71, lon: -74.01 }, { name: 'Sydney', lat: -33.87, lon: 151.21 }];

export default function TravelMap({ item }) {
  const { t } = useI18n();
  const updateItem = useDesktopStore((state) => state.updateItem);
  const pushToast = useDesktopStore((state) => state.pushToast);
  const [map, setMap] = useState(() => readTravelMap(item.content));
  const [draft, setDraft] = useState({ name: '', note: '', emoji: '📍', status: 'planned' as TravelPin['status'], lat: 13.76, lon: 100.5 });
  const [drag, setDrag] = useState<{ x: number; y: number; rotation: { lon: number; lat: number } } | null>(null);
  const globe = useRef<SVGSVGElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = async (next) => { setMap(next); try { await updateItem(item._id, { content: JSON.stringify(next) }); } catch { pushToast(t('Could not save the travel map. Please try again.'), 'error'); setMap(readTravelMap(item.content)); } };
  const deferSave = (next) => { setMap(next); if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => save(next), 450); };
  const onPointerDown = (event) => { event.currentTarget.setPointerCapture(event.pointerId); setDrag({ x: event.clientX, y: event.clientY, rotation: map.rotation }); };
  const onPointerMove = (event) => { if (!drag) return; deferSave({ ...map, rotation: { lon: drag.rotation.lon + (event.clientX - drag.x) * .55, lat: Math.max(-70, Math.min(70, drag.rotation.lat - (event.clientY - drag.y) * .35)) } }); };
  const onPointerUp = (event) => { if (!drag) return; const moved = Math.hypot(event.clientX - drag.x, event.clientY - drag.y); setDrag(null); if (moved > 7) return; const point = globeClick(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), map.rotation); if (point) setDraft((current) => ({ ...current, ...point })); };
  const addPin = (event) => { event.preventDefault(); const name = draft.name.trim(); if (!name) return; const pin: TravelPin = { ...draft, id: crypto.randomUUID(), name: name.slice(0, 80), note: draft.note.trim().slice(0, 240) }; save({ ...map, pins: [...map.pins, pin] }); setDraft((current) => ({ ...current, name: '', note: '' })); };
  const statusPins = (status) => map.pins.filter((pin) => pin.status === status);
  return <section className='travel-map'>
    <header><div><span><Globe2 size={20} /> {t('Our travel map')}</span><p>{t('Drag the globe, then tap a place to set a pin.')}</p></div><b><Plane size={14} /> {map.pins.length} {t('pins')}</b></header>
    <div className='travel-map-layout'>
      <div className='travel-globe-wrap'>
        <svg ref={globe} className='travel-globe' viewBox='0 0 300 300' onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => setDrag(null)} aria-label={t('Interactive 3D travel globe')} role='img'>
          <defs><radialGradient id='ocean' cx='35%' cy='28%'><stop stopColor='#4dd5f2'/><stop offset='.62' stopColor='#1768bd'/><stop offset='1' stopColor='#0c2f75'/></radialGradient><clipPath id='globe-clip'><circle cx='150' cy='150' r='132' /></clipPath></defs>
          <circle cx='150' cy='150' r='137' fill='#67d9f548' /><circle cx='150' cy='150' r='132' fill='url(#ocean)' stroke='#b1efff' strokeWidth='2' />
          <g clipPath='url(#globe-clip)' opacity='.9' fill='#78d894' stroke='#246d65' strokeWidth='1.2'><path d='M45 80 75 59 113 71 126 100 109 118 84 110 66 130 42 118Z'/><path d='M117 125 144 132 153 165 143 212 125 227 116 198 120 163Z'/><path d='M145 76 177 61 213 73 235 100 221 120 184 111 165 128 145 112Z'/><path d='M185 129 218 131 241 156 227 191 200 201 180 173Z'/><path d='M232 208 258 218 268 243 246 260 222 245Z'/></g>
          <g aria-hidden='true'>{map.pins.map((pin) => { const point = projectPin(pin.lat, pin.lon, map.rotation); return point.visible && <g key={pin.id} transform={`translate(${150 + point.x * 132} ${150 - point.y * 132})`} className={`travel-pin ${pin.status}`}><circle r='13' /><text textAnchor='middle' dy='5'>{pin.emoji}</text></g>; })}</g>
          <ellipse cx='150' cy='285' rx='112' ry='10' fill='#020a2e55' />
        </svg>
        <small>{drag ? t('Rotating globe…') : t('Click a spot on the globe to choose coordinates.')}</small>
      </div>
      <form className='travel-pin-form' onSubmit={addPin}>
        <h3><MapPin size={17} /> {t('Add a travel pin')}</h3>
        <label>{t('Place')}<input data-no-drag required maxLength={80} value={draft.name} placeholder={t('Choose a city or place…')} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <div className='travel-quick-places'>{places.map((place) => <button type='button' data-no-drag key={place.name} onClick={() => setDraft({ ...draft, ...place })}>{place.name}</button>)}</div>
        <label>{t('Note')}<input data-no-drag maxLength={240} value={draft.note} placeholder={t('A little plan for us…')} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
        <div className='travel-status'><button type='button' data-no-drag className={draft.status === 'planned' ? 'active' : ''} onClick={() => setDraft({ ...draft, status: 'planned' })}><Plane size={14} />{t('Plan together')}</button><button type='button' data-no-drag className={draft.status === 'visited' ? 'active' : ''} onClick={() => setDraft({ ...draft, status: 'visited' })}><Check size={14} />{t('Visited together')}</button></div>
        <div className='travel-stickers' aria-label={t('Sticker')} >{stickers.map((emoji) => <button type='button' data-no-drag key={emoji} className={draft.emoji === emoji ? 'active' : ''} onClick={() => setDraft({ ...draft, emoji })}>{emoji}</button>)}</div>
        <small>{t('Coordinates')}: {draft.lat.toFixed(2)}, {draft.lon.toFixed(2)}</small><button data-no-drag className='travel-add' type='submit'><Plus size={16} />{t('Pin it')}</button>
      </form>
    </div>
    <div className='travel-lists'>{(['planned', 'visited'] as const).map((status) => <section key={status}><h3>{status === 'planned' ? t('Plans together') : t('Visited together')}</h3>{statusPins(status).length ? statusPins(status).map((pin) => <article key={pin.id}><span>{pin.emoji}</span><div><strong>{pin.name}</strong>{pin.note && <p>{pin.note}</p>}<small>{pin.lat.toFixed(2)}, {pin.lon.toFixed(2)}</small></div><button data-no-drag type='button' aria-label={t('Remove {name}', { name: pin.name })} onClick={() => save({ ...map, pins: map.pins.filter((entry) => entry.id !== pin.id) })}><Trash2 size={14} /></button></article>) : <p>{status === 'planned' ? t('Pick the next place you want to go together.') : t('Your shared adventures will appear here.')}</p>}</section>)}</div>
  </section>;
}

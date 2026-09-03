import { useRef, useState } from 'react';
import { ImagePlus, MousePointer2, RotateCcw } from 'lucide-react';
import GlassDialog from './GlassDialog.jsx';

const presets = ['neon', 'sunset', 'midnight'];
const themes = ['soft', 'glass', 'classic'];
const colors = ['#b6ff00', '#2453ff', '#06113e', '#f5f7ff', '#ff5c8a', '#ff9f43', '#39d5ff', '#9b7bff'];
const defaults = { type: 'preset', value: 'neon', colors: ['#b6ff00', '#2453ff'], angle: 135, fit: 'cover', position: { x: 50, y: 50 }, backgroundColor: '#06113e', dimness: 18, blur: 0, brightness: 100, saturation: 100 };

function Range({ label, value, min, max, unit = '', onChange }) {
  return <label className='range-setting'><span>{label}<b>{value}{unit}</b></span><input type='range' min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

export default function AppearancePanel({ settings, onSave, onUpload, onClose }) {
  const input = useRef(null);
  const cursorInput = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [wallpaper, setWallpaper] = useState({ ...defaults, ...settings.wallpaper, position: { ...defaults.position, ...settings.wallpaper?.position }, colors: settings.wallpaper?.colors?.length ? settings.wallpaper.colors : defaults.colors });
  const [iconTheme, setIconTheme] = useState(settings.iconTheme || 'soft');
  const [cursor, setCursor] = useState({ enabled: settings.cursor?.enabled ?? true, style: settings.cursor?.style || 'orb', shape: settings.cursor?.shape || 'arrow', asset: settings.cursor?.asset, color: settings.cursor?.color || '#b6ff00' });
  const patch = (value) => setWallpaper((current) => ({ ...current, ...value }));

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError('');
    try {
      const asset = await onUpload('wallpaper', file);
      patch({ type: 'image', value: 'custom', asset });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Wallpaper could not be uploaded.');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  async function apply() {
    setBusy(true); setError('');
    try {
      await onSave({ wallpaper, iconTheme, cursor });
      onClose();
    } catch {
      setError('Desktop appearance could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadCursor(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError('');
    try {
      const asset = await onUpload('cursor', file);
      setCursor((current) => ({ ...current, enabled: true, shape: 'image', asset }));
    } catch {
      setError('Cursor image could not be uploaded.');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  const preview = wallpaper.type === 'gradient' ? `linear-gradient(${wallpaper.angle}deg, ${wallpaper.colors.join(', ')})` : wallpaper.type === 'solid' ? wallpaper.colors[0] : undefined;
  return <GlassDialog title='Desktop appearance' eyebrow='Make it yours' className='customize-dialog' onClose={onClose} actions={<><button onClick={() => setWallpaper(defaults)}><RotateCcw size={15} /> Reset</button><button className='primary' disabled={busy} onClick={apply}>{busy ? 'Saving...' : 'Apply'}</button></>}>
    <div className='appearance-layout'>
      <div className='wallpaper-preview' style={{ '--preview-background': preview, '--preview-image': wallpaper.type === 'image' ? `url(${wallpaper.asset?.url})` : undefined, '--preview-fit': wallpaper.fit, '--preview-x': `${wallpaper.position.x}%`, '--preview-y': `${wallpaper.position.y}%`, '--preview-dim': wallpaper.dimness / 100 }}><span>Live preview</span></div>
      <div className='segmented-control wallpaper-types'>
        {['preset', 'image', 'solid', 'gradient'].map((type) => <button key={type} className={wallpaper.type === type ? 'active' : ''} onClick={() => type === 'image' ? input.current.click() : patch({ type, value: type === 'preset' ? 'neon' : 'custom' })}>{type === 'image' && <ImagePlus size={14} />}{type}</button>)}
      </div>
      <input ref={input} hidden type='file' accept='image/jpeg,image/png,image/webp' onChange={upload} />
      {wallpaper.type === 'preset' && <div className='wallpaper-picker'>{presets.map((value) => <button key={value} className={`wallpaper-swatch ${value} ${wallpaper.value === value ? 'active' : ''}`} onClick={() => patch({ value })}><span>{value}</span></button>)}</div>}
      {(wallpaper.type === 'solid' || wallpaper.type === 'gradient') && <div className='gradient-editor'>
        <p className='setting-label'>Primary color</p><div className='color-row'>{colors.map((color) => <button key={color} style={{ '--swatch': color }} className={wallpaper.colors[0] === color ? 'active' : ''} onClick={() => patch({ colors: [color, wallpaper.colors[1] || '#2453ff'] })} />)}</div>
        {wallpaper.type === 'gradient' && <><p className='setting-label'>Second color</p><div className='color-row'>{colors.map((color) => <button key={color} style={{ '--swatch': color }} className={wallpaper.colors[1] === color ? 'active' : ''} onClick={() => patch({ colors: [wallpaper.colors[0], color] })} />)}</div><Range label='Gradient angle' value={wallpaper.angle} min={0} max={360} unit='°' onChange={(angle) => patch({ angle })} /></>}
      </div>}
      {wallpaper.type === 'image' && <><div className='segmented-control'>{['cover', 'contain', 'tile'].map((fit) => <button key={fit} className={wallpaper.fit === fit ? 'active' : ''} onClick={() => patch({ fit })}>{fit}</button>)}</div><Range label='Horizontal focus' value={wallpaper.position.x} min={0} max={100} unit='%' onChange={(x) => patch({ position: { ...wallpaper.position, x } })} /><Range label='Vertical focus' value={wallpaper.position.y} min={0} max={100} unit='%' onChange={(y) => patch({ position: { ...wallpaper.position, y } })} /></>}
      <div className='filter-grid'><Range label='Shade' value={wallpaper.dimness} min={0} max={70} unit='%' onChange={(dimness) => patch({ dimness })} /><Range label='Blur' value={wallpaper.blur} min={0} max={24} unit='px' onChange={(blur) => patch({ blur })} /><Range label='Brightness' value={wallpaper.brightness} min={40} max={140} unit='%' onChange={(brightness) => patch({ brightness })} /><Range label='Saturation' value={wallpaper.saturation} min={0} max={180} unit='%' onChange={(saturation) => patch({ saturation })} /></div>
      <p className='setting-label'>Icon finish</p><div className='icon-picker'>{themes.map((theme) => <button key={theme} className={iconTheme === theme ? 'active' : ''} onClick={() => setIconTheme(theme)}>{theme}</button>)}</div>
      <p className='setting-label'>Glowing cursor</p><div className='segmented-control'><button className={!cursor.enabled ? 'active' : ''} onClick={() => setCursor((current) => ({ ...current, enabled: false }))}>System</button>{['orb', 'ring', 'star'].map((style) => <button key={style} className={cursor.enabled && cursor.style === style ? 'active' : ''} onClick={() => setCursor((current) => ({ ...current, enabled: true, style }))}>{style}</button>)}</div><p className='setting-label cursor-shape-label'>Cursor shape</p><div className='segmented-control cursor-shapes'>{['dot', 'arrow', 'hand', 'crosshair', 'sparkle'].map((shape) => <button key={shape} className={cursor.shape === shape ? 'active' : ''} onClick={() => setCursor((current) => ({ ...current, enabled: true, shape, asset: undefined }))}>{shape}</button>)}<button className={cursor.shape === 'image' ? 'active' : ''} onClick={() => cursorInput.current?.click()}><MousePointer2 size={14} /> Image</button></div><input ref={cursorInput} hidden type='file' accept='image/jpeg,image/png,image/webp' onChange={uploadCursor} /><div className='color-row cursor-colors'>{colors.map((color) => <button key={color} aria-label={`Cursor color ${color}`} style={{ '--swatch': color }} className={cursor.color === color ? 'active' : ''} onClick={() => setCursor((current) => ({ ...current, color }))} />)}</div>
      {error && <p className='form-error'>{error}</p>}
    </div>
  </GlassDialog>;
}

import { useMemo, useRef, useState } from 'react';
import { ImagePlus, Search } from 'lucide-react';
import GlassDialog from './GlassDialog.jsx';
import { emojiCatalog, iconCatalog } from '../lib/iconCatalog.jsx';
import { useDesktopStore } from '../store/desktopStore.js';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';

const colors = ['#b6ff00', '#2453ff', '#f5f7ff', '#06113e', '#ff5c8a', '#ff665c', '#ff9f43', '#ffd166', '#39d5ff', '#9b7bff', '#64f0c8', '#8b96b8'];
const backgrounds = ['#17347a', '#11245e', '#2453ff', '#5d2bc5', '#145c58', '#782d52', '#2c3658', '#f5f7ff'];

export default function IconPickerDialog({ item, onSave, onClose }) {
  const upload = useDesktopStore((state) => state.uploadSettingAsset);
  const notify = useDesktopStore((state) => state.pushToast);
  const input = useRef(null);
  const [tab, setTab] = useState(item.appearance?.iconType === 'emoji' ? 'emoji' : 'icons');
  const [query, setQuery] = useState('');
  const [choice, setChoice] = useState({ type: item.appearance?.iconType || 'default', value: item.appearance?.iconValue || '', color: item.appearance?.iconColor || '#f5f7ff', background: item.appearance?.iconBackground || '#17347a' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const icons = useMemo(() => iconCatalog.filter((icon) => `${icon.label} ${icon.category}`.toLowerCase().includes(query.toLowerCase())), [query]);

  async function imageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError('');
    try {
      const asset = await upload('icon', file);
      setChoice((current) => ({ ...current, type: 'image', value: asset.url }));
    } catch {
      setError('The thumbnail could not be uploaded.');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  async function save(next = choice) {
    setBusy(true); setError('');
    try {
      await onSave({ iconType: next.type, iconValue: next.value, iconColor: next.color, iconBackground: next.background });
      try {
        const recent = JSON.parse(localStorage.getItem('yuuandmi-recent-icons') || '[]');
        localStorage.setItem('yuuandmi-recent-icons', JSON.stringify([next.value, ...recent.filter((value) => value !== next.value)].slice(0, 10)));
      } catch { /* Recent choices are optional. */ }
      notify(next.type === 'default' ? 'Original icon restored.' : 'Icon updated.');
      onClose();
    } catch {
      setError('The icon could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const customThumbnail = choice.type === 'image' && choice.value;
  return <GlassDialog title='Icon & thumbnail' eyebrow='Make it recognizable' className='icon-dialog' onClose={onClose} actions={<><Button variant='secondary' disabled={busy} onClick={() => save({ ...choice, type: 'default', value: '' })}>Use original</Button><Button variant='neon' disabled={busy} onClick={() => save()}>{busy ? 'Saving...' : 'Apply'}</Button></>}>
    <div className='icon-preview' style={{ '--preview-background': choice.background, '--preview-color': choice.color }}>
      {customThumbnail ? <img src={choice.value} alt='Selected thumbnail preview' /> : choice.type === 'emoji' ? <span>{choice.value}</span> : <span>{choice.type === 'lucide' ? 'Icon selected' : 'Original icon'}</span>}
    </div>
    <div className='segmented-control'><button type='button' className={tab === 'icons' ? 'active' : ''} onClick={() => setTab('icons')}>Icons</button><button type='button' className={tab === 'emoji' ? 'active' : ''} onClick={() => setTab('emoji')}>Emoji</button><button type='button' onClick={() => input.current?.click()}><ImagePlus size={15} /> Thumbnail</button></div>
    <input ref={input} hidden type='file' accept='image/jpeg,image/png,image/webp' onChange={imageUpload} />
    {tab === 'icons' && <label className='search-field'><Search size={16} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Search icons' /></label>}
    <div className='choice-grid'>{tab === 'icons' ? icons.map(({ key, label, Icon }) => <button type='button' title={label} aria-label={label} className={choice.type === 'lucide' && choice.value === key ? 'active' : ''} key={key} onClick={() => setChoice({ ...choice, type: 'lucide', value: key })}><Icon /></button>) : emojiCatalog.map((emoji) => <button type='button' aria-label={`Use ${emoji}`} className={choice.type === 'emoji' && choice.value === emoji ? 'active' : ''} key={emoji} onClick={() => setChoice({ ...choice, type: 'emoji', value: emoji })}>{emoji}</button>)}</div>
    {busy && <p className='dialog-copy'>Saving your change...</p>}
    {error && <p className='form-error'>{error}</p>}
    <p className='setting-label'>Icon color</p>
    <div className='color-row'>{colors.map((color) => <button type='button' key={color} aria-label={`Icon color ${color}`} className={choice.color === color ? 'active' : ''} style={{ '--swatch': color }} onClick={() => setChoice({ ...choice, color })} />)}</div>
    <p className='setting-label'>Glass background</p>
    <div className='color-row'>{backgrounds.map((background) => <button type='button' key={background} aria-label={`Background ${background}`} className={choice.background === background ? 'active' : ''} style={{ '--swatch': background }} onClick={() => setChoice({ ...choice, background })} />)}</div>
  </GlassDialog>;
}

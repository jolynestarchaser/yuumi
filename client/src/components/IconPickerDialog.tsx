import { useI18n, translate as t } from '../lib/i18n.js';
import { useMemo, useRef, useState } from 'react';
import { ImagePlus, Search } from 'lucide-react';
import GlassDialog from './GlassDialog.js';
import { emojiCatalog, iconCatalog } from '../lib/iconCatalog.js';
import { useDesktopStore } from '../store/desktopStore.js';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';

const colors = ['#b6ff00', '#2453ff', '#f5f7ff', '#06113e', '#ff5c8a', '#ff665c', '#ff9f43', '#ffd166', '#39d5ff', '#9b7bff', '#64f0c8', '#8b96b8'];
const backgrounds = ['#17347a', '#11245e', '#2453ff', '#5d2bc5', '#145c58', '#782d52', '#2c3658', '#f5f7ff'];

export default function IconPickerDialog({ item, onSave, onClose }) {
  useI18n();
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
  return <GlassDialog title={t("Icon & thumbnail")} eyebrow={t("Make it recognizable")} className='icon-dialog' onClose={onClose} actions={<><Button variant='secondary' disabled={busy} onClick={() => save({ ...choice, type: 'default', value: '' })}>{t("Use original")}</Button><Button variant='neon' disabled={busy} onClick={() => save()}>{busy ? t("Saving...") : t("Apply")}</Button></>}>
    <div className='icon-preview' style={{ '--preview-background': choice.background, '--preview-color': choice.color }}>
      {customThumbnail ? <img src={choice.value} alt={t("Selected thumbnail preview")} /> : choice.type === 'emoji' ? <span>{choice.value}</span> : <span>{choice.type === 'lucide' ? t("Icon selected") : t("Original icon")}</span>}
    </div>
    <div className='segmented-control'><button type='button' className={tab === 'icons' ? 'active' : ''} onClick={() => setTab('icons')}>{t("Icons")}</button><button type='button' className={tab === 'emoji' ? 'active' : ''} onClick={() => setTab('emoji')}>{t("Emoji")}</button><button type='button' onClick={() => input.current?.click()}><ImagePlus size={15} /> {t("Thumbnail")}</button></div>
    <input ref={input} hidden type='file' accept='image/jpeg,image/png,image/webp' onChange={imageUpload} />
    {tab === 'icons' && <label className='search-field'><Search size={16} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search icons")} /></label>}
    <div className='choice-grid'>{tab === 'icons' ? icons.map(({ key, label, Icon }) => <button type='button' title={t(label)} aria-label={t(label)} className={choice.type === 'lucide' && choice.value === key ? 'active' : ''} key={key} onClick={() => setChoice({ ...choice, type: 'lucide', value: key })}><Icon /></button>) : emojiCatalog.map((emoji) => <button type='button' aria-label={t("Use {value0}", { value0: emoji })} className={choice.type === 'emoji' && choice.value === emoji ? 'active' : ''} key={emoji} onClick={() => setChoice({ ...choice, type: 'emoji', value: emoji })}>{emoji}</button>)}</div>
    {busy && <p className='dialog-copy'>{t("Saving your change...")}</p>}
    {error && <p className='form-error'>{t(error)}</p>}
    <p className='setting-label'>{t("Icon color")}</p>
    <div className='color-row'>{colors.map((color) => <button type='button' key={color} aria-label={t("Icon color {value0}", { value0: color })} className={choice.color === color ? 'active' : ''} style={{ '--swatch': color }} onClick={() => setChoice({ ...choice, color })} />)}</div>
    <p className='setting-label'>{t("Glass background")}</p>
    <div className='color-row'>{backgrounds.map((background) => <button type='button' key={background} aria-label={t("Background {value0}", { value0: background })} className={choice.background === background ? 'active' : ''} style={{ '--swatch': background }} onClick={() => setChoice({ ...choice, background })} />)}</div>
  </GlassDialog>;
}

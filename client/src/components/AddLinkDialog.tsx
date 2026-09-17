import { useI18n, translate as t } from '../lib/i18n.js';
import { useState } from 'react';
import GlassDialog from './GlassDialog.js';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { AnimatedButton } from './animate-ui/AnimatedButton.js';

export default function AddLinkDialog({ initialUrl = '', onAdd, onClose }) {
  useI18n();
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try { await onAdd(url); onClose(); }
    catch (err) { setError(err.message || 'This URL could not be added.'); }
    finally { setSaving(false); }
  }

  return <GlassDialog title={t("Add a URL")} eyebrow={t("Save a corner of the web")} onClose={onClose}>
    <form className='dialog-form' onSubmit={submit}>
      <p className='dialog-copy'>{t("We will turn it into a rich card on your shared desktop.")}</p>
      <Input autoFocus type='url' placeholder={t("https://example.com")} value={url} onChange={(event) => setUrl(event.target.value)} required />
      <small className='form-error'>{t(error)}</small>
      <div className='dialog-actions'><Button variant='secondary' onClick={onClose}>{t("Cancel")}</Button><AnimatedButton variant='neon' type='submit' disabled={saving}>{saving ? t("Adding...") : t("Add to desktop")}</AnimatedButton></div>
    </form>
  </GlassDialog>;
}

import { useState } from 'react';
import GlassDialog from './GlassDialog.jsx';

export default function AddLinkDialog({ initialUrl = '', onAdd, onClose }) {
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

  return <GlassDialog title='Add a URL' eyebrow='Save a corner of the web' onClose={onClose}>
    <form className='dialog-form' onSubmit={submit}>
      <p className='dialog-copy'>We will turn it into a rich card on your shared desktop.</p>
      <input autoFocus type='url' placeholder='https://example.com' value={url} onChange={(event) => setUrl(event.target.value)} required />
      <small className='form-error'>{error}</small>
      <div className='dialog-actions'><button type='button' onClick={onClose}>Cancel</button><button className='primary' disabled={saving}>{saving ? 'Adding...' : 'Add to desktop'}</button></div>
    </form>
  </GlassDialog>;
}

import { useState } from 'react';
import GlassDialog from './GlassDialog.jsx';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { AnimatedButton } from './animate-ui/AnimatedButton.jsx';

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
      <Input autoFocus type='url' placeholder='https://example.com' value={url} onChange={(event) => setUrl(event.target.value)} required />
      <small className='form-error'>{error}</small>
      <div className='dialog-actions'><Button variant='secondary' onClick={onClose}>Cancel</Button><AnimatedButton variant='neon' type='submit' disabled={saving}>{saving ? 'Adding...' : 'Add to desktop'}</AnimatedButton></div>
    </form>
  </GlassDialog>;
}

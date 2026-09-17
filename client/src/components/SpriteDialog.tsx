import { useState } from 'react';
import GlassDialog from './GlassDialog.js';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';

export default function SpriteDialog({ item, onSave, onClose }) {
  const current = item.appearance?.sprite || {};
  const [frames, setFrames] = useState(Math.max(2, current.frames || 4));
  const [fps, setFps] = useState(current.fps || 8);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await onSave({ ...(item.appearance || {}), sprite: { enabled: true, frames: Number(frames), fps: Number(fps) } });
      onClose();
    } finally { setBusy(false); }
  }
  return <GlassDialog title='Animate sprite sheet' eyebrow='One horizontal row of frames' onClose={onClose} actions={<><Button variant='secondary' onClick={onClose}>Cancel</Button><Button variant='neon' disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Animate'}</Button></>}>
    <div className='dialog-form'><label>Frames<Input type='number' min='2' max='120' value={frames} onChange={(event) => setFrames(Number(event.target.value))} /></label><label>Frames per second<Input type='number' min='1' max='60' value={fps} onChange={(event) => setFps(event.target.value)} /></label></div>
    <p className='dialog-copy'>Upload a PNG/WebP sprite sheet with frames arranged left-to-right, then set its frame count and speed here.</p>
  </GlassDialog>;
}

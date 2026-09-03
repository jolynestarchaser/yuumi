import { useState } from 'react';
import { Eraser, MousePointer2, PenLine, TextCursorInput, Trash2, Undo2 } from 'lucide-react';
import { useDesktopStore } from '../store/desktopStore.js';
import ConfirmDialog from './ConfirmDialog.jsx';

const colors = ['#b6ff00', '#2453ff', '#f5f7ff', '#06113e', '#ff5c8a', '#ff665c', '#ff9f43', '#ffd166', '#39d5ff', '#9b7bff', '#64f0c8', '#8b96b8'];
const widths = [3, 5, 9, 15];

export default function PenToolbar() {
  const tool = useDesktopStore((state) => state.tool);
  const pen = useDesktopStore((state) => state.penSettings);
  const setTool = useDesktopStore((state) => state.setTool);
  const setPen = useDesktopStore((state) => state.setPenSettings);
  const undo = useDesktopStore((state) => state.undoStroke);
  const clear = useDesktopStore((state) => state.clearStrokes);
  const [confirm, setConfirm] = useState(false);

  return <><aside className='pen-toolbar' aria-label='Drawing tools'>
    <div className='tool-group'><button className={tool === 'select' ? 'active' : ''} onClick={() => setTool('select')} title='Select'><MousePointer2 size={16} /></button><button className={tool === 'pen' ? 'active' : ''} onClick={() => setTool('pen')} title='Pen'><PenLine size={16} /></button><button className={tool === 'text' ? 'active' : ''} onClick={() => setTool('text')} title='Add text'><TextCursorInput size={16} /></button><button className={tool === 'eraser' ? 'active' : ''} onClick={() => setTool('eraser')} title='Eraser'><Eraser size={16} /></button></div>
    <div className='pen-colors'>{colors.map((color) => <button key={color} aria-label={`Use ${color}`} className={pen.color === color ? 'active' : ''} style={{ '--swatch': color }} onClick={() => { setPen({ color }); if (tool !== 'text') setTool('pen'); }} />)}</div>
    <div className='pen-widths'>{widths.map((width) => <button key={width} className={pen.width === width ? 'active' : ''} onClick={() => { setPen({ width }); if (tool !== 'text') setTool('pen'); }}><i style={{ width, height: width }} /></button>)}</div>
    <div className='tool-group'><button onClick={undo} title='Undo last stroke'><Undo2 size={16} /></button><button onClick={() => setConfirm(true)} title='Clear drawing'><Trash2 size={16} /></button></div>
  </aside>{confirm && <ConfirmDialog title='Clear all drawing?' message='This removes every shared stroke from the desktop.' confirmLabel='Clear drawing' onClose={() => setConfirm(false)} onConfirm={async () => { await clear(); setConfirm(false); }} />}</>;
}

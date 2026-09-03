import { useRef, useState } from 'react';
import { useDesktopStore } from '../store/desktopStore.js';

const WIDTH = 1440;
const HEIGHT = 900;
const path = (points) => points?.length ? `M ${points.map((point) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' L ')}` : '';

function nearStroke(stroke, point) {
  const tolerance = (stroke.width || 4) + 15;
  return stroke.points?.some((candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y) <= tolerance);
}

export default function InkLayer({ canvasRef }) {
  const tool = useDesktopStore((state) => state.tool);
  const pen = useDesktopStore((state) => state.penSettings);
  const strokes = useDesktopStore((state) => state.strokes);
  const remoteInk = useDesktopStore((state) => state.remoteInk);
  const previewStroke = useDesktopStore((state) => state.previewStroke);
  const endPreview = useDesktopStore((state) => state.endStrokePreview);
  const commit = useDesktopStore((state) => state.commitStroke);
  const erase = useDesktopStore((state) => state.eraseStrokes);
  const active = useRef([]);
  const lastPreview = useRef(0);
  const [draft, setDraft] = useState(null);

  function logicalPoint(event) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: Math.max(0, Math.min(WIDTH, ((event.clientX - rect.left) / rect.width) * WIDTH)), y: Math.max(0, Math.min(HEIGHT, ((event.clientY - rect.top) / rect.height) * HEIGHT)) };
  }

  function eraseAt(point) {
    const ids = strokes.filter((stroke) => nearStroke(stroke, point)).map((stroke) => stroke._id);
    if (ids.length) erase(ids);
  }

  function down(event) {
    if (tool === 'select') return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const point = logicalPoint(event);
    if (!point) return;
    if (tool === 'eraser') return eraseAt(point);
    active.current = [point];
    setDraft({ points: active.current, color: pen.color, width: pen.width, opacity: 1 });
  }

  function move(event) {
    if (tool === 'select') return;
    const point = logicalPoint(event);
    if (!point) return;
    if (tool === 'eraser') {
      if (event.buttons) eraseAt(point);
      return;
    }
    if (!active.current.length || !event.buttons) return;
    const previous = active.current.at(-1);
    if (Math.hypot(point.x - previous.x, point.y - previous.y) < 1.5) return;
    active.current = [...active.current, point];
    const next = { points: active.current, color: pen.color, width: pen.width, opacity: 1 };
    setDraft(next);
    if (active.current.length > 1 && performance.now() - lastPreview.current > 34) {
      previewStroke(next);
      lastPreview.current = performance.now();
    }
  }

  function up() {
    if (tool === 'select' || tool === 'eraser') return;
    const stroke = { points: active.current, color: pen.color, width: pen.width, opacity: 1 };
    active.current = [];
    setDraft(null);
    endPreview();
    if (stroke.points.length > 1) commit(stroke);
  }

  return <div className={`ink-layer ${tool !== 'select' ? 'active' : ''}`} aria-label='Desktop drawing surface' onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio='none' aria-hidden='true'>
      {strokes.map((stroke) => <path key={stroke._id} d={path(stroke.points)} stroke={stroke.color} strokeWidth={stroke.width} strokeOpacity={stroke.opacity || 1} fill='none' strokeLinecap='round' strokeLinejoin='round' />)}
      {Object.entries(remoteInk).map(([id, stroke]) => <path key={id} d={path(stroke.points)} stroke={stroke.color} strokeWidth={stroke.width} strokeOpacity={stroke.opacity || 1} fill='none' strokeLinecap='round' strokeLinejoin='round' />)}
      {draft && <path d={path(draft.points)} stroke={draft.color} strokeWidth={draft.width} fill='none' strokeLinecap='round' strokeLinejoin='round' />}
    </svg>
  </div>;
}

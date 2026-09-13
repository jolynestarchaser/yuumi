import { useEffect, useRef, useState } from 'react';
import { useDesktopStore } from '../store/desktopStore.js';
import HistoryDialog from './HistoryDialog.jsx';

const WIDTH = 1440;
const HEIGHT = 900;
const LEGACY_CANVAS = { width: WIDTH, height: HEIGHT };
const path = (points) => points?.length ? `M ${points.map((point) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' L ')}` : '';

function canvasFor(stroke) {
  const width = Number(stroke?.canvas?.width);
  const height = Number(stroke?.canvas?.height);
  return width >= 240 && height >= 160 ? { width, height } : LEGACY_CANVAS;
}

function centerOf(points = []) {
  const bounds = points.reduce((result, point) => ({
    minX: Math.min(result.minX, point.x), maxX: Math.max(result.maxX, point.x),
    minY: Math.min(result.minY, point.y), maxY: Math.max(result.maxY, point.y)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
}

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
  const texts = useDesktopStore((state) => state.texts);
  const commitText = useDesktopStore((state) => state.commitText);
  const updateText = useDesktopStore((state) => state.updateText);
  const eraseTexts = useDesktopStore((state) => state.eraseTexts);
  const active = useRef([]);
  const lastPreview = useRef(0);
  const [draft, setDraft] = useState(null);
  const [draftText, setDraftText] = useState(null);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [movingText, setMovingText] = useState(null);
  const [historyText, setHistoryText] = useState(null);
  const [surface, setSurface] = useState(LEGACY_CANVAS);
  const textInput = useRef(null);
  const movingTextRef = useRef(null);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return undefined;
    const update = () => {
      const rect = element.getBoundingClientRect();
      setSurface({ width: Math.max(1, Math.round(rect.width)), height: Math.max(1, Math.round(rect.height)) });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [canvasRef]);

  function logicalPoint(event) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.max(0, Math.min(WIDTH, ((event.clientX - rect.left) / rect.width) * WIDTH)),
      y: Math.max(0, Math.min(HEIGHT, ((event.clientY - rect.top) / rect.height) * HEIGHT))
    };
  }

  function surfacePoint(event) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top))
    };
  }

  function strokeTransform(stroke) {
    const source = canvasFor(stroke);
    const center = centerOf(stroke.points);
    const scale = Math.min(surface.width / source.width, surface.height / source.height);
    const target = { x: (center.x / source.width) * surface.width, y: (center.y / source.height) * surface.height };
    return { scale, center, target, value: `translate(${target.x} ${target.y}) scale(${scale}) translate(${-center.x} ${-center.y})` };
  }

  function sourcePoint(stroke, point) {
    const transform = strokeTransform(stroke);
    return { x: transform.center.x + (point.x - transform.target.x) / transform.scale, y: transform.center.y + (point.y - transform.target.y) / transform.scale };
  }

  function eraseAt(point) {
    const ids = strokes.filter((stroke) => nearStroke(stroke, sourcePoint(stroke, point))).map((stroke) => stroke._id);
    if (ids.length) erase(ids);
    const logical = { x: (point.x / surface.width) * WIDTH, y: (point.y / surface.height) * HEIGHT };
    const textIds = texts.filter((text) => logical.x >= text.x - 14 && logical.x <= text.x + Math.max(70, text.text.length * text.size * 0.64) && logical.y >= text.y - text.size && logical.y <= text.y + text.size).map((text) => text._id);
    if (textIds.length) eraseTexts(textIds);
  }

  async function saveText() {
    const annotation = draftText && { _id: draftText._id, revision: draftText.revision || 0, text: draftText.value.trim(), x: draftText.x, y: draftText.y, color: draftText.color || pen.color, size: draftText.size || Math.max(16, pen.width * 3) };
    const draftSnapshot = draftText;
    setDraftText(null);
    if (annotation?.text) {
      const result = annotation._id ? await updateText(annotation) : await commitText(annotation);
      if (result?.stale && draftSnapshot) { setDraftText(draftSnapshot); requestAnimationFrame(() => textInput.current?.focus()); }
    }
  }

  function editText(event, text) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedTextId(text._id);
    setDraftText({ ...text, value: text.text });
    requestAnimationFrame(() => textInput.current?.focus());
  }

  function startTextMove(event, text) {
    if (tool !== 'select' || event.button !== 0) return;
    const point = logicalPoint(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedTextId(text._id);
    const moving = {
      id: text._id,
      pointerId: event.pointerId,
      start: point,
      origin: { x: text.x, y: text.y },
      text
    };
    movingTextRef.current = moving;
    setMovingText(moving);
  }

  function moveText(event) {
    const moving = movingTextRef.current;
    if (!moving || moving.pointerId !== event.pointerId) return;
    const point = logicalPoint(event);
    if (!point) return;
    const next = { ...moving, x: Math.max(0, Math.min(WIDTH, moving.origin.x + point.x - moving.start.x)), y: Math.max(0, Math.min(HEIGHT, moving.origin.y + point.y - moving.start.y)) };
    movingTextRef.current = next;
    setMovingText(next);
  }

  function endTextMove(event) {
    const moving = movingTextRef.current;
    if (!moving || moving.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const moved = Math.hypot((moving.x ?? moving.origin.x) - moving.origin.x, (moving.y ?? moving.origin.y) - moving.origin.y) > 1;
    const next = { ...moving.text, x: moving.x ?? moving.origin.x, y: moving.y ?? moving.origin.y };
    movingTextRef.current = null;
    setMovingText(null);
    if (moved) updateText(next).catch(() => {});
  }

  function down(event) {
    if (tool === 'select') return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const logical = logicalPoint(event);
    if (!logical) return;
    if (tool === 'eraser') {
      const point = surfacePoint(event);
      if (point) eraseAt(point);
      return;
    }
    if (tool === 'text') {
      setDraftText({ ...logical, value: '' });
      requestAnimationFrame(() => textInput.current?.focus());
      return;
    }
    const point = surfacePoint(event);
    if (!point) return;
    active.current = [point];
    setDraft({ points: active.current, color: pen.color, width: pen.width, opacity: 1, canvas: surface });
  }

  function move(event) {
    if (tool === 'select' || tool === 'text') return;
    const point = surfacePoint(event);
    if (!point) return;
    if (tool === 'eraser') {
      if (event.buttons) eraseAt(point);
      return;
    }
    if (!active.current.length || !event.buttons) return;
    const previous = active.current.at(-1);
    if (Math.hypot(point.x - previous.x, point.y - previous.y) < 1.5) return;
    active.current = [...active.current, point];
    const next = { points: active.current, color: pen.color, width: pen.width, opacity: 1, canvas: surface };
    setDraft(next);
    if (active.current.length > 1 && performance.now() - lastPreview.current > 34) {
      previewStroke(next);
      lastPreview.current = performance.now();
    }
  }

  function up() {
    if (tool === 'select' || tool === 'eraser' || tool === 'text') return;
    const stroke = { points: active.current, color: pen.color, width: pen.width, opacity: 1, canvas: surface };
    active.current = [];
    setDraft(null);
    endPreview();
    if (stroke.points.length > 1) commit(stroke);
  }

  return <div className={`ink-layer ${tool !== 'select' ? 'active' : ''}`} aria-label='Desktop drawing surface' onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
    <svg viewBox={`0 0 ${surface.width} ${surface.height}`} preserveAspectRatio='none' aria-hidden='true'>
      {strokes.map((stroke) => <g key={stroke._id} transform={strokeTransform(stroke).value}><path d={path(stroke.points)} stroke={stroke.color} strokeWidth={stroke.width} strokeOpacity={stroke.opacity || 1} vectorEffect='non-scaling-stroke' fill='none' strokeLinecap='round' strokeLinejoin='round' /></g>)}
      {Object.entries(remoteInk).map(([id, stroke]) => <g key={id} transform={strokeTransform(stroke).value}><path d={path(stroke.points)} stroke={stroke.color} strokeWidth={stroke.width} strokeOpacity={stroke.opacity || 1} vectorEffect='non-scaling-stroke' fill='none' strokeLinecap='round' strokeLinejoin='round' /></g>)}
      {draft && <g transform={strokeTransform(draft).value}><path d={path(draft.points)} stroke={draft.color} strokeWidth={draft.width} vectorEffect='non-scaling-stroke' fill='none' strokeLinecap='round' strokeLinejoin='round' /></g>}
    </svg>
    <div className='desktop-text-layer' aria-live='polite'>
      {texts.map((text) => {
        const isMoving = movingText?.id === text._id;
        const x = isMoving ? movingText.x ?? movingText.origin.x : text.x;
        const y = isMoving ? movingText.y ?? movingText.origin.y : text.y;
        return <span key={text._id} className={`desktop-text-wrap ${selectedTextId === text._id ? 'selected' : ''} ${isMoving ? 'moving' : ''}`} style={{ left: `${(x / WIDTH) * 100}%`, top: `${(y / HEIGHT) * 100}%` }}><p className={`desktop-text ${selectedTextId === text._id ? 'selected' : ''} ${isMoving ? 'moving' : ''}`} style={{ color: text.color, fontSize: `${text.size}px` }} onClick={(event) => { event.stopPropagation(); setSelectedTextId(text._id); }} onDoubleClick={(event) => editText(event, text)} onPointerDown={(event) => startTextMove(event, text)} onPointerMove={moveText} onPointerUp={endTextMove} onPointerCancel={endTextMove} title='Drag to move · Double-click to edit'>{text.text}</p>{selectedTextId === text._id && <button className='text-history-button' data-no-drag onClick={(event) => { event.stopPropagation(); setHistoryText(text); }}>↺</button>}</span>;
      })}
      {draftText && <form className='desktop-text-editor' style={{ left: `${(draftText.x / WIDTH) * 100}%`, top: `${(draftText.y / HEIGHT) * 100}%`, color: draftText.color || pen.color, fontSize: `${draftText.size || Math.max(16, pen.width * 3)}px` }} onSubmit={(event) => { event.preventDefault(); saveText(); }}>
          <textarea ref={textInput} aria-label='Desktop text' value={draftText.value} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => setDraftText((value) => ({ ...value, value: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Escape') setDraftText(null); if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); saveText(); } }} placeholder='Type here...' rows={1} />
      </form>}
    </div>{historyText && <HistoryDialog entityType='desktop-text' entity={historyText} onClose={() => setHistoryText(null)} />}
  </div>;
}

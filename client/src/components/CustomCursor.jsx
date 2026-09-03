import { useEffect, useState } from 'react';

export default function CustomCursor({ cursor }) {
  const [point, setPoint] = useState({ x: -80, y: -80, visible: false });

  useEffect(() => {
    if (!cursor?.enabled) return undefined;
    const move = (event) => setPoint({ x: event.clientX, y: event.clientY, visible: true });
    const leave = () => setPoint((current) => ({ ...current, visible: false }));
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerleave', leave);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerleave', leave); };
  }, [cursor?.enabled]);

  if (!cursor?.enabled) return null;
  return <i aria-hidden='true' className={`custom-cursor ${cursor.style || 'orb'} shape-${cursor.shape || 'arrow'} ${point.visible ? 'visible' : ''}`} style={{ '--cursor-x': `${point.x}px`, '--cursor-y': `${point.y}px`, '--cursor-color': cursor.color || '#b6ff00' }}>{cursor.shape === 'image' && cursor.asset?.url && <img src={cursor.asset.url} alt='' />}</i>;
}

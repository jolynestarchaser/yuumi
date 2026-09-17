import type { CompanionForm } from '../../../../shared/contracts.js';

// A 32-cell sprite on a 256 × 256 canvas: integer edges stay crisp at 8×.
// Facial parts remain separate so blinking never distorts the whole picture.
export default function PixelCompanion({ form }: { form: CompanionForm }) {
  const child = form === 'child';
  return <svg className='companion-pixel-sprite' viewBox='0 0 32 32' width='256' height='256' shapeRendering='crispEdges' aria-hidden='true'>
    <g fill={form === 'creature' ? '#99bda5' : child ? '#8c6ba9' : '#b5a3de'}>
      <path d='M5 3h3v1h2v2h2v6H6V9H5zM24 3h3v6h-1v3h-6V6h2V4h2z' />
    </g>
    <g fill={form === 'creature' ? '#c4dbbf' : child ? '#a88ac2' : '#e9d0df'}>
      <path d='M6 4h2v1h2v2h1v4H7V8H6zM24 4h2v4h-1v3h-4V7h1V5h2z' />
    </g>
    <path fill={child ? '#dab69e' : '#9f8ac7'} d='M10 8h12v1h3v2h2v3h1v10h-1v3h-3v2H8v-2H5v-3H4V14h1v-3h2V9h3z' />
    <path fill={child ? '#f7d8be' : '#d4c2f0'} d='M10 9h12v1h3v3h1v11h-2v2H8v-2H6V13h1v-3h3z' />
    <path fill={child ? '#ffe6d0' : '#e8dcfc'} d='M10 10h11v1H10v1H8v4H7v-4h1v-1h2z' />
    <path fill={child ? '#e3bba1' : '#b5a3de'} d='M25 14h1v10h-2v2H9v-1h13v-2h2v-2h1z' />
    <path fill='#fff6c0' d='M15 12h2v2h2v1h-2v2h-2v-2h-2v-1h2z' />
    <g className='pixel-eyes' fill='#423452'><rect x='9' y='18' width='2' height='3' /><rect x='21' y='18' width='2' height='3' /></g>
    <path fill='#604766' d='M14 21h1v1h2v-1h1v2h-4z' />
    <g fill='#e7a4c8'><rect x='7' y='22' width='4' height='1' /><rect x='21' y='22' width='4' height='1' /></g>
    <g fill='#9f8ac7'><path d='M7 26h6v4H7zM19 26h6v4h-6z' /></g>
    <g fill='#c5afe9'><path d='M8 26h4v3H8zM20 26h4v3h-4z' /></g>
  </svg>;
}

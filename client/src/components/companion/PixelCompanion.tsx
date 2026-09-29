import type { CompanionFace, CompanionGrowthStage, CompanionSpecies, CompanionVisualForm } from '../../../../shared/contracts.js';
import type { CompanionActivity } from './types.js';

// A 32-cell sprite on a 256 × 256 canvas: integer edges stay crisp at 8×.
// Facial parts remain separate so blinking never distorts the whole picture.
export default function PixelCompanion({ species, face, activity = 'idle', lifeStage = 'hatchling', xpTier = 0, path = 'guardian' }: { species: CompanionSpecies; face: CompanionFace; activity?: CompanionActivity; lifeStage?: CompanionGrowthStage; xpTier?: CompanionVisualForm['xpTier']; path?: 'explorer' | 'guardian' | 'trickster' }) {
  const child = species === 'child';
  const ear = species === 'cat' || species === 'fox' ? 'M5 6h2V4h1v1h2v2h2v6H5zM20 7h2V5h2V4h1v2h2v7h-7z'
    : species === 'robot' ? 'M15 2h2v6h-2zM13 1h6v3h-6z'
    : child ? 'M6 6h5v7H5V8h1zM21 6h5v2h1v5h-6z'
    : species === 'dragon' ? 'M7 3h2v3h2v6H6V7h1zM23 3h2v4h1v5h-5V6h2z'
    : 'M5 3h3v1h2v2h2v6H6V9H5zM24 3h3v6h-1v3h-6V6h2V4h2z';
  // Each XP milestone changes the filled silhouette, not just its decoration.
  // The same stepped contour is used for the border, so there is no ghost of the hatchling outline.
  const forms = {
    guardian: [
      'M10 9h12v1h3v3h1v11h-2v2H8v-2H6V13h1v-3h3z',
      'M9 9h14v1h3v3h1v11h-2v3H7v-3H5V13h1v-3h3z',
      'M8 9h16v1h3v3h2v11h-2v4H5v-4H3V13h2v-3h3z',
      'M7 8h18v2h3v3h2v12h-3v4H5v-4H2V13h2v-3h3z'
    ],
    explorer: [
      'M10 9h12v1h3v3h1v11h-2v2H8v-2H6V13h1v-3h3z',
      'M11 7h10v1h3v3h2v12h-2v3H8v-3H6V11h2V9h3z',
      'M11 5h10v2h3v3h2v14h-2v4H8v-4H6V10h2V7h3z',
      'M12 3h8v2h3v3h2v3h2v14h-3v4H8v-4H5V11h2V8h2V5h3z'
    ],
    trickster: [
      'M10 9h12v1h3v3h1v11h-2v2H8v-2H6V13h1v-3h3z',
      'M10 8h12v2h4v4h-2v10h-3v3H10v-2H7v-4H5v-7h2v-3h3z',
      'M9 7h13v2h5v5h-2v11h-4v3H10v-2H6v-4H4v-8h2v-4h3z',
      'M8 6h14v2h5v5h2v4h-3v9h-5v3H10v-2H5v-5H3v-9h3V9h2z'
    ]
  } as const;
  const body = forms[path][xpTier];
  return <svg className='companion-pixel-sprite' viewBox='0 0 32 32' width='256' height='256' shapeRendering='crispEdges' aria-hidden='true'>
    {xpTier > 0 && <path fill='var(--creature-accent)' d={path === 'explorer' ? 'M2 15h4v2h3v2H5v3H2zM23 15h3v2h4v5h-3v-3h-4z' : path === 'trickster' ? 'M3 21h5v2h3v3H4v-2H2zM23 20h5v2h2v4h-7v-3h3z' : 'M2 17h5v2h3v3H4v-2H2zM22 17h4v2h4v3h-3v-1h-5z'} />}
    {species === 'dragon' && <path fill='var(--creature-accent)' d='M1 13h2v2h3v10H4v-3H2v-4H1zM29 13h2v5h-1v4h-2v3h-2V15h3z' />}
    {(species === 'cat' || species === 'fox') && <path fill='var(--creature-accent)' d='M26 21h3v-2h2v7h-2v2h-5v-3h2z' />}
    <path fill='var(--creature-accent)' d={ear} />
    <path fill='var(--creature-body)' stroke='color-mix(in srgb,var(--creature-body) 35%,var(--creature-eye))' strokeWidth='2' strokeLinejoin='miter' d={body} />
    <path fill='color-mix(in srgb,var(--creature-body) 65%,white)' d='M10 10h11v1H10v1H8v4H7v-4h1v-1h2z' />
    <path fill='color-mix(in srgb,var(--creature-body) 80%,var(--creature-eye))' d='M25 14h1v10h-2v2H9v-1h13v-2h2v-2h1z' />
    <path fill='var(--creature-accent)' d='M15 12h2v2h2v1h-2v2h-2v-2h-2v-1h2z' />
    <g className='pixel-eyes' fill='var(--creature-eye)'>
      {activity === 'sleeping' ? <path d='M8 20h4v1H8zM20 20h4v1h-4z' />
        : activity === 'error' ? <path d='M8 18h3v1H8zM10 19h2v2h-2zM20 18h4v1h-4zM20 20h4v1h-4z' />
        : activity === 'working' ? <path d='M8 18h4v1H8zM9 19h2v2H9zM20 18h4v1h-4zM21 19h2v2h-2z' />
        : activity === 'searching' ? <path d='M8 18h3v4H8zM20 18h3v4h-3zM9 18h1v1H9zM21 18h1v1h-1z' />
        : activity === 'thinking' ? <path d='M10 18h2v3h-2zM22 18h2v3h-2z' />
        : activity === 'success' || face === 'happy' ? <path d='M8 19h1v-1h2v1h1v2h-1v-1H9v1H8zM20 19h1v-1h2v1h1v2h-1v-1h-2v1h-1z' />
        : face === 'starry' ? <path d='M9 17h1v2h2v1h-2v2H9v-2H7v-1h2zM22 17h1v2h2v1h-2v2h-1v-2h-2v-1h2z' />
        : face === 'sleepy' ? <path d='M8 20h4v1H8zM20 20h4v1h-4z' />
        : <><rect x='9' y='18' width='2' height='3' />{face === 'mischievous' ? <path d='M20 19h4v1h-4z' /> : <rect x='21' y='18' width='2' height='3' />}</>}
    </g>
    <path fill='var(--creature-eye)' d={activity === 'error' ? 'M14 23h4v1h-4z' : activity === 'working' ? 'M14 22h4v1h-4z' : activity === 'sleeping' ? 'M15 23h2v2h-2z' : activity === 'success' || face === 'happy' ? 'M14 21h4v3h-1v1h-2v-1h-1z' : 'M14 21h1v1h2v-1h1v2h-4z'} />
    <g fill='color-mix(in srgb,#f2a7bd 75%,var(--creature-body))'><rect x='7' y='22' width='4' height='1' /><rect x='21' y='22' width='4' height='1' /></g>
    <g fill='color-mix(in srgb,var(--creature-body) 65%,var(--creature-eye))'><path d='M7 26h6v4H7zM19 26h6v4h-6z' /></g>
    <g fill='var(--creature-body)'><path d='M8 26h4v3H8zM20 26h4v3h-4z' /></g>
    {xpTier >= 2 && <path fill='var(--creature-eye)' d='M5 11h3v2H5zM24 11h3v2h-3z' />}
    {xpTier >= 3 && <><path fill='var(--creature-accent)' d='M4 8h3V4h2v6H4zM23 4h2v4h3v2h-5z' /><path fill='var(--creature-eye)' d='M5 27h7v2H5zM20 27h7v2h-7z' /></>}
    {lifeStage === 'elder' && <path fill='color-mix(in srgb,var(--creature-accent) 70%,white)' d='M10 12h2v1h-2zM20 12h2v1h-2zM14 26h4v1h-4z' />}
  </svg>;
}

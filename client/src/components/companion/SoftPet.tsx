import type { CompanionFace, CompanionSpecies } from '../../../../shared/contracts.js';
import type { CompanionActivity } from './types.js';

export type PetArtFamily = 'tail' | 'crest' | 'paws' | 'wings' | 'horns' | 'gills';
export type PetArtSpecies = CompanionSpecies | 'dog' | 'frog' | 'duck';
export interface PetArtPart { step: number; variant: string }
export interface PetArtRender {
  species: PetArtSpecies;
  level: number;
  parts: Partial<Record<PetArtFamily, PetArtPart>>;
}
export const SOFT_PET_SPECIES = ['cat', 'dog', 'frog', 'dragon', 'duck'] as const;
export const petArtPalette = { cat: '#FFF4DD', dog: '#FFBD77', frog: '#A8D9BE', dragon: '#C5B6E8', duck: '#FFF4DD' };

/** Preview defaults only. Saved server parts take precedence; this function never rolls a growth outcome. */
export function previewPetParts(species: string, level: number): PetArtRender['parts'] {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.min(10, Math.floor(level))) : 1;
  const first = species === 'frog' || species === 'duck' ? 'crest' : 'tail';
  const last = species === 'dog' ? 'horns' : species === 'frog' ? 'gills' : 'wings';
  return {
    [first]: { step: Math.min(2, safeLevel - 1), variant: 'neutral' },
    paws: { step: Math.min(3, Math.max(0, safeLevel - 3)), variant: 'neutral' },
    [last]: { step: Math.min(4, Math.max(0, safeLevel - 6)), variant: 'neutral' },
  };
}

// Authored discrete contours. Source pivots match the named sockets below.
const wingPaths = [
  '', 'M0 0C-28-30-50-18-40 8C-34 25-13 25 0 0Z',
  'M0 0C-42-54-70-42-62-7C-82 17-44 36 0 0Z',
  'M0 0C-38-69-87-68-79-27C-111-15-89 12-74 17C-76 48-28 36 0 0Z',
  'M0 0C-45-95-107-87-98-45C-135-33-127 1-103 9C-119 47-68 54-51 35C-29 47-6 27 0 0Z',
];
const hornPaths = [
  '', 'M0 0C-17-5-17-26-6-27C9-28 13-11 10 0Z',
  'M0 0C-26-22-21-54-7-52C6-50-1-27 13-14L14 0Z',
  'M0 0C-25-23-25-61-12-62C1-64-8-43 3-34C-3-73 19-75 18-51L13-18L16 0Z',
  'M0 0C-29-23-38-77-21-77C-7-76-17-47-2-39C-9-89 15-102 20-83C22-70 7-48 17-29C35-57 51-55 47-37L20 0Z',
];
const gillPaths = [
  '', 'M0 0C-28-22-35 7-13 15Z',
  'M0 0C-39-42-55-7-29 9C-48 22-25 41 0 0Z',
  'M0 0C-47-55-65-25-35-3C-75-8-69 33-33 25C-39 54-4 39 0 0Z',
  'M0 0C-56-72-79-39-46-10C-96-26-105 24-55 24C-76 66-24 74-22 36C-1 52 14 21 0 0Z',
];
const tailPaths = [
  'M0 0C38 15 58-17 35-26C23-31 20-16 10-17Z',
  'M0 0C36 24 85-5 57-36C41-55 25-35 36-24C47-12 25-12 14-20Z',
  'M0 0C45 31 104-1 72-44C74-65 48-71 40-51C18-58 18-33 37-24C51-13 25-12 14-20Z',
];
const pawPaths = [
  'M0 0C-13 4-17 32-2 35C17 38 19 6 0 0Z',
  'M0 0C-18 3-26 43-4 44C22 46 26 7 0 0Z',
  'M0 0C-19-1-22 24-30 30C-36 41-23 48-15 40C-4 57 14 48 12 39C33 37 26 8 0 0Z',
  'M0 0C-25-2-22 21-33 26C-45 33-37 47-23 44C-22 60-3 65 4 49C23 58 35 42 22 29C29 13 16 0 0 0Z',
];
const boundedStep = (part: PetArtPart | undefined, max: number) => Number.isFinite(part?.step) ? Math.max(0, Math.min(max, Math.floor(part!.step))) : 0;

export default function SoftPet({ species, face = 'gentle', activity = 'idle', level = 1, render }: {
  species: PetArtSpecies; face?: CompanionFace; activity?: CompanionActivity; level?: number; render?: PetArtRender;
}) {
  const parts = render?.parts || previewPetParts(species, level);
  const sleeping = activity === 'sleeping' || face === 'sleepy';
  const happy = activity === 'success' || face === 'happy';
  const frog = species === 'frog';
  const duck = species === 'duck';
  const dragon = species === 'dragon';
  const eyesY = frog ? 218 : 264;
  const step = (family: PetArtFamily, max: number) => boundedStep(parts[family], max);
  const ornament = (family: PetArtFamily) => parts[family]?.variant === 'star' && step(family, 4) === 4;
  function pairedPart(family: 'wings' | 'horns' | 'gills', paths: string[], x: number, y: number) {
    const currentStep = step(family, 4);
    if (!currentStep) return null;
    return <g data-part={family} data-step={currentStep} data-variant={currentStep < 4 ? 'neutral' : parts[family]?.variant} fill='var(--creature-accent)'>
      {[-1, 1].map((side) => <g key={side} data-layer={`${family}${side < 0 ? 'Far' : 'Near'}`} transform={`translate(${256 + side * x} ${y}) scale(${-side} 1)`}>
        <g className={`pet-art-${family}`}><path d={paths[currentStep]} />{currentStep >= 2 && <path d={family === 'horns' ? 'M1-8L5-28' : 'M-5 3Q-20-2-30-15'} fill='none' strokeWidth='8' />}{ornament(family) && <path d='M-52-28l4 8 9 2-7 6 1 9-7-5-8 4 3-9-6-7 9-1Z' fill='#FFF4DD' strokeWidth='5' />}</g>
      </g>)}
    </g>;
  }
  return <svg className='companion-soft-pet' viewBox='0 0 512 512' width='256' height='256' aria-hidden='true' data-species={species} data-art-version='pet-outline-v1' fill='var(--creature-body)' stroke='#5B3D45' strokeWidth='10' strokeLinecap='round' strokeLinejoin='round'>
    <ellipse data-layer='groundShadow' cx='256' cy='448' rx='115' ry='15' fill='#5B3D45' opacity='.15' stroke='none' />
    <g data-layer='root' className='pet-art-root'>
      {pairedPart('wings', wingPaths, 94, 307)}
      {!duck && !frog && <g data-layer='tailBack' transform='translate(352 378)'><path d={tailPaths[step('tail', 2)]} fill='var(--creature-accent)' /></g>}
      <g data-layer='hindlimbs' fill={duck ? '#FFBD77' : 'var(--creature-body)'}>
        <path data-layer='hindlimbFar' d={duck ? 'M194 411Q161 428 170 441H229L226 411Z' : 'M188 404C153 408 154 445 190 445H229V415Z'} />
        <path data-layer='hindlimbNear' d={duck ? 'M282 411L280 441H341Q352 427 320 411Z' : 'M281 415V445H322C358 445 351 408 320 404Z'} />
      </g>
      <path data-layer='body' d={frog ? 'M133 327C103 383 131 427 199 430H311C385 430 409 380 373 323Z' : duck ? 'M172 291C146 324 122 355 143 398C162 439 311 451 356 410C392 378 367 323 333 294Z' : 'M170 281C143 318 130 376 153 407C184 448 329 449 359 408C384 374 363 313 335 281Z'} />
      <ellipse data-layer='bodyPatternClip' cx='260' cy='370' rx='62' ry='51' fill='#FFF4DD' stroke='none' opacity='.65' />
      {!frog && !duck && <g data-layer='ears' fill='var(--creature-accent)'>
        {species === 'cat' ? <><path d='M152 216L151 132Q154 109 174 124L224 166Z' /><path d='M291 164L338 122Q357 109 360 133L361 218Z' /></> : species === 'dog' ? <><path d='M167 185C129 134 109 155 110 208L123 266Q154 290 178 239Z' /><path d='M327 178C363 136 391 165 389 215L375 266Q345 281 328 238Z' /></> : <><path d='M159 199Q134 170 151 140Q173 127 185 185Z' /><path d='M327 190Q342 125 366 143Q381 174 352 207Z' /></>}
      </g>}
      <path data-layer='head' d={frog ? 'M160 231C126 211 107 253 116 303C127 356 388 361 398 306C409 260 386 217 353 232Z' : duck ? 'M166 269C141 221 168 151 238 149C308 140 357 183 354 238C355 299 312 326 253 325C213 325 181 305 166 269Z' : 'M143 248C142 175 191 145 257 149C327 145 374 185 370 258C365 320 316 343 255 340C191 343 142 317 143 248Z'} />
      {frog && <g data-layer='eyeBulbs'><circle cx='177' cy='214' r='44' /><circle cx='335' cy='214' r='44' /></g>}
      {(duck || frog) && <g data-layer='crest' transform={`translate(256 ${duck ? 149 : 240})`} fill='var(--creature-accent)'><path d={step('crest', 2) === 0 ? 'M-12 0Q-17-28-4-24Q9-24 12 0Z' : step('crest', 2) === 1 ? 'M-22 0Q-40-36-20-41Q-4-43 1-20Q17-44 27-31Q40-12 22 0Z' : 'M-30 0Q-55-35-35-47Q-17-58-9-25Q-8-68 13-59Q29-54 21-26Q47-51 54-29Q61-7 30 0Z'} /></g>}
      {dragon && <g data-layer='speciesHornMarkers' fill='#FFF4DD'><path d='M196 163Q176 116 195 120Q217 133 214 158Z' /><path d='M299 158Q297 115 316 119Q335 124 318 167Z' /></g>}
      {pairedPart('horns', hornPaths, 65, 163)}
      {pairedPart('gills', gillPaths, 124, 298)}
      <g data-layer='forelimbs' fill='var(--creature-body)'>
        {[-1, 1].map((side) => <g key={side} transform={`translate(${256 + side * 104} 338) scale(${-side} 1)`} data-layer={`forelimb${side < 0 ? 'Far' : 'Near'}`}><g className='pet-art-paw'><path d={pawPaths[step('paws', 3)]} />{step('paws', 3) >= 2 && <path d='M-8 29L-7 37M6 28L8 35' fill='none' strokeWidth='6' />}</g></g>)}
      </g>
      <g data-layer='face' stroke='var(--creature-eye)' fill='var(--creature-eye)'>
        <g className={sleeping || happy ? '' : 'pet-art-eyes'}>
          {[frog ? 177 : 211, frog ? 335 : 305].map((x, index) => <g key={x}>
            {sleeping ? <path d={`M${x - 12} ${eyesY}q12 9 24 0`} fill='none' strokeWidth='8' /> : happy ? <path d={`M${x - 12} ${eyesY}q12-18 24 0`} fill='none' strokeWidth='8' /> : face === 'mischievous' && index === 1 ? <path d={`M${x - 12} ${eyesY}h24`} fill='none' strokeWidth='8' /> : <><ellipse cx={x} cy={eyesY} rx='10' ry='15' stroke='none' /><circle cx={x - 3} cy={eyesY - 6} r='3.5' fill='#FFF4DD' stroke='none' /></>}
          </g>)}
        </g>
        {duck ? <path data-layer='beak' d='M232 281Q262 272 290 284Q290 304 261 306Q233 306 232 281Z' fill='#FFBD77' stroke='#5B3D45' strokeWidth='8' /> : species === 'dog' || dragon ? <><ellipse data-layer='muzzle' cx='260' cy='290' rx='33' ry='23' fill='#FFF4DD' stroke='none' /><ellipse cx='260' cy='282' rx={dragon ? 10 : 13} ry='8' stroke='none' /><path d='M260 292q-12 17-23 3M260 292q12 17 23 3' fill='none' strokeWidth='6' /></> : <path d={frog ? 'M198 287Q258 326 318 287' : happy ? 'M244 291Q259 318 276 291Z' : 'M245 293Q259 306 274 293'} fill={happy && !frog ? 'var(--creature-eye)' : 'none'} strokeWidth='7' />}
      </g>
      <g data-layer='cheeks' fill='#F6A4B6' stroke='none' opacity='.8'><ellipse cx={frog ? 164 : 187} cy={frog ? 293 : 291} rx='18' ry='9' /><ellipse cx={frog ? 354 : 330} cy={frog ? 293 : 291} rx='18' ry='9' /></g>
      <path data-layer='highlight' d={frog ? 'M138 257Q141 242 151 244' : 'M170 224Q176 191 198 184'} fill='none' stroke='#FFF4DD' strokeWidth='12' opacity='.8' />
    </g>
  </svg>;
}

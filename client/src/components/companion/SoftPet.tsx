import type { CompanionAppearance, CompanionFace, CompanionGrowthStage, CompanionSpecies, PetBodyForm } from '../../../../shared/contracts.js';
import { resolveBodyForm } from './petBodyForms.js';
import type { CompanionActivity } from './types.js';
import { ageArtStages, speciesArtKits } from './speciesArtKit.js';
import { childHornPaths, robotHornPaths, robotTailPaths, speciesPawPaths, speciesWingPaths, spiritTailPaths, dogTailPaths } from './speciesPartPaths.js';
import PetAccessories from './PetAccessories.js';

export type PetArtFamily = 'tail' | 'crest' | 'paws' | 'wings' | 'horns' | 'gills';
export type PetArtSpecies = CompanionSpecies | 'dog' | 'frog' | 'duck';
export interface PetArtPart { step: number; variant: string }
export interface PetArtRender {
  species: PetArtSpecies;
  level: number;
  parts: Partial<Record<PetArtFamily, PetArtPart>>;
  bodyForm?: PetBodyForm;
}
export const SOFT_PET_SPECIES = ['cat', 'dog', 'frog', 'dragon', 'duck', 'spirit', 'bunny', 'fox', 'robot', 'child', 'custom'] as const;
export const petArtPalette = { cat: '#FFF4DD', dog: '#FFBD77', frog: '#A8D9BE', dragon: '#C5B6E8', duck: '#FFF4DD', spirit: '#C5B6E8', bunny: '#FFF4DD', fox: '#FFBD77', robot: '#AEDBF0', child: '#F7D8BE', custom: '#C5B6E8' };

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

export default function SoftPet({ species, face = 'gentle', activity = 'idle', level = 1, render, silhouette = 'round', lifeStage = 'grown', appearance, walking = false, facing = 'right' }: {
  species: PetArtSpecies; face?: CompanionFace; activity?: CompanionActivity; level?: number; render?: PetArtRender; silhouette?: 'round' | 'bean' | 'fluffy'; lifeStage?: CompanionGrowthStage; appearance?: CompanionAppearance; walking?: boolean; facing?: 'left' | 'right';
}) {
  const parts = render?.species === species ? render.parts : previewPetParts(species, level);
  const bodyForm = resolveBodyForm(species, render?.species === species ? render.bodyForm : undefined);
  const sleeping = activity === 'sleeping' || face === 'sleepy';
  const happy = activity === 'success' || face === 'happy';
  const frog = species === 'frog';
  const duck = species === 'duck';
  const dragon = species === 'dragon';
  const robot = species === 'robot';
  const child = species === 'child';
  const age = ageArtStages[lifeStage];
  const kit = speciesArtKits[species];
  const nativeTail = robot ? robotTailPaths : species === 'spirit' ? spiritTailPaths : species === 'dog' ? dogTailPaths : tailPaths;
  const eyesY = frog ? 218 : 264;
  const step = (family: PetArtFamily, max: number) => boundedStep(parts[family], max);
  const tailStep = step('tail', 2);
  const tailContour = child ? ['', 'M-8-21Q32-18 40 16L10 8Z', 'M-8-21Q48-24 67 25L37 18L32 34L8 9Z'][tailStep]
    : species === 'dragon' ? ['M0 0Q45 18 62-27L71-50L85-12L63-11Q46 35 0 15Z', 'M0 0Q60 18 62-27L83-50L85-12L63-11Q46 35 0 15Z', 'M0 0Q75 18 62-27L95-50L85-12L63-11Q46 35 0 15Z'][tailStep]
    : species === 'fox' ? 'M0 0C58 32 113-18 64-77C54-48 11-48 13-20Z'
    : species === 'bunny' ? 'M0-6C24-38 56-20 45 6C30 27 9 21 0-6Z'
    : nativeTail[tailStep];
  const ornament = (family: PetArtFamily) => parts[family]?.variant === 'star' && step(family, 4) === 4;
  function pairedPart(family: 'wings' | 'horns' | 'gills', paths: string[], x: number, y: number) {
    const currentStep = step(family, 4);
    if (!currentStep) return null;
    return <g data-part={family} data-step={currentStep} data-variant={currentStep < 4 ? 'neutral' : parts[family]?.variant} fill='var(--creature-accent)'>
      {[-1, 1].map((side) => {
        const prefix = family === 'wings' ? 'wing' : family === 'horns' ? 'horn' : 'gill';
        const socket = bodyForm?.sockets[`${prefix}${side < 0 ? 'Left' : 'Right'}`];
        return <g key={side} data-layer={`${family}${side < 0 ? 'Far' : 'Near'}`} transform={`translate(${socket?.anchor.x ?? 256 + side * x} ${socket?.anchor.y ?? y}) scale(${-side} 1)`}>
        <g className={`pet-art-${family}`}><path d={paths[currentStep]} />{currentStep >= 2 && <path d={robot ? 'M-13-5v-15' : family === 'horns' ? 'M1-8L5-28' : 'M-5 3Q-20-2-30-15'} fill='none' strokeWidth='8' />}{ornament(family) && <path d='M-52-28l4 8 9 2-7 6 1 9-7-5-8 4 3-9-6-7 9-1Z' fill='#FFF4DD' strokeWidth='5' />}{currentStep === 4 && parts[family]?.variant === 'petal' && <path d='M-23-12Q-43-40-51-19Q-48 2-23-12Z' fill={robot ? '#A8D9BE' : '#F6A4B6'} strokeWidth='5' />}{currentStep === 4 && parts[family]?.variant === 'soft' && <path d='M-12 10Q-23 21-32 10' fill='none' stroke='#FFF4DD' strokeWidth='6' />}</g>
      </g>; })}
    </g>;
  }
  return <svg className={`companion-soft-pet ${walking && !sleeping ? 'pet-is-walking' : ''}`} style={{ '--pet-walk-cycle': `${kit.cycle * age.cadence}s` }} viewBox='0 0 512 512' width='256' height='256' aria-hidden='true' data-species={species} data-gait={kit.gait} data-life-stage={lifeStage} data-art-version='pet-outline-v2' fill='var(--creature-body)' stroke='#5B3D45' strokeWidth='10' strokeLinecap='round' strokeLinejoin='round'>
    <ellipse data-layer='groundShadow' cx='256' cy='448' rx='115' ry='15' fill='#5B3D45' opacity='.15' stroke='none' />
    <g transform={facing === 'left' ? 'translate(512 0) scale(-1 1)' : undefined}>
    <g transform={`translate(${256 * (1 - age.scale)} ${448 * (1 - age.scale)}) scale(${age.scale})`}>
    <g data-layer='root' className='pet-art-root'>
      {pairedPart('wings', speciesWingPaths[species] || wingPaths, 94, 307)}
      {!duck && !frog && <g data-layer='tailBack' transform={`translate(${bodyForm?.sockets.tail.anchor.x ?? 352} ${bodyForm?.sockets.tail.anchor.y ?? 378})`}><g className='pet-art-tail'>
        <path d={tailContour} fill='var(--creature-accent)' />
        {species === 'fox' && <path d='M64-77Q81-57 83-40Q61-46 48-33Q52-57 64-77Z' fill='#FFF4DD' />}
        {(species === 'fox' || species === 'bunny') && tailStep > 0 && <path data-layer='tailTuft' d={tailStep === 1 ? 'M29-20Q26-46 43-40Q59-44 54-23Z' : 'M27-20Q13-42 29-49Q38-67 49-48Q72-52 62-31L52-18Z'} fill='var(--creature-accent)' />}
      </g></g>}
      <g data-layer='hindlimbs' fill={duck ? '#FFBD77' : 'var(--creature-body)'}>
        <g className='pet-art-leg far'><path data-layer='hindlimbFar' d={robot ? 'M178 401h43v43h-49v-18h6Z' : duck ? 'M194 411Q161 428 170 441H229L226 411Z' : 'M188 404C153 408 154 445 190 445H229V415Z'} /></g>
        <g className='pet-art-leg near'><path data-layer='hindlimbNear' d={robot ? 'M291 401h43v25h6v18h-49Z' : duck ? 'M282 411L280 441H341Q352 427 320 411Z' : 'M281 415V445H322C358 445 351 408 320 404Z'} /></g>
      </g>
      <path data-layer='body' d={bodyForm?.bodyPath ?? (frog ? 'M133 327C103 383 131 427 199 430H311C385 430 409 380 373 323Z' : duck ? 'M172 291C146 324 122 355 143 398C162 439 311 451 356 410C392 378 367 323 333 294Z' : robot ? 'M179 310H334Q350 310 350 326V405Q350 433 324 433H189Q162 433 162 405V326Q162 310 179 310Z' : silhouette === 'bean' ? 'M192 286C156 306 165 339 149 367C127 424 231 445 300 433C368 422 388 366 344 307C320 275 223 268 192 286Z' : silhouette === 'fluffy' ? 'M176 291Q135 314 145 337Q119 355 137 375Q116 403 147 413Q146 437 181 425Q226 449 264 433Q306 451 334 429Q369 438 368 410Q400 392 376 370Q390 343 364 330Q365 305 339 289Z' : 'M170 281C143 318 130 376 153 407C184 448 329 449 359 408C384 374 363 313 335 281Z')} />
      <ellipse data-layer='bodyPatternClip' cx='260' cy='370' rx='62' ry='51' fill='#FFF4DD' stroke='none' opacity='.65' />
      {bodyForm && <g data-layer='chassisSignature' fill='var(--creature-accent)' strokeWidth='6'>
        {bodyForm.style === 'nature' ? <><path d='M255 402Q211 377 217 344Q248 342 257 371Q271 341 298 351Q299 383 255 402Z' /><path d='M256 367V405' fill='none' /></> : bodyForm.style === 'celestial' ? <><circle cx='256' cy='370' r='33' fill='#FFF4DD' /><path d='M256 348L263 363L280 370L263 377L256 393L249 377L232 370L249 363Z' /></> : <><rect x='212' y='346' width='88' height='49' rx='8' /><path d='M226 361H242M270 361H285M226 380H285' fill='none' /></>}
      </g>}
      <PetAccessories species={species} stage={lifeStage} appearance={appearance} layer='body' />
      {!frog && !duck && <g data-layer='ears' fill='var(--creature-accent)'>
        {species === 'cat' ? <><path d='M152 216L151 132Q154 109 174 124L224 166Z' /><path d='M291 164L338 122Q357 109 360 133L361 218Z' /></> : species === 'dog' ? <><path d='M167 185C129 134 109 155 110 208L123 266Q154 290 178 239Z' /><path d='M327 178C363 136 391 165 389 215L375 266Q345 281 328 238Z' /></> : species === 'bunny' ? <g data-layer='bunnyEars'><path d='M175 194C139 138 147 57 170 56C197 57 207 130 209 163Z' /><path d='M302 165C307 108 331 74 352 92C366 104 351 123 337 126Q338 167 340 195Z' /></g> : species === 'fox' ? <g data-layer='foxEars'><path d='M143 220L131 92Q138 69 155 92L219 166Z' /><path d='M295 167L359 83Q377 66 378 97L369 224Z' /></g> : species === 'spirit' ? <g data-layer='leafEars'><path d='M169 205C109 197 107 149 119 118C166 117 198 144 194 182Z' /><path d='M317 182C321 141 350 118 389 128C395 166 382 200 344 210Z' /><path d='M132 141L172 181M374 149L338 187' fill='none' strokeWidth='6' /></g> : robot ? <g data-layer='robotAntenna'><path d='M256 159V112' fill='none' /><circle cx='256' cy='98' r='15' /><rect x='121' y='222' width='24' height='48' rx='10' /><rect x='369' y='222' width='24' height='48' rx='10' /></g> : child ? <g data-layer='storybookEars'><circle cx='143' cy='258' r='21' /><circle cx='370' cy='258' r='21' /></g> : species === 'custom' ? <g data-layer='cloudEars'><path d='M165 206C130 215 117 191 126 173C105 152 125 128 146 137C154 103 191 117 190 147L203 173Z' /><path d='M316 176L324 145C326 110 360 119 363 145C391 134 402 166 382 181C390 204 366 217 342 204Z' /></g> : <><path d='M159 199Q134 170 151 140Q173 127 185 185Z' /><path d='M327 190Q342 125 366 143Q381 174 352 207Z' /></>}
      </g>}
      <path data-layer='head' d={bodyForm?.headPath ?? (robot ? 'M168 162H343Q370 162 370 190V304Q370 333 343 333H168Q142 333 142 304V190Q142 162 168 162Z' : species === 'fox' ? 'M149 223C143 167 204 144 257 149C315 146 371 181 368 229L389 265L366 267L377 283C345 325 309 339 257 341C207 338 169 329 136 283L150 270L128 264Z' : frog ? 'M160 231C126 211 107 253 116 303C127 356 388 361 398 306C409 260 386 217 353 232Z' : duck ? 'M166 269C141 221 168 151 238 149C308 140 357 183 354 238C355 299 312 326 253 325C213 325 181 305 166 269Z' : 'M143 248C142 175 191 145 257 149C327 145 374 185 370 258C365 320 316 343 255 340C191 343 142 317 143 248Z')} />
      {robot && <rect data-layer='facePanel' x='166' y='222' width='180' height='86' rx='25' fill='#FFF4DD' strokeWidth='8' />}
      {child && <path data-layer='storybookHair' d='M146 226C137 169 190 140 257 149C319 142 367 174 370 220Q330 228 311 184Q286 209 268 187Q218 228 192 196Q175 222 146 226Z' fill='var(--creature-accent)' />}
      {species === 'spirit' && <path data-layer='leafSignature' d='M251 201Q222 188 229 172Q255 169 264 193Q283 170 298 182Q295 204 263 213Z' fill='var(--creature-accent)' strokeWidth='6' />}
      {frog && <g data-layer='eyeBulbs'><circle cx='177' cy='214' r='44' /><circle cx='335' cy='214' r='44' /></g>}
      {(duck || frog) && <g data-layer='crest' transform={`translate(256 ${duck ? 149 : 240})`} fill='var(--creature-accent)'><path d={step('crest', 2) === 0 ? 'M-12 0Q-17-28-4-24Q9-24 12 0Z' : step('crest', 2) === 1 ? 'M-22 0Q-40-36-20-41Q-4-43 1-20Q17-44 27-31Q40-12 22 0Z' : 'M-30 0Q-55-35-35-47Q-17-58-9-25Q-8-68 13-59Q29-54 21-26Q47-51 54-29Q61-7 30 0Z'} /></g>}
      {dragon && <g data-layer='speciesHornMarkers' fill='#FFF4DD'><path d='M196 163Q176 116 195 120Q217 133 214 158Z' /><path d='M299 158Q297 115 316 119Q335 124 318 167Z' /></g>}
      {child && step('horns', 4) > 0 && <path data-layer='headband' d='M161 209Q250 164 355 209' fill='none' stroke='var(--creature-accent)' strokeWidth='12' />}
      {pairedPart('horns', robot ? robotHornPaths : child ? childHornPaths : hornPaths, 65, 163)}
      {pairedPart('gills', gillPaths, 124, 298)}
      <g data-layer='forelimbs' fill='var(--creature-body)'>
        {[-1, 1].map((side) => {
          const socket = bodyForm?.sockets[side < 0 ? 'pawLeft' : 'pawRight'];
          return <g key={side} transform={`translate(${socket?.anchor.x ?? 256 + side * 104} ${socket?.anchor.y ?? 338}) scale(${-side} 1)`} data-layer={`forelimb${side < 0 ? 'Far' : 'Near'}`}><g className={`pet-art-paw ${side < 0 ? 'far' : 'near'}`}><path d={(speciesPawPaths[species] || pawPaths)[step('paws', 3)]} />{step('paws', 3) >= 2 && !robot && <path d='M-8 29L-7 37M6 28L8 35' fill='none' strokeWidth='6' />}</g></g>;
        })}
      </g>
      <g data-layer='face' stroke='var(--creature-eye)' fill='var(--creature-eye)'>
        <g className={sleeping || happy ? '' : 'pet-art-eyes'}>
          {[frog ? 177 : 211, frog ? 335 : 305].map((x, index) => <g key={x}>
            {sleeping ? <path d={`M${x - 12} ${eyesY}q12 9 24 0`} fill='none' strokeWidth='8' /> : happy ? <path d={`M${x - 12} ${eyesY}q12-18 24 0`} fill='none' strokeWidth='8' /> : face === 'starry' ? <path d={`M${x} ${eyesY - 17}l5 11 12 6-12 5-5 12-5-12-12-5 12-6Z`} strokeWidth='3' /> : face === 'mischievous' && index === 1 ? <path d={`M${x - 12} ${eyesY}h24`} fill='none' strokeWidth='8' /> : <><ellipse cx={x} cy={eyesY} rx='10' ry='15' stroke='none' /><circle cx={x - 3} cy={eyesY - 6} r='3.5' fill='#FFF4DD' stroke='none' /></>}
          </g>)}
        </g>
        {duck ? <path data-layer='beak' d='M232 281Q262 272 290 284Q290 304 261 306Q233 306 232 281Z' fill='#FFBD77' stroke='#5B3D45' strokeWidth='8' /> : species === 'dog' || species === 'fox' || dragon ? <><ellipse data-layer='muzzle' cx='260' cy='290' rx='33' ry='23' fill='#FFF4DD' stroke='none' /><ellipse cx='260' cy='282' rx={dragon ? 10 : 13} ry='8' stroke='none' /><path d='M260 292q-12 17-23 3M260 292q12 17 23 3' fill='none' strokeWidth='6' /></> : <path d={frog ? 'M198 287Q258 326 318 287' : happy ? 'M244 291Q259 318 276 291Z' : 'M245 293Q259 306 274 293'} fill={happy && !frog ? 'var(--creature-eye)' : 'none'} strokeWidth='7' />}
      </g>
      <g data-layer='cheeks' fill='#F6A4B6' stroke='none' opacity='.8'><ellipse cx={frog ? 164 : 187} cy={frog ? 293 : 291} rx='18' ry='9' /><ellipse cx={frog ? 354 : 330} cy={frog ? 293 : 291} rx='18' ry='9' /></g>
      <path data-layer='highlight' d={frog ? 'M138 257Q141 242 151 244' : 'M170 224Q176 191 198 184'} fill='none' stroke='#FFF4DD' strokeWidth='12' opacity='.8' />
      <PetAccessories species={species} stage={lifeStage} appearance={appearance} layer='head' />
    </g>
    </g>
    </g>
  </svg>;
}

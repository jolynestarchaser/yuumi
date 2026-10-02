import type { CompanionAppearance, CompanionGrowthStage, CompanionSpecies } from '../../../../shared/contracts.js';

/** Cosmetic layers do not replace earned anatomy; age accents never grant parts. */
export default function PetAccessories({ species, stage, appearance, layer }: {
  species: CompanionSpecies; stage: CompanionGrowthStage; appearance?: CompanionAppearance; layer: 'body' | 'head';
}) {
  const robot = species === 'robot';
  const elder = stage === 'elder';
  if (layer === 'body') return <g data-layer='wardrobeBody' fill='var(--creature-accent)' strokeWidth='7'>
    {appearance?.outfit === 'tshirt' && <><path d={robot ? 'M177 338H336V416H177Z' : 'M187 323L166 343L181 365L196 352V420Q256 440 320 420V352L335 365L350 343L328 323Q258 348 187 323Z'} /><path d='M239 369h36M257 352v35' fill='none' stroke='#FFF4DD' /></>}
    {appearance?.outfit === 'vest' && <><path d='M193 325L238 340L251 425H190Z M323 325L278 340L265 425H327Z' /><circle cx='279' cy='376' r='5' fill='#FFF4DD' stroke='none' /></>}
    {robot && <><rect x='235' y='352' width='44' height='34' rx='6' fill='#FFF4DD' /><path d={stage === 'hatchling' ? 'M252 369h9' : stage === 'child' ? 'M245 369h24' : 'M246 364h22M246 375h22'} fill='none' /><circle cx='302' cy='374' r='6' fill={elder ? '#E9BD68' : '#A8D9BE'} /></>}
  </g>;
  return <g data-layer='wardrobeHead' fill='var(--creature-accent)' strokeWidth='7'>
    {!robot && species === 'child' && appearance?.hair === 'swept' && <path d='M150 222Q140 155 243 149Q302 126 363 194Q296 182 229 224L238 181Q194 212 150 222Z' />}
    {!robot && appearance?.hair === 'tuft' && <path d='M236 160Q221 119 245 130L260 149Q264 117 279 127L278 160Z' />}
    {appearance?.headwear === 'cap' && <><path d='M198 159Q205 112 258 117Q304 114 318 159Z' /><path d='M197 160H337Q344 176 316 180H198Z' /></>}
    {appearance?.headwear === 'bow' && <><path d='M271 158L245 136Q232 141 240 164L269 174L300 166Q315 142 303 138Z' /><circle cx='272' cy='161' r='10' fill='#FFF4DD' /></>}
    {elder && <g data-layer='ageSignature' fill='#FFF4DD' stroke='none'>
      {robot ? <><path d='M177 179h35v8h-35Z' /><circle cx='331' cy='195' r='10' fill='#E9BD68' /></> : species === 'child' ? <path d='M197 164Q180 189 164 218L177 218Q199 195 208 168Z' /> : species === 'frog' ? <><circle cx='217' cy='247' r='5' /><circle cx='235' cy='241' r='4' /><circle cx='281' cy='241' r='4' /><circle cx='299' cy='247' r='5' /></> : species === 'spirit' ? <path d='M250 182L266 202L285 188' fill='none' stroke='#E9BD68' strokeWidth='5' /> : <><path d='M156 295l26 6-19 8 20 8-27 2Z' /><path d='M361 295l-26 6 19 8-20 8 27 2Z' /></>}
    </g>}
  </g>;
}

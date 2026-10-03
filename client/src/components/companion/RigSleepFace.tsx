import { useId } from 'react';
import type { CompanionSpecies } from '../../../../shared/contracts.js';

// Local eyelids keep the painted head, ears, and neck connection intact.
// These overlays share the head's pivot; they never replace its silhouette.
const eyes: Record<CompanionSpecies, readonly [number, number, number, number, string, string][]> = {
  fox: [[130,209,12,17,'#eb9b50','#f5b975'],[202,220,12,17,'#ed9c51','#f8bd7c']],
  bunny: [[217,214,17,20,'#fff1d6','#f9e2bd'],[309,222,17,20,'#fff0d2','#f7deba']],
  robot: [[216,205,13,21,'#f9ebc9','#f4dfb1'],[299,205,13,21,'#f7e7c2','#efdaa9']],
  frog: [[181,198,18,20,'#c7d398','#e0dfa4'],[342,197,18,20,'#ccd99a','#e4e5af']],
  cat: [[131,236,13,19,'#ffeed0','#fae5c1'],[219,235,13,19,'#fff2d8','#f9e4c4']],
  dog: [[160,157,15,20,'#eeb26b','#f6c783'],[241,157,16,20,'#ecb16b','#f5c585']],
  dragon: [[119,216,12,16,'#f7dfb7','#fce7c7'],[186,221,13,16,'#f7dfb7','#fce7c7']],
  duck: [[215,181,17,20,'#fff0cf','#fbe4b9'],[318,164,17,20,'#fff0cf','#fbe4b9']],
  spirit: [[222,200,13,19,'#fff0ce','#f8dfb9'],[308,202,13,19,'#ffefd0','#f7dfb8']],
  child: [[204,213,16,20,'#ffe6bb','#ffedcc'],[296,205,17,21,'#ffe3b6','#ffebc6']],
  custom: [[233,262,15,20,'#fff0d1','#fae4c1'],[321,266,15,20,'#ffefd0','#f8e2bf']],
};

export default function RigSleepFace({ species }: { species: CompanionSpecies }) {
  const id = useId();
  return <g data-rig-expression='sleep'>
    {eyes[species].map(([x,y,rx,ry,top,bottom], index) => <g key={index}>
      <defs><linearGradient id={`${id}-${index}`} x1='0' y1='0' x2='0' y2='1'><stop stopColor={top}/><stop offset='1' stopColor={bottom}/></linearGradient></defs>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={`url(#${id}-${index})`}/>
      <path d={`M${x-rx+3} ${y} Q${x} ${y+8} ${x+rx-3} ${y}`} fill='none' stroke='#503525' strokeWidth='3.5' strokeLinecap='round'/>
    </g>)}
  </g>;
}

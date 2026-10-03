import { useEffect, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import CompanionRigParts from '../src/components/companion/CompanionRigParts.js';
import { validateRig, rigArchetypes, type AnimationState, type CompanionRig } from '../src/components/companion/companionRig.js';
import { illustratedFrames } from '../src/components/companion/illustratedFrames.js';
import type { CompanionSpecies } from '../../shared/contracts.js';
import '../src/components/companion/pet-art.css';
import '../src/components/companion/illustrated-pet.css';

const order: CompanionSpecies[] = ['fox','bunny','robot','frog','cat','dog','dragon','duck','spirit','child','custom'];
type Mode = 'original' | 'rig' | 'overlay' | 'difference';
function Card({ species, state, animated }: { species: CompanionSpecies; state: AnimationState; animated: boolean }) {
  const [rig, setRig] = useState<CompanionRig>();
  const [mode, setMode] = useState<Mode>('overlay');
  const [failure, setFailure] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    fetch(`/assets/companions/rig-v2/${species}/base/rig.json`, { signal: abort.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(candidate => { validateRig(candidate); setRig(candidate); })
      .catch(error => { if (error.name !== 'AbortError') setFailure('No layered candidate'); });
    return () => abort.abort();
  }, [species]);
  const [, , width, height] = illustratedFrames[species][0];
  const scale = Math.min(432 / width, 392 / height);
  const w = Math.round(width * scale), h = Math.round(height * scale);
  const differenceId = `difference-${species}`;
  return <article><h2>{species} <small>{rig ? 'candidate / not approved' : 'original fallback'}</small></h2>
    <label>View <select value={mode} onChange={event => setMode(event.target.value as Mode)}><option value='original'>Original</option><option value='rig'>Composite</option><option value='overlay'>50% Overlay</option><option value='difference'>Difference</option></select></label>
    <div className={`review-stage ${mode}`}><div className='art-layers'>
      {(mode === 'original' || mode === 'overlay') && <svg viewBox='0 0 512 512' role='img' aria-label={`${species} original`}><image href={`/assets/companions/moodboard-v1/${species}.png`} x={Math.round((512-w)/2)} y={448-h} width={w} height={h} /></svg>}
      {mode !== 'original' && rig && <svg className='companion-soft-pet companion-illustrated-pet' viewBox='0 0 512 512' role='img' aria-label={`${species} layered candidate`}
        data-species={species} data-rig-archetype={rigArchetypes[species]} data-animation-state={state} data-animated={animated}
        style={{ '--pet-walk-cycle': species === 'robot' ? '.9s' : '.65s' } as CSSProperties}>
        <defs><filter id={differenceId} x='0' y='0' width='512' height='512' filterUnits='userSpaceOnUse' colorInterpolationFilters='sRGB'>
          <feImage href={`/assets/companions/moodboard-v1/${species}.png`} x={Math.round((512-w)/2)} y={448-h} width={w} height={h} preserveAspectRatio='none' result='original' />
          <feFlood floodColor='black' result='black' />
          <feComposite in='original' in2='black' operator='over' result='originalOpaque' />
          <feComposite in='SourceGraphic' in2='black' operator='over' result='compositeOpaque' />
          <feBlend in='originalOpaque' in2='compositeOpaque' mode='difference' />
        </filter></defs>
        <g filter={mode === 'difference' ? `url(#${differenceId})` : undefined}><g className='pet-art-root'><CompanionRigParts rig={rig} state={state} onImageError={() => setFailure('Missing layer: candidate cannot be approved')} /></g></g>
      </svg>}
      </div>
      <svg className='anchor' viewBox='0 0 512 512' aria-hidden='true'><path d='M24 448H488M256 438V458' stroke='#524766' strokeWidth='1' strokeDasharray='5 5' /></svg>
    </div><p>{failure || 'True part assembly. Ground (256,448). Same stage and scale as Original.'}</p>
    {rig && <details><summary>{rig.parts.length} separate layers / pivots</summary><ul>{rig.parts.map(part => <li key={part.id}>{part.id}: pivot {part.pivot.join(', ')} · z {part.order}{part.parent ? ` · parent ${part.parent}` : ''}</li>)}</ul></details>}
  </article>;
}
function Review() {
  const [state, setState] = useState<AnimationState>('idle');
  const [animated, setAnimated] = useState(false);
  return <main><h1>Companion layered-rig review</h1><p>Candidate art is assembled from separate layers. Production keeps the original fallback until neutral pose and all four states pass review.</p>
    <div className='controls'><label>State <select value={state} onChange={event => setState(event.target.value as AnimationState)}>{['idle','locomotion','happy','sleep'].map(value => <option key={value}>{value}</option>)}</select></label><label><input type='checkbox' checked={animated} onChange={event => setAnimated(event.target.checked)} /> Animate</label><button onClick={() => { setState('idle'); setAnimated(false); }}>Neutral pose</button></div>
    <section>{order.map(species => <Card key={species} species={species} state={state} animated={animated} />)}</section>
    <style>{`body{margin:0;background:#f4eef8;color:#403348;font:15px/1.45 system-ui}main{padding:24px;max-width:1600px;margin:auto}h1{margin:0 0 8px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px}.controls{position:sticky;top:0;background:#f4eef8;padding:10px 0;z-index:3;display:flex;gap:20px;align-items:center}article{background:white;border:1px solid #ddd;padding:16px}h2{margin:0 0 12px;text-transform:capitalize}small{font:11px system-ui;color:#6e6278;margin-left:8px}select,button{padding:7px;margin:0 8px 8px}.review-stage{position:relative;aspect-ratio:1;background:repeating-conic-gradient(#fff 0% 25%,#eeeaf1 0% 50%) 0/24px 24px}.art-layers{position:absolute;inset:0;isolation:isolate}.review-stage svg{position:absolute;inset:0;width:100%;height:100%;overflow:hidden}.review-stage .pet-art-root{filter:none}.overlay .art-layers>svg{opacity:.5;mix-blend-mode:plus-lighter}.difference{background:#000}article p,details{font-size:12px}.anchor{pointer-events:none}@media(max-width:420px){main{padding:12px}section{grid-template-columns:1fr}.controls{gap:4px}}`}</style>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Review />);

// Development-only review surface. No account, API, or progression writes.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import IllustratedPet from '../src/components/companion/IllustratedPet.js';
import CompanionRigParts from '../src/components/companion/CompanionRigParts.js';
import { foxBaseRig } from '../src/components/companion/foxRig.js';
import { SOFT_PET_SPECIES } from '../src/components/companion/SoftPet.js';
import '../src/components/companion/pet-art.css';
import type { CompanionActivity } from '../src/components/companion/types.js';

type FoxReviewMode = 'original' | 'rig' | 'overlay' | 'difference';
function OriginalFox() {
  return <svg className='fox-review-art' viewBox='0 0 512 512' aria-label='Original Fox base'><svg x='49' y='56' width='414' height='392' viewBox='154 26 352 333'><image href='/assets/companions/illustrated-v1/fox.png' width='1024' height='1536' /></svg></svg>;
}
function RigFox({ difference = false }: { difference?: boolean }) {
  return <svg className={`fox-review-art ${difference ? 'fox-difference' : ''}`} viewBox='0 0 512 512' aria-label='Fox rig composite'><CompanionRigParts rig={foxBaseRig} state='idle' onImageError={() => undefined} /></svg>;
}
function FoxReview() {
  const [mode, setMode] = useState<FoxReviewMode>('overlay');
  return <article className='fox-review'><h2>Fox neutral review</h2><label>View <select value={mode} onChange={(event) => setMode(event.target.value as FoxReviewMode)}><option value='original'>Original</option><option value='rig'>Rig composite</option><option value='overlay'>Overlay</option><option value='difference'>Difference</option></select></label><div className='fox-review-stage'>
    {mode !== 'rig' && <OriginalFox />}{mode !== 'original' && <RigFox difference={mode === 'difference'} />}
  </div><p>Both images use the same 512px stage, root position, scale, and ground line.</p></article>;
}

function Preview() {
  const [activity, setActivity] = useState<CompanionActivity>('idle');
  const [walking, setWalking] = useState(false);
  const [animated, setAnimated] = useState(true);
  const [paused, setPaused] = useState(false);
  return <main>
    <h1>Companion rig review</h1>
    <p>Fox neutral-fidelity review. The remaining species continue to use their existing atlas fallback. Pause freezes world travel; motion off resets all character animation.</p>
    <label>State <select value={activity} onChange={(event) => setActivity(event.target.value as CompanionActivity)}>{['idle','success','sleeping','error'].map((state) => <option key={state}>{state}</option>)}</select></label>
    <button onClick={() => setWalking(!walking)}>Locomotion {walking ? 'on' : 'off'}</button>
    <button onClick={() => setPaused(!paused)}>Travel {paused ? 'paused' : 'running'}</button>
    <button onClick={() => setAnimated(!animated)}>Animation {animated ? 'on' : 'off'}</button>
    <FoxReview /><section>{SOFT_PET_SPECIES.map((species) => <article key={species}><h2>{species}</h2><div className='review-world' style={{ animationPlayState: paused ? 'paused' : 'running', animationName: walking && animated ? 'review-travel' : 'none' }}><IllustratedPet species={species} activity={activity} walking={walking && !paused} appearance={{ animated }} /></div></article>)}</section>
    <style>{`body{margin:16px;font:16px system-ui;background:#f4eef8;color:#403348}button,select{margin:8px;padding:10px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}article{overflow:hidden;background:white;border:1px solid #ddd;padding:12px}h2{font-size:16px}.companion-soft-pet{width:180px;height:180px}.review-world{animation:review-travel 6s linear infinite alternate}.fox-review{max-width:560px}.fox-review-stage{position:relative;max-width:512px;aspect-ratio:1;background:repeating-linear-gradient(0deg,#f6f0fa 0 31px,#eee6f3 32px)}.fox-review-art{position:absolute;inset:0;width:100%;height:100%}.fox-review-art+ .fox-review-art{opacity:.48}.fox-difference{opacity:1!important;mix-blend-mode:difference}.fox-review p{font-size:13px;margin-bottom:0}@keyframes review-travel{to{transform:translateX(20px)}}@media(prefers-reduced-motion:reduce){.review-world{animation:none!important}}`}</style>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Preview />);

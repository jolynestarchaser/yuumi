import React from 'react';
import { createRoot } from 'react-dom/client';
import type { CompanionSpecies } from '../../shared/contracts.js';

const cards: ReadonlyArray<{ species: CompanionSpecies; title: string; note: string; palette: string; motion: string }> = [
  { species: 'cat', title: 'Velvet stargazer', note: 'Quiet, watchful, warm-lit', palette: '#d9c7f2', motion: 'Measured tail sweep' },
  { species: 'dog', title: 'Sunlit scout', note: 'Open-hearted, sturdy, bright', palette: '#f4c98c', motion: 'Easy four-paw trot' },
  { species: 'frog', title: 'Pond guardian', note: 'Mossy, buoyant, curious', palette: '#b8ddb1', motion: 'Squat, launch, soft landing' },
  { species: 'dragon', title: 'Cloud ember', note: 'Small wonder with ancient spark', palette: '#c8b7ea', motion: 'Weighty wingless step' },
  { species: 'duck', title: 'Pocket sailor', note: 'Cheery, practical, water-ready', palette: '#f5db83', motion: 'Compact side-to-side waddle' },
  { species: 'spirit', title: 'Lantern wisp', note: 'Gentle glow, drifting calm', palette: '#b9d9ef', motion: 'Slow suspended float' },
  { species: 'bunny', title: 'Meadow courier', note: 'Quick, soft, alert', palette: '#f3d3df', motion: 'Two-beat hop with ear follow-through' },
  { species: 'fox', title: 'Amber trailfinder', note: 'Bright-eyed, quick, brush-tailed', palette: '#f0b072', motion: 'Four-leg fox trot' },
  { species: 'robot', title: 'Tin-can keeper', note: 'Kindly, dependable, little cosmic', palette: '#a8d7e8', motion: 'Deliberate mechanical step' },
  { species: 'child', title: 'Garden sprite', note: 'Storybook, leafy, tender', palette: '#edc594', motion: 'Light walk with foliage sway' },
  { species: 'custom', title: 'Dream companion', note: 'Softly surreal, user-shaped', palette: '#d5c5ef', motion: 'Pillow-soft bob and follow-through' },
];

function BaseArt({ species }: { species: CompanionSpecies }) {
  return <img src={`/assets/companions/moodboard-v1/${species}.png`} alt={`${species} base art`} />;
}

function Moodboard() {
  return <main>
    <header><p className="eyebrow">YUU & MI / COMPANION WORLD</p><h1>Species mood board</h1><p className="intro">Base-art reference for silhouette, palette, personality, and motion direction. The original painted artwork is shown without replacement or regeneration.</p></header>
    <section>{cards.map((card, index) => <article key={card.species} style={{ '--accent': card.palette, '--delay': `${index * 55}ms` } as React.CSSProperties}>
      <div className="art"><BaseArt species={card.species} /></div><div className="copy"><p className="species">{card.species}</p><h2>{card.title}</h2><p>{card.note}</p><span>{card.motion}</span></div>
    </article>)}</section>
    <footer>Ground anchor: 256 × 448 · Painted base art is authoritative for neutral silhouette review.</footer>
    <style>{`*{box-sizing:border-box}body{margin:0;background:#16131b;color:#fff8f2;font-family:Georgia,serif}main{max-width:1580px;margin:auto;padding:54px clamp(20px,5vw,80px) 42px;background:radial-gradient(circle at 12% 0%,#4a304f 0,transparent 29%),radial-gradient(circle at 92% 25%,#24454b 0,transparent 28%),#16131b}.eyebrow{margin:0;color:#f5c886;font:700 11px/1.2 system-ui;letter-spacing:.18em}h1{font-size:clamp(48px,7vw,100px);letter-spacing:-.06em;margin:8px 0 12px;line-height:.94}.intro{max-width:610px;color:#d4c9d4;font:16px/1.55 system-ui;margin:0 0 44px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(236px,1fr));gap:15px}article{min-height:356px;overflow:hidden;border:1px solid color-mix(in srgb,var(--accent) 62%,#fff 9%);background:linear-gradient(155deg,color-mix(in srgb,var(--accent) 40%,#31273b) 0%,#211b28 64%);box-shadow:0 18px 40px #0004;animation:rise .45s both var(--delay)}.art{height:224px;position:relative;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 90%,#06060a55 0 26%,transparent 27%),linear-gradient(160deg,#ffffff12,transparent)}.art img{display:block;max-width:92%;max-height:92%;object-fit:contain;filter:drop-shadow(0 16px 8px #06040b77)}.copy{padding:10px 17px 18px}.species{margin:0;text-transform:uppercase;font:700 10px/1.2 system-ui;letter-spacing:.16em;color:var(--accent)}h2{font-size:25px;line-height:1;margin:4px 0 7px;letter-spacing:-.035em}.copy>p:not(.species){font:13px/1.35 system-ui;color:#e6dce6;margin:0 0 11px}.copy span{display:inline-block;border-top:1px solid #ffffff32;padding-top:9px;color:#fff2d5;font:600 11px/1.2 system-ui}footer{margin-top:32px;color:#a99ead;font:11px/1.4 system-ui;letter-spacing:.08em;text-transform:uppercase}@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){article{animation:none}}@media(max-width:520px){main{padding-top:34px}section{grid-template-columns:1fr 1fr;gap:8px}article{min-height:292px}.art{height:170px}.copy{padding:9px 10px 13px}h2{font-size:18px}.copy>p:not(.species){font-size:11px}}`}</style>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Moodboard />);

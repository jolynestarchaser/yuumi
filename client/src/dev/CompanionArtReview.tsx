import { useState } from 'react';
import type { CompanionFace, CompanionGrowthStage } from '../../../shared/contracts.js';
import { playCreatureVoice, unlockCreatureVoice } from '../components/companion/voice/audioPlayer.js';
import { petArtPalette, previewPetParts, SOFT_PET_SPECIES } from '../components/companion/SoftPet.js';
import SoftPet from '../components/companion/IllustratedPet.js';
import { speciesArtKits } from '../components/companion/speciesArtKit.js';
import { petBodyForms } from '../components/companion/petBodyForms.js';
import '../components/companion/pet-art.css';
import './companionArtReview.css';

export default function CompanionArtReview() {
  const [stage, setStage] = useState<CompanionGrowthStage>('grown');
  const [level, setLevel] = useState(20);
  const [walking, setWalking] = useState(true);
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [bodyFilter, setBodyFilter] = useState('all');
  const [size, setSize] = useState(128);
  const [precursor, setPrecursor] = useState(false);
  const [precursorStep, setPrecursorStep] = useState(1);
  const [expression, setExpression] = useState<CompanionFace>('gentle');
  const [animated, setAnimated] = useState(true);
  const forms = petBodyForms.filter((form) => (speciesFilter === 'all' || form.species === speciesFilter) && (styleFilter === 'all' || form.style === styleFilter) && (bodyFilter === 'all' || form.body === bodyFilter));
  return <main className={`pet-kit-review ${animated ? '' : 'motion-paused'}`}>
    <header><h1>66 layered companion evolution forms</h1><p>Illustrated 2.5D bodies, independent faces, limbs and saved upgrades for all 11 species. Art review only; controls never change saved pets or server RNG.</p>
      <label>Species <select value={speciesFilter} onChange={(event) => setSpeciesFilter(event.target.value)}><option value='all'>All 11 species</option>{SOFT_PET_SPECIES.map((id) => <option key={id}>{id}</option>)}</select></label>
      <label>Style <select value={styleFilter} onChange={(event) => setStyleFilter(event.target.value)}>{['all', 'nature', 'celestial', 'adventurer'].map((id) => <option key={id}>{id}</option>)}</select></label>
      <label>Body <select value={bodyFilter} onChange={(event) => setBodyFilter(event.target.value)}>{['all', 'compact', 'agile'].map((id) => <option key={id}>{id}</option>)}</select></label>
      <label>Age <select value={stage} onChange={(event) => setStage(event.target.value as CompanionGrowthStage)}>{(['hatchling', 'child', 'juvenile', 'grown', 'elder'] as const).map((id) => <option key={id}>{id}</option>)}</select></label>
      <label>Level <input type='number' min='1' step='1' value={level} onChange={(event) => { const value = Number(event.target.value); if (Number.isSafeInteger(value) && value > 0) setLevel(value); }} /></label>
      <label>Size <select value={size} onChange={(event) => setSize(Number(event.target.value))}>{[64, 128, 256].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><input type='checkbox' checked={walking} onChange={(event) => setWalking(event.target.checked)} /> Walking</label>
      <label><input type='checkbox' checked={animated} onChange={(event) => setAnimated(event.target.checked)} /> Animation enabled</label>
      <label>Expression <select value={expression} onChange={(event) => setExpression(event.target.value as CompanionFace)}>{['gentle','happy','sleepy'].map((face) => <option key={face}>{face}</option>)}</select></label>
      <label><input type='checkbox' checked={precursor} onChange={(event) => setPrecursor(event.target.checked)} /> Precursor on base body</label>
      {precursor && <label>Precursor step <input type='range' min='1' max='9' step='1' value={precursorStep} onChange={(event) => setPrecursorStep(Number(event.target.value))} /> {precursorStep}/10</label>}
      <p>Level 1–10 previews early saved parts. Precursor steps preview exact saved detail IDs, without RNG. Hear greeting animates only that card’s mouth.</p>
      <p>{forms.length} forms shown · age independent of chapter</p>
    </header>
    <div className='pet-kit-review-grid'>{forms.map((form) => <article key={form.id} data-form-id={form.id} style={{ '--review-size': `${size}px`, '--creature-body': petArtPalette[form.species], '--creature-accent': form.style === 'nature' ? '#A8D9BE' : form.style === 'celestial' ? '#C5B6E8' : '#FFBD77', '--creature-eye': '#41334D' }}>
      <h2>{form.species} · {form.style}</h2><p>{form.body}</p>
      <SoftPet species={form.species} level={level} face={expression} voiceTargetId={form.id} render={{ species: form.species, level, parts: previewPetParts(form.species, level),
        ...(precursor ? { precursorProgress: { planId: 'review-only', fromLevel: 10, toLevel: 20, step: precursorStep, totalSteps: 10, detailIds: Array.from({ length: precursorStep }, (_, index) => `${form.id}_detail_${index + 1}`) } } : {
          bodyForm: { id: form.id, style: form.style, body: form.body, chapter: Math.max(1, Math.floor(level / 10) - 1), rendererVersion: form.rendererVersion },
        }),
      }} lifeStage={stage} walking={walking} appearance={{ visualStyle: 'soft', animated, usePortrait: false }} />
      <button type='button' onClick={() => { unlockCreatureVoice(); playCreatureVoice('greeting', { species: form.species, visualStyle: 'soft', animated, usePortrait: false }, true, form.id); }}>Hear greeting · {form.body}</button>
      <small>{speciesArtKits[form.species].gait} · {stage} · Lv{level}</small><code>{form.id}</code>
    </article>)}</div>
  </main>;
}

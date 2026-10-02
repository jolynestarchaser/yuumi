import { useState } from 'react';
import type { CompanionAppearance, CompanionGrowthStage } from '../../../shared/contracts.js';
import SoftPet, { petArtPalette, previewPetParts, SOFT_PET_SPECIES } from '../components/companion/SoftPet.js';
import { speciesArtKits } from '../components/companion/speciesArtKit.js';
import { petBodyForms } from '../components/companion/petBodyForms.js';
import '../components/companion/pet-art.css';
import './companionArtReview.css';

export default function CompanionArtReview() {
  const [stage, setStage] = useState<CompanionGrowthStage>('grown');
  const [level, setLevel] = useState(20);
  const [walking, setWalking] = useState(true);
  const [outfit, setOutfit] = useState<CompanionAppearance['outfit']>('none');
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [size, setSize] = useState(128);
  const [precursor, setPrecursor] = useState(false);
  const forms = petBodyForms.filter((form) => (speciesFilter === 'all' || form.species === speciesFilter) && (styleFilter === 'all' || form.style === styleFilter));
  return <main className={`pet-kit-review ${walking ? '' : 'motion-paused'}`}>
    <header><h1>66 companion evolution forms</h1><p>Art review only. These controls never change saved pets or server RNG.</p>
      <label>Species <select value={speciesFilter} onChange={(event) => setSpeciesFilter(event.target.value)}><option value='all'>All 11 species</option>{SOFT_PET_SPECIES.map((id) => <option key={id}>{id}</option>)}</select></label>
      <label>Style <select value={styleFilter} onChange={(event) => setStyleFilter(event.target.value)}>{['all', 'nature', 'celestial', 'adventurer'].map((id) => <option key={id}>{id}</option>)}</select></label>
      <label>Age <select value={stage} onChange={(event) => setStage(event.target.value as CompanionGrowthStage)}>{(['hatchling', 'child', 'juvenile', 'grown', 'elder'] as const).map((id) => <option key={id}>{id}</option>)}</select></label>
      <label>Level <input type='number' min='1' step='1' value={level} onChange={(event) => { const value = Number(event.target.value); if (Number.isSafeInteger(value) && value > 0) setLevel(value); }} /></label>
      <label>Size <select value={size} onChange={(event) => setSize(Number(event.target.value))}>{[64, 128, 256].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><input type='checkbox' checked={walking} onChange={(event) => setWalking(event.target.checked)} /> Walking / idle animation</label>
      <label><input type='checkbox' checked={precursor} onChange={(event) => setPrecursor(event.target.checked)} /> Precursor on base body</label>
      <label>Outfit <select value={outfit} onChange={(event) => setOutfit(event.target.value as CompanionAppearance['outfit'])}>{(['none', 'tshirt', 'vest'] as const).map((id) => <option key={id}>{id}</option>)}</select></label>
      <p>{forms.length} forms shown · age independent of chapter</p>
    </header>
    <div className='pet-kit-review-grid'>{forms.map((form) => <article key={form.id} data-form-id={form.id} style={{ '--review-size': `${size}px`, '--creature-body': petArtPalette[form.species], '--creature-accent': form.style === 'nature' ? '#A8D9BE' : form.style === 'celestial' ? '#C5B6E8' : '#FFBD77', '--creature-eye': '#41334D' }}>
      <h2>{form.species} · {form.style}</h2><p>{form.body}</p>
      <SoftPet species={form.species} level={level} render={{ species: form.species, level, parts: previewPetParts(form.species, level),
        ...(precursor ? { precursorProgress: { planId: 'review-only', fromLevel: 10, toLevel: 20, step: 1, totalSteps: 10, detailIds: [] } } : {
          bodyForm: { id: form.id, style: form.style, body: form.body, chapter: Math.max(1, Math.floor(level / 10) - 1), rendererVersion: form.rendererVersion },
        }),
      }} lifeStage={stage} walking={walking} appearance={{ visualStyle: 'soft', animated: walking, usePortrait: false, outfit }} />
      <small>{speciesArtKits[form.species].gait} · {stage} · Lv{level}</small><code>{form.id}</code>
    </article>)}</div>
  </main>;
}

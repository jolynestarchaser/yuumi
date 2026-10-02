import { useState } from 'react';
import type { CompanionAppearance, CompanionGrowthStage } from '../../../shared/contracts.js';
import SoftPet, { petArtPalette, previewPetParts, SOFT_PET_SPECIES } from '../components/companion/SoftPet.js';
import { speciesArtKits } from '../components/companion/speciesArtKit.js';
import { robotBodyForms } from '../components/companion/petBodyForms.js';
import '../components/companion/pet-art.css';
import './companionArtReview.css';

export default function CompanionArtReview() {
  const [stage, setStage] = useState<CompanionGrowthStage>('grown');
  const [level, setLevel] = useState(10);
  const [walking, setWalking] = useState(true);
  const [outfit, setOutfit] = useState<CompanionAppearance['outfit']>('none');
  const [formId, setFormId] = useState('base');
  return <main className='pet-kit-review'><header><h1>Companion species · age & evolution kits</h1><p>Development previews only. Changing these controls does not change a saved pet.</p>
    <label>Age stage <select value={stage} onChange={(event) => setStage(event.target.value as CompanionGrowthStage)}>{(['hatchling', 'child', 'juvenile', 'grown', 'elder'] as const).map((id) => <option key={id}>{id}</option>)}</select></label>
    <label>Evolution level <input type='range' min='1' max='10' value={level} onChange={(event) => setLevel(Number(event.target.value))} />{level}</label>
    <label><input type='checkbox' checked={walking} onChange={(event) => setWalking(event.target.checked)} /> Walking</label>
    <label>Cosmetic outfit <select value={outfit} onChange={(event) => setOutfit(event.target.value as CompanionAppearance['outfit'])}>{(['none', 'tshirt', 'vest'] as const).map((id) => <option key={id}>{id}</option>)}</select></label>
    <label>Robot form draft <select value={formId} onChange={(event) => setFormId(event.target.value)}><option value='base'>Base</option>{robotBodyForms.map((form) => <option key={form.id} value={form.id}>{form.style} · {form.body}</option>)}</select></label>
  </header><div className='pet-kit-review-grid'>{SOFT_PET_SPECIES.map((species) => {
    const form = species === 'robot' ? robotBodyForms.find((item) => item.id === formId) : undefined;
    return <article key={species} style={{ '--creature-body': petArtPalette[species], '--creature-accent': species === 'robot' ? '#A8D9BE' : '#C5B6E8', '--creature-eye': '#41334D' }}><h2>{species}</h2><SoftPet species={species} level={level} render={form ? { species, level, parts: previewPetParts(species, level), bodyForm: { id: form.id, style: form.style, body: form.body, chapter: 1, rendererVersion: form.rendererVersion } } : undefined} lifeStage={stage} walking={walking} appearance={{ visualStyle: 'soft', animated: true, usePortrait: false, outfit }} /><small>{speciesArtKits[species].gait} · {stage} · Lv{level}</small><ol>{speciesArtKits[species].growth.map((item) => <li key={item}>{item}</li>)}</ol></article>;
  })}</div></main>;
}

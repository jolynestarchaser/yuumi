import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import type { CompanionAppearance } from '../../../../shared/contracts.js';
import { useCompanionLanguage } from './companionLanguage.js';
import { companionFaces, companionShapes, companionWorlds, creatureBases } from './companionChoiceData.js';
import { companionVoiceProfile } from './companionVoiceProfile.js';
import { colorThemes, voicePresets } from './companionDesign.js';
import CompanionAvatar from './CompanionAvatar.js';
import { creatureVoiceSupported, playCreatureVoice, stopCreatureVoice, unlockCreatureVoice } from './voice/audioPlayer.js';
import { speciesArtKits } from './speciesArtKit.js';

type DesignPanel = 'creature' | 'world' | 'details' | 'colors' | 'voice';
const panels: { id: DesignPanel; label: string }[] = [
  { id: 'creature', label: 'Creature' }, { id: 'world', label: 'Their world' },
  { id: 'details', label: 'Little details' }, { id: 'colors', label: 'Colors' },
  { id: 'voice', label: 'Voice' },
];

export default function CompanionDesignFields({ value, onChange, disabled = false }: {
  value: CompanionAppearance; onChange: (value: CompanionAppearance) => void; disabled?: boolean;
}) {
  const { t } = useCompanionLanguage();
  const [panel, setPanel] = useState<DesignPanel>('creature');
  const voice = companionVoiceProfile(value);
  const supported = creatureVoiceSupported();
  const species = value.species || 'spirit';
  const kit = speciesArtKits[species];
  const illustrationNote = t('Faces and saved growth now use layered artwork. Palette, shape and wardrobe still use the authored design; your saved preferences are preserved.');
  return <fieldset className='companion-design-fields' disabled={disabled}>
    <legend>{t('Make them yours')}</legend>
    <nav className='companion-design-nav' aria-label={t('Design sections')}>
      {panels.map(({ id, label }) => <button key={id} type='button' aria-pressed={panel === id} onClick={() => { stopCreatureVoice(); setPanel(id); }}>{t(label)}</button>)}
    </nav>

    <div className='companion-design-panel' hidden={panel !== 'creature'}>
      <fieldset className='companion-creation-fieldset'><legend>{t('Base creature')}</legend>
        <div className='companion-base-grid'>{creatureBases.map(({ id, label, note }) => <button key={id} type='button' className='companion-base-card' aria-pressed={(value.species || 'spirit') === id} onClick={() => onChange({ ...value, visualStyle: 'soft', species: id })}><span aria-hidden='true'><CompanionAvatar small decorative companion={{ name: label, form: 'creature', mood: 'curious', appearance: { ...value, species: id, animated: false } }} /></span><strong>{t(label)}</strong><small>{t(note)}</small></button>)}</div>
      </fieldset>
      <aside className='companion-species-kit'><strong>{t('Species growth kit')}</strong><ol>{kit.growth.map((part, index) => <li key={part}><span>{t('Level')} {index === 0 ? '2–3' : index === 1 ? '4–6' : '7–10'}</span> {t(part)}</li>)}</ol><small>{t('These are possible visual forms, not promised unlocks. Saved evolution chooses the parts.')}</small></aside>
      {value.species === 'custom' && <label className='companion-design-description'>{t('Describe your creature')}<textarea maxLength={500} value={value.customDescription || ''} placeholder={t('A cloud jellyfish with four tiny paws…')} onChange={(event) => onChange({ ...value, customDescription: event.target.value })} /></label>}
    </div>

    <div className='companion-design-panel' hidden={panel !== 'world'}>
      <fieldset className='companion-creation-fieldset'><legend>{t('Their world')}</legend>
        <div className='companion-world-grid'>{companionWorlds.map(({ id, label, note, Icon }) => <button key={id} type='button' className={`companion-world-card world-${id}`} aria-pressed={(value.world || 'moon-garden') === id} onClick={() => onChange({ ...value, world: id })}><Icon size={22} /><strong>{t(label)}</strong><small>{t(note)}</small></button>)}</div>
      </fieldset>
    </div>

    <div className='companion-design-panel' hidden={panel !== 'details'}>
      <p role='note'>{illustrationNote}</p>
      <fieldset className='companion-creation-fieldset'><legend>{t('Expression')}</legend><div className='companion-chip-grid'>{companionFaces.filter(({ id }) => ['gentle', 'happy', 'sleepy'].includes(id)).map(({ id, label }) => <button key={id} type='button' aria-pressed={(value.face || 'gentle') === id} onClick={() => onChange({ ...value, face: id })}>{t(label)}</button>)}</div></fieldset>
      <fieldset disabled className='companion-creation-fieldset'><legend>{t('Illustrated customization — coming later')}</legend>
      <fieldset className='companion-creation-fieldset'><legend>{t(species === 'robot' ? 'Chassis cover' : 'Outfit')}</legend><div className='companion-chip-grid'>{([['none', 'None'], ['tshirt', species === 'robot' ? 'Panel cover' : 'T-shirt'], ['vest', 'Vest']] as const).map(([id, label]) => <button key={id} type='button' aria-pressed={(value.outfit || 'none') === id} onClick={() => onChange({ ...value, outfit: id })}>{t(label)}</button>)}</div></fieldset>
      <fieldset className='companion-creation-fieldset'><legend>{t('Headwear')}</legend><div className='companion-chip-grid'>{([['none', 'None'], ['cap', 'Cap'], ['bow', 'Bow']] as const).map(([id, label]) => <button key={id} type='button' aria-pressed={(value.headwear || 'none') === id} onClick={() => onChange({ ...value, headwear: id })}>{t(label)}</button>)}</div></fieldset>
      {species !== 'robot' && <fieldset className='companion-creation-fieldset'><legend>{t(species === 'child' ? 'Hair' : 'Head tuft')}</legend><div className='companion-chip-grid'>{(species === 'child' ? [['natural', 'Natural'], ['swept', 'Swept'], ['tuft', 'Tuft']] as const : [['natural', 'Natural'], ['tuft', 'Tuft']] as const).map(([id, label]) => <button key={id} type='button' aria-pressed={(value.hair || 'natural') === id} onClick={() => onChange({ ...value, hair: id })}>{t(label)}</button>)}</div></fieldset>}
      <fieldset className='companion-creation-fieldset'><legend>{t('Body shape')}</legend><div className='companion-chip-grid'>{companionShapes.map(({ id, label }) => <button key={id} type='button' aria-pressed={(value.silhouette || 'round') === id} onClick={() => onChange({ ...value, silhouette: id })}>{t(label)}</button>)}</div></fieldset>
      </fieldset>
      <label className='companion-design-gender'>{t('Gender')}<select value={value.gender || 'unspecified'} onChange={(event) => onChange({ ...value, gender: event.target.value as CompanionAppearance['gender'] })}>{([['unspecified', 'Unspecified'], ['female', 'Female'], ['male', 'Male'], ['nonbinary', 'Nonbinary']] as const).map(([id, label]) => <option key={id} value={id}>{t(label)}</option>)}</select></label>
      <small>{t('Personality and evolution grow through care, not these appearance choices.')}</small>
      <small>{t('Age changes proportions and elder details. Clothes never change age, XP or earned anatomy.')}</small>
    </div>

    <div className='companion-design-panel' hidden={panel !== 'colors'}>
      <p role='note'>{illustrationNote}</p>
      <fieldset disabled className='companion-creation-fieldset'><legend>{t('Illustrated customization — coming later')}</legend>
      <fieldset className='companion-creation-fieldset'><legend>{t('Color palette')}</legend><div className='companion-palette-grid'>{colorThemes.map(({ id, label, bodyColor, accentColor, eyeColor }) => <button key={id} type='button' className='companion-palette-card' aria-pressed={(value.theme || 'lavender') === id} onClick={() => onChange({ ...value, theme: id, bodyColor, accentColor, eyeColor })}><span aria-hidden='true'><i style={{ background: bodyColor }} /><i style={{ background: accentColor }} /><i style={{ background: eyeColor }} /></span><strong>{t(label)}</strong></button>)}</div></fieldset>
      <div className='companion-creation-colors'>{([['bodyColor', 'Body color', '#d4c2f0'], ['accentColor', 'Accent color', '#c4dbbf'], ['eyeColor', 'Eye color', '#423452']] as const).map(([key, label, fallback]) => <label key={key}>{t(label)}<input type='color' value={value[key] || fallback} onChange={(event) => onChange({ ...value, theme: 'custom', [key]: event.target.value })} /></label>)}</div>
      </fieldset>
    </div>

    <div className='companion-design-panel' hidden={panel !== 'voice'}>
      <fieldset className='companion-creation-fieldset' disabled={!supported}><legend>{t('Creature voice')}</legend>
        <div className='companion-voice-grid'>{voicePresets.map((preset) => <button key={preset.id} type='button' className='companion-choice-card' aria-pressed={(voice.preset || 'natural') === preset.id} onClick={() => onChange({ ...value, voice: { ...voice, preset: preset.id, rate: preset.rate, pitch: preset.pitch } })}><span className='companion-choice-glyph'><Volume2 size={18} /></span><strong>{t(preset.label)}</strong></button>)}</div>
        <label className='companion-voice-enable'><input type='checkbox' checked={voice.enabled} onChange={(event) => { if (!event.target.checked) stopCreatureVoice(); onChange({ ...value, voice: { ...voice, enabled: event.target.checked } }); }} />{t('Let them chirp')}</label>
        <label className='companion-voice-volume'>{t('Volume')} · {Math.round((voice.volume ?? .8) * 100)}%<input type='range' min='0' max='1' step='.05' value={voice.volume ?? .8} onChange={(event) => onChange({ ...value, voice: { ...voice, volume: Number(event.target.value) } })} /></label>
        <button type='button' className='companion-voice-preview' onClick={() => { unlockCreatureVoice(); playCreatureVoice('greeting', { ...value, voice }, true); }}><Volume2 size={17} />{t('Hear their greeting')}</button>
      </fieldset>
      {!supported && <small>{t('This browser does not support voice. Your companion will still work without sound.')}</small>}
    </div>
    {value.species === 'custom' && !value.customDescription?.trim() && panel !== 'creature' && <small role='status'>{t('Add your custom race description in Look before continuing.')}</small>}
  </fieldset>;
}

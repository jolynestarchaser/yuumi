import { useState } from 'react';
import type { CompanionAppearance, CompanionSpecies } from '../../../../shared/contracts.js';
import { useCompanionLanguage } from './companionLanguage.js';
import { companionVoiceProfile } from './companionVoiceProfile.js';
import { colorThemes, voicePresets } from './companionDesign.js';
import { creatureVoiceSupported, playCreatureVoice, stopCreatureVoice, unlockCreatureVoice } from './voice/audioPlayer.js';

const species: [CompanionSpecies, string][] = [['spirit', 'Forest spirit'], ['bunny', 'Bunny'], ['cat', 'Cat'], ['fox', 'Fox'], ['dragon', 'Dragon'], ['robot', 'Robot'], ['child', 'Storybook child'], ['custom', 'Custom creature']];

export default function CompanionDesignFields({ value, onChange, disabled = false }: {
  value: CompanionAppearance; onChange: (value: CompanionAppearance) => void; disabled?: boolean;
}) {
  const { t } = useCompanionLanguage();
  const [panel, setPanel] = useState('look');
  const voice = companionVoiceProfile(value);
  const supported = creatureVoiceSupported();
  return <fieldset className='companion-design-fields' disabled={disabled}>
    <legend>{t('Make them yours')}</legend>
    <div className='companion-design-nav' aria-label={t('Design sections')}>{[['look', 'Look'], ['colors', 'Colors'], ['voice', 'Voice']].map(([id, label]) => <button key={id} type='button' aria-pressed={panel === id} onClick={() => { stopCreatureVoice(); setPanel(id); }}>{t(label)}</button>)}</div>
    <div className='companion-design-panel' hidden={panel !== 'look'}>
    <label>{t('Species')}<select value={value.species || 'spirit'} onChange={(event) => onChange({ ...value, species: event.target.value as CompanionSpecies })}>{species.map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</select></label>
    {value.species === 'custom' && <div className='companion-custom-race'><label>{t('Describe your custom race')}<textarea required={panel === 'look'} maxLength={500} value={value.customDescription || ''} placeholder={t('A cloud jellyfish with tiny wings, four paws, and a glowing moon tail…')} onChange={(event) => onChange({ ...value, customDescription: event.target.value })} /></label><small>{t('Your description shapes their personality and their built-in evolving form. The preview shows selected shape, face, and colors.')}</small></div>}
    <div className='companion-design-grid'>
      <label>{t('Body shape')}<select value={value.silhouette || 'round'} onChange={(event) => onChange({ ...value, silhouette: event.target.value as CompanionAppearance['silhouette'] })}>{([['round', 'Round'], ['bean', 'Bean'], ['fluffy', 'Fluffy']] as const).map(([id, label]) => <option key={id} value={id}>{t(label)}</option>)}</select></label>
      <label>{t('Face')}<select value={value.face || 'gentle'} onChange={(event) => onChange({ ...value, face: event.target.value as CompanionAppearance['face'] })}>{([['gentle', 'Gentle smile'], ['happy', 'Happy eyes'], ['sleepy', 'Sleepy eyes'], ['mischievous', 'Mischievous wink'], ['starry', 'Starry eyes']] as const).map(([id, label]) => <option key={id} value={id}>{t(label)}</option>)}</select></label>
      <label>{t('Gender')}<select value={value.gender || 'unspecified'} onChange={(event) => onChange({ ...value, gender: event.target.value as CompanionAppearance['gender'] })}>{([['unspecified', 'Unspecified'], ['female', 'Female'], ['male', 'Male'], ['nonbinary', 'Nonbinary']] as const).map(([id, label]) => <option key={id} value={id}>{t(label)}</option>)}</select></label>
    </div>
    </div>
    <div className='companion-design-panel' hidden={panel !== 'colors'}>
    <fieldset className='companion-theme-picker'><legend>{t('Color theme')}</legend><div>{colorThemes.map(({ id, label, bodyColor, accentColor, eyeColor }) => <button key={id} type='button' aria-pressed={(value.theme || 'lavender') === id} onClick={() => onChange({ ...value, theme: id, bodyColor, accentColor, eyeColor })}><span aria-hidden='true'><i style={{ background: bodyColor }} /><i style={{ background: accentColor }} /><i style={{ background: eyeColor }} /></span>{t(label)}</button>)}</div></fieldset>
    <div className='companion-color-fields'>{([['bodyColor', 'Body color', '#d4c2f0'], ['accentColor', 'Accent color', '#c4dbbf'], ['eyeColor', 'Eye color', '#423452']] as const).map(([key, label, fallback]) => <label key={key}>{t(label)}<input type='color' value={value[key] || fallback} onChange={(event) => onChange({ ...value, theme: 'custom', [key]: event.target.value })} /></label>)}</div>
    <small>{t('Colors and species update the companion immediately, including every future growth form.')}</small>
    </div>
    <div className='companion-design-panel companion-voice-panel' hidden={panel !== 'voice'}>
    <label className='companion-check'><input type='checkbox' checked={voice.enabled} disabled={!supported} onChange={(event) => { if (!event.target.checked) stopCreatureVoice(); onChange({ ...value, voice: { ...voice, enabled: event.target.checked } }); }} />{t('Enable creature voice')}</label>
    {!supported ? <small>{t('This browser does not support voice.')}</small> : <>
      <label>{t('Voice character')}<select value={voice.preset || 'natural'} onChange={(event) => { const preset = voicePresets.find((entry) => entry.id === event.target.value); if (preset) onChange({ ...value, voice: { ...voice, preset: preset.id, rate: preset.rate, pitch: preset.pitch } }); }}>{voicePresets.map((preset) => <option key={preset.id} value={preset.id}>{t(preset.label)}</option>)}<option value='custom' disabled>{t('Custom tuning')}</option></select></label>
      <label>{t('Volume')} · {Math.round((voice.volume ?? .8) * 100)}%<input type='range' min='0' max='1' step='.05' value={voice.volume ?? .8} onChange={(event) => onChange({ ...value, voice: { ...voice, volume: Number(event.target.value) } })} /></label>
      <button type='button' className='companion-secondary' onClick={() => { unlockCreatureVoice(); playCreatureVoice('greeting', { ...value, voice }, true); }}>{t('Preview creature voice')}</button>
      <small>{t('A tiny original creature voice, not spoken chat. Text stays readable on screen.')}</small>
    </>}
    </div>
    {value.species === 'custom' && !value.customDescription?.trim() && panel !== 'look' && <small role='status'>{t('Add your custom race description in Look before continuing.')}</small>}
  </fieldset>;
}

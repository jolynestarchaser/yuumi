import { useState } from 'react';
import type { CompanionAppearance, CompanionSpecies } from '../../../../shared/contracts.js';
import { useCompanionLanguage } from './companionLanguage.js';
import { defaultVoice, useCompanionVoice } from './useCompanionVoice.js';
import { colorThemes, voicePresets } from './companionDesign.js';

const species: [CompanionSpecies, string][] = [['spirit', 'Forest spirit'], ['bunny', 'Bunny'], ['cat', 'Cat'], ['fox', 'Fox'], ['dragon', 'Dragon'], ['robot', 'Robot'], ['child', 'Storybook child'], ['custom', 'Custom creature']];

export default function CompanionDesignFields({ value, onChange, disabled = false }: {
  value: CompanionAppearance; onChange: (value: CompanionAppearance) => void; disabled?: boolean;
}) {
  const { t } = useCompanionLanguage();
  const [panel, setPanel] = useState('look');
  const voice = value.voice || defaultVoice;
  const { voices, supported, speak, stop, speaking, voiceError } = useCompanionVoice();
  return <fieldset className='companion-design-fields' disabled={disabled}>
    <legend>{t('Make them yours')}</legend>
    <div className='companion-design-nav' aria-label={t('Design sections')}>{[['look', 'Look'], ['colors', 'Colors'], ['voice', 'Voice']].map(([id, label]) => <button key={id} type='button' aria-pressed={panel === id} onClick={() => { stop(); setPanel(id); }}>{t(label)}</button>)}</div>
    <div className='companion-design-panel' hidden={panel !== 'look'}>
    <label>{t('Species')}<select value={value.species || 'spirit'} onChange={(event) => onChange({ ...value, species: event.target.value as CompanionSpecies })}>{species.map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</select></label>
    {value.species === 'custom' && <div className='companion-custom-race'><label>{t('Describe your custom race')}<textarea required={panel === 'look'} maxLength={500} value={value.customDescription || ''} placeholder={t('A cloud jellyfish with tiny wings, four paws, and a glowing moon tail…')} onChange={(event) => onChange({ ...value, customDescription: event.target.value })} /></label><small>{t('Your description guides their AI portrait and personality. The starter is a preview of selected shape, face, and colors—not a generated custom portrait.')}</small></div>}
    <div className='companion-design-grid'>
      <label>{t('Body shape')}<select value={value.silhouette || 'round'} onChange={(event) => onChange({ ...value, silhouette: event.target.value as CompanionAppearance['silhouette'] })}>{([['round', 'Round'], ['bean', 'Bean'], ['fluffy', 'Fluffy']] as const).map(([id, label]) => <option key={id} value={id}>{t(label)}</option>)}</select></label>
      <label>{t('Face')}<select value={value.face || 'gentle'} onChange={(event) => onChange({ ...value, face: event.target.value as CompanionAppearance['face'] })}>{([['gentle', 'Gentle smile'], ['happy', 'Happy eyes'], ['sleepy', 'Sleepy eyes'], ['mischievous', 'Mischievous wink'], ['starry', 'Starry eyes']] as const).map(([id, label]) => <option key={id} value={id}>{t(label)}</option>)}</select></label>
      <label>{t('Gender')}<select value={value.gender || 'unspecified'} onChange={(event) => onChange({ ...value, gender: event.target.value as CompanionAppearance['gender'] })}>{([['unspecified', 'Unspecified'], ['female', 'Female'], ['male', 'Male'], ['nonbinary', 'Nonbinary']] as const).map(([id, label]) => <option key={id} value={id}>{t(label)}</option>)}</select></label>
    </div>
    </div>
    <div className='companion-design-panel' hidden={panel !== 'colors'}>
    <fieldset className='companion-theme-picker'><legend>{t('Color theme')}</legend><div>{colorThemes.map(({ id, label, bodyColor, accentColor, eyeColor }) => <button key={id} type='button' aria-pressed={(value.theme || 'lavender') === id} onClick={() => onChange({ ...value, theme: id, bodyColor, accentColor, eyeColor })}><span aria-hidden='true'><i style={{ background: bodyColor }} /><i style={{ background: accentColor }} /><i style={{ background: eyeColor }} /></span>{t(label)}</button>)}</div></fieldset>
    <div className='companion-color-fields'>{([['bodyColor', 'Body color', '#d4c2f0'], ['accentColor', 'Accent color', '#c4dbbf'], ['eyeColor', 'Eye color', '#423452']] as const).map(([key, label, fallback]) => <label key={key}>{t(label)}<input type='color' value={value[key] || fallback} onChange={(event) => onChange({ ...value, theme: 'custom', [key]: event.target.value })} /></label>)}</div>
    <small>{t('Colors and species update the starter immediately. Generate a new portrait to apply them to AI artwork.')}</small>
    </div>
    <div className='companion-design-panel companion-voice-panel' hidden={panel !== 'voice'}>
    <label className='companion-check'><input type='checkbox' checked={voice.enabled} disabled={!supported} onChange={(event) => onChange({ ...value, voice: { ...voice, enabled: event.target.checked } })} />{t('Enable voice')}</label>
    {!supported ? <small>{t('This browser does not support voice.')}</small> : <>
      <label>{t('Fantasy voice')}<select value={voice.preset || 'natural'} onChange={(event) => { const preset = voicePresets.find((entry) => entry.id === event.target.value); if (preset) onChange({ ...value, voice: { ...voice, preset: preset.id, rate: preset.rate, pitch: preset.pitch } }); }}>{voicePresets.map((preset) => <option key={preset.id} value={preset.id}>{t(preset.label)}</option>)}<option value='custom' disabled>{t('Custom tuning')}</option></select></label>
      <small>{t('Fantasy presets adjust device voice pitch and speed. They are not character voice clones, and results vary by device.')}</small>
      <label>{t('Voice language')}<select value={voice.language} onChange={(event) => onChange({ ...value, voice: { ...voice, language: event.target.value as 'th-TH' | 'en-US', voiceURI: '' } })}><option value='th-TH'>ไทย</option><option value='en-US'>English</option></select></label>
      <label>{t('Voice')}<select value={voices.some((entry) => entry.voiceURI === voice.voiceURI) ? voice.voiceURI : ''} onChange={(event) => onChange({ ...value, voice: { ...voice, voiceURI: event.target.value } })}><option value=''>{t('Device default')}</option>{voices.filter((entry) => entry.lang.startsWith(voice.language.slice(0, 2))).map((entry) => <option key={entry.voiceURI} value={entry.voiceURI}>{entry.name}</option>)}</select></label>
      <label>{t('Speed')} · {voice.rate.toFixed(2)}<input type='range' min='.5' max='1.5' step='.05' value={voice.rate} onChange={(event) => onChange({ ...value, voice: { ...voice, preset: 'custom', rate: Number(event.target.value) } })} /></label>
      <label>{t('Pitch')} · {voice.pitch.toFixed(2)}<input type='range' min='.5' max='2' step='.05' value={voice.pitch} onChange={(event) => onChange({ ...value, voice: { ...voice, preset: 'custom', pitch: Number(event.target.value) } })} /></label>
      <button type='button' className='companion-secondary' onClick={() => speaking ? stop() : speak(voice.language === 'th-TH' ? 'สวัสดี เรามาเดินเล่นด้วยกันนะ' : 'Hello! Shall we go for a little walk?', { ...voice, enabled: true })}>{t(speaking ? 'Stop voice' : 'Preview voice')}</button>
      <small>{t('Available voices depend on your device. Tap a speech bubble to listen.')}</small>
      {voiceError && <small role='alert'>{t('Voice could not play. Try another device voice.')}</small>}
    </>}
    </div>
    {value.species === 'custom' && !value.customDescription?.trim() && panel !== 'look' && <small role='status'>{t('Add your custom race description in Look before continuing.')}</small>}
  </fieldset>;
}

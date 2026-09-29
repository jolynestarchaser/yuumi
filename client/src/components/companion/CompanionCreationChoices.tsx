import { Cloud, Heart, Moon, Sparkles, Sun, Volume2, Wrench } from 'lucide-react';
import type { CompanionAppearance, CompanionFace, CompanionSpecies, CompanionWorld, Temperament } from '../../../../shared/contracts.js';
import { useCompanionLanguage } from './companionLanguage.js';
import { colorThemes, voicePresets } from './companionDesign.js';
import { companionVoiceProfile } from './companionVoiceProfile.js';
import CompanionAvatar from './CompanionAvatar.js';
import { creatureVoiceSupported, playCreatureVoice, stopCreatureVoice, unlockCreatureVoice } from './voice/audioPlayer.js';

const bases: { id: CompanionSpecies; label: string; note: string }[] = [
  { id: 'spirit', label: 'Forest spirit', note: 'Leaf-eared and curious' },
  { id: 'bunny', label: 'Bunny', note: 'A soft little hopper' },
  { id: 'cat', label: 'Cat', note: 'Paws, naps, and mischief' },
  { id: 'fox', label: 'Fox', note: 'Bright-eyed and quick' },
  { id: 'dragon', label: 'Dragon', note: 'Tiny wings, big heart' },
  { id: 'robot', label: 'Robot', note: 'A pocket-sized friend' },
  { id: 'custom', label: 'Make my own', note: 'Describe your little creature' },
];
const worlds: { id: CompanionWorld; label: string; note: string; Icon: typeof Moon }[] = [
  { id: 'moon-garden', label: 'Moon garden', note: 'Night flowers and soft stars', Icon: Moon },
  { id: 'sunny-meadow', label: 'Sunny meadow', note: 'Warm grass and sleepy bees', Icon: Sun },
  { id: 'cloud-cove', label: 'Cloud cove', note: 'A quiet place above the rain', Icon: Cloud },
  { id: 'pocket-workshop', label: 'Pocket workshop', note: 'Little inventions everywhere', Icon: Wrench },
];
const temperaments: { id: Temperament; label: string; note: string }[] = [
  { id: 'curious', label: 'Curious', note: 'Peeks around every corner' },
  { id: 'gentle', label: 'Gentle', note: 'Stays close when you need them' },
  { id: 'playful', label: 'Playful', note: 'Makes a game of small things' },
];
const faces: { id: CompanionFace; label: string }[] = [
  { id: 'gentle', label: 'Soft smile' }, { id: 'happy', label: 'Happy eyes' },
  { id: 'sleepy', label: 'Sleepy blink' }, { id: 'mischievous', label: 'Cheeky wink' },
  { id: 'starry', label: 'Starry eyes' },
];
const shapes = [{ id: 'round', label: 'Round' }, { id: 'bean', label: 'Bean' }, { id: 'fluffy', label: 'Fluffy' }] as const;

export default function CompanionCreationChoices({ step, name, onName, appearance, onAppearance, temperament, onTemperament, detail, onDetail, disabled }: {
  step: number;
  name: string; onName: (name: string) => void;
  appearance: CompanionAppearance; onAppearance: (value: CompanionAppearance) => void;
  temperament: Temperament; onTemperament: (value: Temperament) => void;
  detail: string; onDetail: (value: string) => void;
  disabled: boolean;
}) {
  const { t } = useCompanionLanguage();
  const voice = companionVoiceProfile(appearance);
  return <div className='companion-creation-choice-page'>
    {step === 0 && <>
      <div className='companion-creation-heading'><span>01 / 06</span><h3>{t('Which little one caught your eye?')}</h3><p>{t('Pick a base creature. You can make the details your own next.')}</p></div>
      <fieldset className='companion-creation-fieldset' disabled={disabled}><legend>{t('Base creature')}</legend><div className='companion-base-grid'>{bases.map(({ id, label, note }) => <button type='button' key={id} className='companion-base-card' aria-pressed={(appearance.species || 'spirit') === id} onClick={() => onAppearance({ ...appearance, species: id })}><span aria-hidden='true'><CompanionAvatar small decorative companion={{ name: label, form: 'creature', mood: 'curious', appearance: { ...appearance, species: id, animated: false } }} /></span><strong>{t(label)}</strong><small>{t(note)}</small></button>)}</div></fieldset>
      {appearance.species === 'custom' && <label className='companion-creation-input'>{t('Describe your creature')}<textarea required maxLength={180} value={appearance.customDescription || ''} placeholder={t('A cloud jellyfish with four tiny paws…')} onChange={(event) => onAppearance({ ...appearance, customDescription: event.target.value })} /></label>}
      <label className='companion-creation-input'>{t('What should we call them?')}<input required maxLength={32} value={name} onChange={(event) => onName(event.target.value)} placeholder={t('A name that feels like theirs')} /></label>
    </>}
    {step === 1 && <>
      <div className='companion-creation-heading'><span>02 / 06</span><h3>{t('Where did they come from?')}</h3><p>{t('Their little world stays with them as they grow.')}</p></div>
      <fieldset className='companion-creation-fieldset' disabled={disabled}><legend>{t('Their world')}</legend><div className='companion-world-grid'>{worlds.map(({ id, label, note, Icon }) => <button type='button' key={id} className={`companion-world-card world-${id}`} aria-pressed={(appearance.world || 'moon-garden') === id} onClick={() => onAppearance({ ...appearance, world: id })}><Icon size={22} /><strong>{t(label)}</strong><small>{t(note)}</small></button>)}</div></fieldset>
    </>}
    {step === 2 && <>
      <div className='companion-creation-heading'><span>03 / 06</span><h3>{t('How do they greet the world?')}</h3><p>{t('This is where their story starts. Care and time will shape the rest.')}</p></div>
      <fieldset className='companion-creation-fieldset' disabled={disabled}><legend>{t('Starting personality')}</legend><div className='companion-personality-grid'>{temperaments.map(({ id, label, note }) => <button type='button' key={id} className='companion-choice-card' aria-pressed={temperament === id} onClick={() => onTemperament(id)}><span className='companion-choice-glyph'>{id === 'gentle' ? <Heart size={21} /> : <Sparkles size={21} />}</span><strong>{t(label)}</strong><small>{t(note)}</small></button>)}</div></fieldset>
    </>}
    {step === 3 && <>
      <div className='companion-creation-heading'><span>04 / 06</span><h3>{t('What would you notice first?')}</h3><p>{t('A face, a shape, one small thing only yours.')}</p></div>
      <fieldset className='companion-creation-fieldset' disabled={disabled}><legend>{t('Expression')}</legend><div className='companion-chip-grid'>{faces.map(({ id, label }) => <button type='button' key={id} aria-pressed={(appearance.face || 'gentle') === id} onClick={() => onAppearance({ ...appearance, face: id })}>{t(label)}</button>)}</div></fieldset>
      <fieldset className='companion-creation-fieldset' disabled={disabled}><legend>{t('Body shape')}</legend><div className='companion-chip-grid'>{shapes.map(({ id, label }) => <button type='button' key={id} aria-pressed={(appearance.silhouette || 'round') === id} onClick={() => onAppearance({ ...appearance, silhouette: id })}>{t(label)}</button>)}</div></fieldset>
      <label className='companion-creation-input'>{t('One little detail (optional)')}<textarea maxLength={180} value={detail} onChange={(event) => onDetail(event.target.value)} placeholder={t('Collects smooth stones. Has a moon-shaped tail…')} /></label>
    </>}
    {step === 4 && <>
      <div className='companion-creation-heading'><span>05 / 06</span><h3>{t('Pick their colors')}</h3><p>{t('Choose a palette, then change any color you like.')}</p></div>
      <fieldset className='companion-creation-fieldset' disabled={disabled}><legend>{t('Color palette')}</legend><div className='companion-palette-grid'>{colorThemes.map(({ id, label, bodyColor, accentColor, eyeColor }) => <button type='button' key={id} className='companion-palette-card' aria-pressed={(appearance.theme || 'lavender') === id} onClick={() => onAppearance({ ...appearance, theme: id, bodyColor, accentColor, eyeColor })}><span aria-hidden='true'><i style={{ background: bodyColor }} /><i style={{ background: accentColor }} /><i style={{ background: eyeColor }} /></span><strong>{t(label)}</strong></button>)}</div></fieldset>
      <div className='companion-creation-colors'>{([['bodyColor', 'Body color', '#d4c2f0'], ['accentColor', 'Accent color', '#c4dbbf'], ['eyeColor', 'Eye color', '#423452']] as const).map(([key, label, fallback]) => <label key={key}>{t(label)}<input type='color' value={appearance[key] || fallback} disabled={disabled} onChange={(event) => onAppearance({ ...appearance, theme: 'custom', [key]: event.target.value })} /></label>)}</div>
    </>}
    {step === 5 && <>
      <div className='companion-creation-heading'><span>06 / 06</span><h3>{t('How do they sound?')}</h3><p>{t('Little chirps for little feelings. They will not read your chat aloud.')}</p></div>
      <fieldset className='companion-creation-fieldset' disabled={disabled || !creatureVoiceSupported()}><legend>{t('Creature voice')}</legend><div className='companion-voice-grid'>{voicePresets.map((preset) => <button type='button' key={preset.id} className='companion-choice-card' aria-pressed={(voice.preset || 'natural') === preset.id} onClick={() => onAppearance({ ...appearance, voice: { ...voice, preset: preset.id, rate: preset.rate, pitch: preset.pitch } })}><span className='companion-choice-glyph'><Volume2 size={18} /></span><strong>{t(preset.label)}</strong></button>)}</div><label className='companion-voice-enable'><input type='checkbox' checked={voice.enabled} onChange={(event) => { if (!event.target.checked) stopCreatureVoice(); onAppearance({ ...appearance, voice: { ...voice, enabled: event.target.checked } }); }} />{t('Let them chirp')}</label><label className='companion-voice-volume'>{t('Volume')} · {Math.round((voice.volume ?? .8) * 100)}%<input type='range' min='0' max='1' step='.05' value={voice.volume ?? .8} onChange={(event) => onAppearance({ ...appearance, voice: { ...voice, volume: Number(event.target.value) } })} /></label><button type='button' className='companion-voice-preview' onClick={() => { unlockCreatureVoice(); playCreatureVoice('greeting', { ...appearance, voice }, true); }}><Volume2 size={17} />{t('Hear their greeting')}</button></fieldset>
      {!creatureVoiceSupported() && <p className='companion-creation-muted'>{t('This browser does not support voice. Your companion will still work without sound.')}</p>}
    </>}
  </div>;
}

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { Apple, BookHeart, Heart, Leaf, MessageCircle, Moon, PawPrint, RefreshCw, Send, Settings2, Sparkles, Star, Volume2 } from 'lucide-react';
import GlassDialog from '../GlassDialog.js';
import { useAuthStore } from '../../store/authStore.js';
import useCompanion from '../../hooks/useCompanion.js';
import CompanionAvatar from './CompanionAvatar.js';
import CompanionJournal from './CompanionJournal.js';
import CompanionAppearancePicker, { defaultAppearance } from './CompanionAppearancePicker.js';
import { CompanionLanguageProvider, useCompanionLanguage } from './companionLanguage.js';
import CompanionText from './CompanionText.js';
import CompanionDesignFields from './CompanionDesignFields.js';
import CompanionCustomizer from './CompanionCustomizer.js';
import CompanionGrowth from './CompanionGrowth.js';
import CompanionEgg from './CompanionEgg.js';
import { useCompanionVoice } from './useCompanionVoice.js';
import './companion.css';
import type { CompanionPanelProps } from './types.js';
import type { CareAction, CompanionForm, Temperament } from '../../../../shared/contracts.js';
import type { LucideIcon } from 'lucide-react';

const careActions: [CareAction, LucideIcon, string][] = [['feed', Apple, 'Snack'], ['play', Star, 'Play'], ['cuddle', Heart, 'Cuddle'], ['rest', Moon, 'Nap'], ['explore', Leaf, 'Explore']];
const pages: [string, LucideIcon, string][] = [['chat', MessageCircle, 'Chat'], ['memories', BookHeart, 'Memories'], ['design', Settings2, 'Appearance'], ['personality', Sparkles, 'Personality']];
const seeds = { pet: 'A tiny moon creature with soft ears and a star on its forehead.', child: 'A cheerful fictional storybook child with star pajamas and a love of little adventures.', creature: 'A round little forest spirit with leaf ears, soft lavender fur, and a curious smile.' };

function HatchCompanion({ busy, act, onCreate }: Pick<CompanionPanelProps, 'busy' | 'act'> & { onCreate?: (setup: { name: string; form: CompanionForm; seed: string; temperament: Temperament; appearance: import('../../../../shared/contracts.js').CompanionAppearance }) => Promise<boolean> }) {
  const { t } = useCompanionLanguage();
  const [name, setName] = useState('Mochi');
  const [form, setForm] = useState<CompanionForm>('creature');
  const [seed, setSeed] = useState(t(seeds.creature));
  const [temperament, setTemperament] = useState<Temperament>('curious');
  const [step, setStep] = useState(0);
  const [appearance, setAppearance] = useState(defaultAppearance);
  const [hatching, setHatching] = useState(false);
  const hatchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hatchStarted = useRef(false);
  const mounted = useRef(true);
  const reduceMotion = useReducedMotion();
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (hatchTimer.current) clearTimeout(hatchTimer.current); }; }, []);
  function hatch() {
    if (busy || hatchStarted.current) return;
    hatchStarted.current = true;
    setHatching(true);
    hatchTimer.current = setTimeout(async () => {
      const setup = { name, form, seed: appearance.species === 'custom' ? appearance.customDescription || '' : seed, temperament, appearance };
      const saved = onCreate ? await onCreate(setup) : await act('adopt', setup);
      if (!saved && mounted.current) { hatchStarted.current = false; setHatching(false); }
    }, reduceMotion || !appearance.animated ? 0 : 1800);
  }
  if (hatching) return <CompanionEgg name={name} appearance={appearance} />;
  return <form className='companion-hatch' onSubmit={(event) => { event.preventDefault(); if (step < 2) setStep(step + 1); else hatch(); }}>
    <ol className='companion-creation-steps' aria-label={t('Character creation')}>{['Imagine', 'Personality', 'Welcome'].map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined}><b>{index + 1}</b>{t(label)}</li>)}</ol>
    <div className='companion-creation-layout'>
    <aside className='companion-creation-preview'>
    <CompanionAvatar companion={{ name, form, mood: 'curious', appearance }} />
    <CompanionAppearancePicker value={appearance} onChange={setAppearance} disabled={Boolean(busy)} />
    <span className='companion-kicker'>{t('A LITTLE LIFE, RAISED BY TWO')}</span>
    <h3>{step === 0 ? t('Imagine someone that’s ours.') : step === 1 ? t('A spark of personality.') : t('Hello, {name}.', { name })}</h3>
    <p className='companion-pixel-label'>{t('Soft or 256 × 256 pixel art · Switch anytime')}</p>
    </aside>
    <section className='companion-creation-editor'>
    {step === 0 && <>
    <p>{t('Build your own creature. Choose its shape, colors, little details, and name. Their animated form will grow from your choices.')}</p>
    <label>{t('Their name')}<input required maxLength={32} value={name} onChange={(event) => setName(event.target.value)} /></label>
    <div className='companion-form-picker' aria-label={t('Companion form')}>{([['pet', 'Magical pet'], ['child', 'Storybook child'], ['creature', 'Little creature']] as const).map(([key, label]) => <button type='button' key={key} aria-pressed={form === key} onClick={() => { setForm(key); setSeed(t(seeds[key])); setAppearance((current) => ({ ...current, species: key === 'child' ? 'child' : key === 'pet' ? 'bunny' : 'spirit' })); }}>{t(label)}</button>)}</div>
    <CompanionDesignFields value={appearance} onChange={setAppearance} disabled={Boolean(busy)} />
    </>}
    {step === 1 && <><p>{t('A starting point, not a fixed personality. They will grow through the way Joe and Focus care for and talk to them.')}</p><div className='companion-temperaments'>{([['curious', 'Curious explorer', 'Asks questions, collects odd little treasures.'], ['gentle', 'Gentle daydreamer', 'Loves quiet company and cozy stories.'], ['playful', 'Playful mischief', 'Invents games and sees magic in small things.']] as const).map(([key, label, hint]) => <button key={key} type='button' aria-pressed={temperament === key} onClick={() => setTemperament(key)}><strong>{t(label)}</strong><span>{t(hint)}</span></button>)}</div></>}
    {step === 1 && appearance.species !== 'custom' && <label>{t('Species, colors, and special features')}<textarea required maxLength={500} placeholder={t('A tiny teal dragon with peach wings, star freckles, and a leaf hat…')} value={seed} onChange={(event) => setSeed(event.target.value)} /></label>}
    {step === 2 && <><p>{t('Your shared {form}, starting {temperament}. Both of you will help them become someone a little different.', { form: t(form), temperament: t(temperament) })}</p><div className='companion-character-summary'><b>{t('Our character')}</b><p>{appearance.species === 'custom' ? appearance.customDescription : seed}</p><small>{t('The creature above is their hatchling form. Caring for them changes their built-in soft and pixel-art bodies as they grow.')}</small></div></>}
    </section></div>
    <div className='companion-creation-actions'>{step > 0 && <button className='companion-secondary' type='button' disabled={Boolean(busy)} onClick={() => setStep(step - 1)}>{t('Back')}</button>}<button className='companion-primary' type='submit' disabled={Boolean(busy) || !name.trim() || !seed.trim() || (appearance.species === 'custom' && !appearance.customDescription?.trim())}><Sparkles size={17} />{t(busy ? 'Hatching…' : step < 2 ? 'Continue' : 'Welcome to our world')}</button></div>
    <small>{t('One shared companion · Saved for both of you · You can care for them without AI connected')}</small>
  </form>;
}

function CompanionChat({ companion, capabilities, profile, busy, act }: CompanionPanelProps) {
  const { t } = useCompanionLanguage();
  const { speak, stop, speaking, supported, voiceError } = useCompanionVoice();
  const [draft, setDraft] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [companion.turns.length]);
  return <div className='companion-chat'>
    <div className='companion-section-heading'><MessageCircle size={18} /><div><h3>{t('A little conversation')}</h3><p>{t('Speaking as {name} · Shared with both of you', { name: profile === 'joe' ? 'Joe' : 'Focus' })}</p></div></div>
    <div className='companion-chat-legend'><span className='joe'><i />Joe</span><span className='focus'><i />Focus</span><label><i style={{ backgroundColor: companion.chatColor || '#cdb2ea' }} />{companion.name}<input aria-label={t('{name} chat color', { name: companion.name })} type='color' value={companion.chatColor || '#cdb2ea'} disabled={Boolean(busy)} onChange={(event) => act('chatColor', { color: event.target.value })} /></label></div>
    <div className='companion-conversation' role='log' aria-label={t('Shared companion conversation')} aria-live='polite'>
      {!companion.turns.length && <div className='companion-empty'><Sparkles size={28} /><p>{t('Tell me about your day. I’m collecting our little stories.')}</p></div>}
      {companion.turns.map((turn, index) => <article className={`companion-bubble ${turn.actor}`} style={turn.actor === 'companion' ? { '--companion-chat-color': companion.chatColor || '#cdb2ea' } : undefined} key={`${turn.id}-${index}`}><small>{turn.actor === 'companion' ? companion.name : turn.actor === 'joe' ? t("Joe") : t("Focus")}</small><CompanionText text={turn.text} />{turn.actor === 'companion' && supported && companion.appearance?.voice?.enabled && <button type='button' className='companion-listen' onClick={() => speaking ? stop() : speak(turn.text, companion.appearance.voice)}><Volume2 size={12} />{t(speaking ? 'Stop voice' : 'Listen')}</button>}</article>)}
      {busy === 'chat' && <p className='companion-thinking' role='status'>{t('{name} is finding the words…', { name: companion.name })}</p>}<div ref={end} />
    </div>
    {voiceError && <small role='alert'>{t('Voice could not play. Try another device voice.')}</small>}
    {!capabilities.chat && <p className='companion-offline'>{t('AI chat isn’t connected yet. You can still play, care, and make memories.')}</p>}
    <form className='companion-chat-form' onSubmit={async (event) => { event.preventDefault(); if (await act('chat', { text: draft.trim() })) setDraft(''); }}>
      <textarea aria-label={t('Tell {name} something…', { name: companion.name })} value={draft} maxLength={1000} placeholder={t('Tell {name} something…', { name: companion.name })} onChange={(event) => setDraft(event.target.value)} disabled={Boolean(busy)} />
      <button type='submit' aria-label={t('Send message')} disabled={Boolean(busy) || !capabilities.chat || !draft.trim()}><Send size={18} /></button>
    </form>
    <small className='companion-privacy'>{t('Chats become shared memories. Gemini receives your companion’s context when you send. Manage memories in the journal.')}</small>
  </div>;
}

function CompanionPersonality({ companion, capabilities, profile, busy, act }: CompanionPanelProps) {
  const { t } = useCompanionLanguage();
  const [inspiration, setInspiration] = useState(companion.inspirations[profile] || '');
  return <div className='companion-personality'>
    <div className='companion-section-heading'><Sparkles size={18} /><div><h3>{t('A personality of their own')}</h3><p>{t('Growing through what you do together.')}</p></div></div>
    <div className='companion-traits'>{Object.entries(companion.traits).map(([trait, value]) => <label key={trait}><span>{t(trait)}<b>{value}%</b></span><progress max={100} value={value} /></label>)}</div>
    <p className='companion-trait-note'>{t('Exploring and conversation nurture curiosity. Play brings out mischief. Snacks, cuddles, and rest grow affection.')}</p>
    <form onSubmit={async (event) => { event.preventDefault(); await act('inspiration', { text: inspiration, expectedRevision: companion.revision }); }}>
      <label>{t('A little of {name}', { name: profile === 'joe' ? 'Joe' : 'Focus' })}<textarea maxLength={300} placeholder={t('Things I love, colors, small habits…')} value={inspiration} onChange={(event) => setInspiration(event.target.value)} /></label>
      <button type='submit' className='companion-secondary' disabled={Boolean(busy)}>{t('Save my inspiration')}</button>
    </form>
    <div className='companion-inspirations'>{['joe', 'focus'].map((actor) => <p key={actor}><b>{actor === 'joe' ? t("Joe") : t("Focus")}</b>{companion.inspirations[actor] || t('A blank page, waiting for a little inspiration.')}</p>)}</div>
    <div className='companion-portrait-action'><Sparkles size={21} /><div><h4>{t('Growing into their own shape')}</h4><p>{t('Care, play, hugs, and exploring change their next evolved form. Their body changes at each growth stage.')}</p></div></div>
    <p className='companion-simulation-note'>{t('Simulation note')}</p>
  </div>;
}

export default function CompanionWidget({ onClose, onGoOut }: { onClose: () => void; onGoOut?: () => void }) {
  return <CompanionLanguageProvider><CompanionPanel onClose={onClose} onGoOut={onGoOut} /></CompanionLanguageProvider>;
}

function CompanionPanel({ onClose, onGoOut }: { onClose: () => void; onGoOut?: () => void }) {
  const { t, language } = useCompanionLanguage();
  const profile = useAuthStore((state) => state.profile);
  const { companion, capabilities, roster, companionId, selectCompanion, createCompanion, error, busy, act, refresh } = useCompanion();
  const [tab, setTab] = useState('chat');
  const [creating, setCreating] = useState(false);
  const [reaction, setReaction] = useState<CareAction | ''>('');
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; if (reactionTimer.current) clearTimeout(reactionTimer.current); }; }, []);
  async function care(action: CareAction) {
    if (await act(action) && active.current) {
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
      setReaction(action);
      reactionTimer.current = setTimeout(() => setReaction(''), 2600);
    }
  }
  return <GlassDialog className='companion-dialog' title={<><PawPrint size={19} /> {t('Our little companion')}</>} eyebrow={t('JOE + FOCUS · A WORLD OF OUR OWN')} onClose={onClose}>
    {error && <div className='companion-error' role='alert'><span>{t(error)}</span><button type='button' aria-label={t('Refresh companion')} onClick={() => refresh()}><RefreshCw size={16} /></button></div>}
    {!companion ? <p className='companion-loading' role='status'>{t('Opening their little world…')}</p> : creating ? <HatchCompanion busy={busy} act={act} onCreate={async (setup) => { const created = await createCompanion(setup); if (created) setCreating(false); return created; }} /> : !companion.bornAt ? <HatchCompanion busy={busy} act={act} /> : <div className='companion-layout' lang={language}>
      <section className='companion-home' aria-label={t('Home of {name}', { name: companion.name })}>
        <div className='companion-roster' aria-label={t('Our companions')}>{roster.map((entry) => <button key={entry.id} type='button' aria-pressed={entry.id === companionId} onClick={() => selectCompanion(entry.id)} disabled={Boolean(busy)}><span>{entry.name}</span><small>{t('Level')} {entry.level}</small></button>)}<button type='button' className='companion-add' onClick={() => setCreating(true)} disabled={Boolean(busy)}>{t('Add companion')}</button></div>
        <div className='companion-home-top'><span className='companion-kicker'>{t('OUR LITTLE WORLD')}</span><span className='companion-mood'>{t(companion.mood)}</span></div>
        <CompanionAvatar companion={companion} reaction={reaction} />
        {onGoOut && <button type='button' className='companion-secondary companion-go-out' onClick={onGoOut}>{t('Go out and walk')}</button>}
        <CompanionAppearancePicker value={companion.appearance || defaultAppearance} disabled={Boolean(busy)} onChange={(appearance) => { void act('appearance', { appearance }); }} />
        <h3>{companion.name}</h3><p className='companion-stage'>{t(companion.stage)} · {t('Level')} {companion.level}</p>
        <CompanionGrowth companion={companion} />
        <div className='companion-thought'><span>{t('ON MY MIND')}</span><CompanionText key={companion.thought} text={companion.thought} /></div>
        <div className='companion-needs'>{Object.entries(companion.needs).map(([need, value]) => <label key={need}><span>{t(need)}<b>{value}</b></span><progress value={value} max={100} /></label>)}</div>
        <button type='button' className={`companion-request ${companion.request.urgency}`} disabled={Boolean(busy)} onClick={() => care(companion.request.action)}><span>{t('I need')}</span><strong>{t(companion.request.text)}</strong><small>{t(careActions.find(([action]) => action === companion.request.action)?.[2] || 'Explore')}</small></button>
        <div className='companion-care'>{careActions.map(([action, Icon, label]) => <button type='button' key={action} disabled={Boolean(busy)} onClick={() => care(action)}><Icon size={19} /><span>{t(label)}</span></button>)}</div>
        <div className='companion-bonds'><span><i className='joe' />{t("Joe ·")} {companion.bonds.joe} {t('care moments')}</span><span><i className='focus' />{t("Focus ·")} {companion.bonds.focus} {t('care moments')}</span></div>
        <div className='companion-wish'><Leaf size={16} /><p>{t(companion.wish)}</p></div>
      </section>
      <section className='companion-inner'>
        <div className='companion-tabs' aria-label={t('Our little companion')}>{pages.map(([key, Icon, label]) => <button type='button' key={key} aria-pressed={tab === key} onClick={() => setTab(key)}><Icon size={15} />{t(label)}</button>)}</div>
        {tab === 'chat' && <CompanionChat companion={companion} capabilities={capabilities} profile={profile} busy={busy} act={act} />}
        {tab === 'memories' && <CompanionJournal companion={companion} busy={busy} act={act} />}
        {tab === 'design' && <CompanionCustomizer companion={companion} busy={busy} act={act} />}
        {tab === 'personality' && <CompanionPersonality companion={companion} capabilities={capabilities} profile={profile} busy={busy} act={act} />}
      </section>
    </div>}
  </GlassDialog>;
}

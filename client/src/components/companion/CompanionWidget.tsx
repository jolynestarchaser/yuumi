import { useEffect, useRef, useState } from 'react';
import { Apple, BookHeart, Heart, ImagePlus, Leaf, MessageCircle, Moon, PawPrint, RefreshCw, Send, Settings2, Sparkles, Star } from 'lucide-react';
import GlassDialog from '../GlassDialog.js';
import { useAuthStore } from '../../store/authStore.js';
import useCompanion from '../../hooks/useCompanion.js';
import CompanionAvatar from './CompanionAvatar.js';
import CompanionJournal from './CompanionJournal.js';
import './companion.css';
import type { CompanionPanelProps } from './types.js';
import type { CareAction, CompanionForm, Temperament } from '../../../../shared/contracts.js';
import type { LucideIcon } from 'lucide-react';

const careActions: [CareAction, LucideIcon, string][] = [['feed', Apple, 'Snack'], ['play', Star, 'Play'], ['cuddle', Heart, 'Cuddle'], ['rest', Moon, 'Nap'], ['explore', Leaf, 'Explore']];
const pages: [string, LucideIcon, string][] = [['chat', MessageCircle, 'Chat'], ['memories', BookHeart, 'Memories'], ['personality', Settings2, 'Personality']];
const seeds = { pet: 'A tiny moon creature with soft ears and a star on its forehead.', child: 'A cheerful fictional storybook child with star pajamas and a love of little adventures.', creature: 'A round little forest spirit with leaf ears, soft lavender fur, and a curious smile.' };

function HatchCompanion({ busy, act }: Pick<CompanionPanelProps, 'busy' | 'act'>) {
  const [name, setName] = useState('Mochi');
  const [form, setForm] = useState<CompanionForm>('creature');
  const [seed, setSeed] = useState(seeds.creature);
  const [temperament, setTemperament] = useState<Temperament>('curious');
  const [step, setStep] = useState(0);
  return <form className='companion-hatch' onSubmit={(event) => { event.preventDefault(); if (step < 2) setStep(step + 1); else act('adopt', { name, form, seed, temperament }); }}>
    <ol className='companion-creation-steps' aria-label='Character creation'>{['Imagine', 'Personality', 'Welcome'].map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined}><b>{index + 1}</b>{label}</li>)}</ol>
    <CompanionAvatar companion={{ name, form, mood: 'curious' }} />
    <span className='companion-kicker'>A LITTLE LIFE, RAISED BY TWO</span>
    <h3>{step === 0 ? <>Imagine someone<br />that’s ours.</> : step === 1 ? 'A spark of personality.' : `Hello, ${name}.`}</h3>
    {step === 0 && <>
    <p>Build your own creature. Choose its shape, colors, little details, and name. The portrait will follow your description.</p>
    <label>Their name<input required maxLength={32} value={name} onChange={(event) => setName(event.target.value)} /></label>
    <div className='companion-form-picker' aria-label='Companion form'>{([['pet', 'Magical pet'], ['child', 'Storybook child'], ['creature', 'Little creature']] as const).map(([key, label]) => <button type='button' key={key} aria-pressed={form === key} onClick={() => { setForm(key); setSeed(seeds[key]); }}>{label}</button>)}</div>
    <label>Species, colors, and special features<textarea required maxLength={500} placeholder='A tiny teal dragon with peach wings, star freckles, and a leaf hat…' value={seed} onChange={(event) => setSeed(event.target.value)} /></label>
    <p className='companion-pixel-label'>256 × 256 pixel art · Their first portrait starts with your imagination</p>
    </>}
    {step === 1 && <><p>A starting point, not a fixed personality. They will grow through the way Joe and Focus care for and talk to them.</p><div className='companion-temperaments'>{([['curious', 'Curious explorer', 'Asks questions, collects odd little treasures.'], ['gentle', 'Gentle daydreamer', 'Loves quiet company and cozy stories.'], ['playful', 'Playful mischief', 'Invents games and sees magic in small things.']] as const).map(([key, label, hint]) => <button key={key} type='button' aria-pressed={temperament === key} onClick={() => setTemperament(key)}><strong>{label}</strong><span>{hint}</span></button>)}</div></>}
    {step === 2 && <><p>Your shared {form}, starting {temperament}. Both of you will help them become someone a little different.</p><div className='companion-character-summary'><b>Our character</b><p>{seed}</p><small>The creature above is a starter illustration. Generate your custom pixel-art portrait after hatching.</small></div></>}
    <div className='companion-creation-actions'>{step > 0 && <button className='companion-secondary' type='button' disabled={Boolean(busy)} onClick={() => setStep(step - 1)}>Back</button>}<button className='companion-primary' type='submit' disabled={Boolean(busy) || !name.trim() || !seed.trim()}><Sparkles size={17} />{busy ? 'Hatching…' : step < 2 ? 'Continue' : 'Welcome to our world'}</button></div>
    <small>One shared companion · Saved for both of you · You can care for them without AI connected</small>
  </form>;
}

function CompanionChat({ companion, capabilities, profile, busy, act }: CompanionPanelProps) {
  const [draft, setDraft] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [companion.turns.length]);
  return <div className='companion-chat'>
    <div className='companion-section-heading'><MessageCircle size={18} /><div><h3>A little conversation</h3><p>Speaking as {profile === 'joe' ? 'Joe' : 'Focus'} · Shared with both of you</p></div></div>
    <div className='companion-chat-legend'><span className='joe'><i />Joe</span><span className='focus'><i />Focus</span><label><i style={{ backgroundColor: companion.chatColor || '#cdb2ea' }} />{companion.name}<input aria-label={`${companion.name} chat color`} type='color' value={companion.chatColor || '#cdb2ea'} disabled={Boolean(busy)} onChange={(event) => act('chatColor', { color: event.target.value })} /></label></div>
    <div className='companion-conversation' role='log' aria-label='Shared companion conversation' aria-live='polite'>
      {!companion.turns.length && <div className='companion-empty'><Sparkles size={28} /><p>Tell me about your day.<br />I’m collecting our little stories.</p></div>}
      {companion.turns.map((turn, index) => <article className={`companion-bubble ${turn.actor}`} style={turn.actor === 'companion' ? { '--companion-chat-color': companion.chatColor || '#cdb2ea' } : undefined} key={`${turn.id}-${index}`}><small>{turn.actor === 'companion' ? companion.name : turn.actor === 'joe' ? 'Joe' : 'Focus'}</small><p>{turn.text}</p></article>)}
      {busy === 'chat' && <p className='companion-thinking' role='status'>{companion.name} is finding the words…</p>}<div ref={end} />
    </div>
    {!capabilities.chat && <p className='companion-offline'>AI chat isn’t connected yet. You can still play, care, and make memories.</p>}
    <form className='companion-chat-form' onSubmit={async (event) => { event.preventDefault(); if (await act('chat', { text: draft.trim() })) setDraft(''); }}>
      <textarea aria-label={`Message ${companion.name}`} value={draft} maxLength={1000} placeholder={`Tell ${companion.name} something…`} onChange={(event) => setDraft(event.target.value)} disabled={Boolean(busy)} />
      <button type='submit' aria-label='Send message' disabled={Boolean(busy) || !capabilities.chat || !draft.trim()}><Send size={18} /></button>
    </form>
    <small className='companion-privacy'>Chats become shared memories. Gemini receives your companion’s context when you send. Manage memories in the journal.</small>
  </div>;
}

function CompanionPersonality({ companion, capabilities, profile, busy, act }: CompanionPanelProps) {
  const [inspiration, setInspiration] = useState(companion.inspirations[profile] || '');
  return <div className='companion-personality'>
    <div className='companion-section-heading'><Sparkles size={18} /><div><h3>A personality of their own</h3><p>Growing through what you do together.</p></div></div>
    <div className='companion-traits'>{Object.entries(companion.traits).map(([trait, value]) => <label key={trait}><span>{trait}<b>{value}%</b></span><progress max={100} value={value} /></label>)}</div>
    <p className='companion-trait-note'>Exploring and conversation nurture curiosity. Play brings out mischief. Snacks, cuddles, and rest grow affection.</p>
    <form onSubmit={async (event) => { event.preventDefault(); await act('inspiration', { text: inspiration, expectedRevision: companion.revision }); }}>
      <label>A little of {profile === 'joe' ? 'Joe' : 'Focus'}<textarea maxLength={300} placeholder='Things I love, colors, small habits…' value={inspiration} onChange={(event) => setInspiration(event.target.value)} /></label>
      <button type='submit' className='companion-secondary' disabled={Boolean(busy)}>Save my inspiration</button>
    </form>
    <div className='companion-inspirations'>{['joe', 'focus'].map((actor) => <p key={actor}><b>{actor === 'joe' ? 'Joe' : 'Focus'}</b>{companion.inspirations[actor] || 'A blank page, waiting for a little inspiration.'}</p>)}</div>
    <div className='companion-portrait-action'><ImagePlus size={21} /><div><h4>Picture who they’re becoming</h4><p>A 256 × 256 pixel-art portrait inspired by their character, traits, and both of you.</p></div></div>
    <button className='companion-primary' type='button' disabled={Boolean(busy) || !capabilities.portraits} onClick={() => act('portrait')}><ImagePlus size={16} />{busy === 'portrait' ? 'Imagining a portrait…' : companion.portrait?.url ? 'Generate a new portrait' : 'Generate their portrait'}</button>
    <small>Uses your Gemini image allowance. Up to 5 shared portrait requests per day. {capabilities.portraits ? 'Your current portrait stays until a new one is saved.' : 'Gemini and image storage must be connected first.'}</small>
    <p className='companion-simulation-note'>A fictional companion with simulated moods and preferences. They rest safely while you’re away. Care never requires a subscription or daily streak.</p>
  </div>;
}

export default function CompanionWidget({ onClose }: { onClose: () => void }) {
  const profile = useAuthStore((state) => state.profile);
  const { companion, capabilities, error, busy, act, refresh } = useCompanion();
  const [tab, setTab] = useState('chat');
  return <GlassDialog className='companion-dialog' title={<><PawPrint size={19} /> Our little companion</>} eyebrow='JOE + FOCUS · A WORLD OF OUR OWN' onClose={onClose}>
    {error && <div className='companion-error' role='alert'><span>{error}</span><button type='button' aria-label='Refresh companion' onClick={() => refresh()}><RefreshCw size={16} /></button></div>}
    {!companion ? <p className='companion-loading' role='status'>Opening their little world…</p> : !companion.bornAt ? <HatchCompanion busy={busy} act={act} /> : <div className='companion-layout'>
      <section className='companion-home' aria-label={`${companion.name}'s home`}>
        <div className='companion-home-top'><span className='companion-kicker'>OUR LITTLE WORLD</span><span className='companion-mood'>{companion.mood}</span></div>
        <CompanionAvatar companion={companion} />
        <h3>{companion.name}</h3><p className='companion-stage'>{companion.stage} · Level {companion.level}</p>
        <div className='companion-thought'><span>ON MY MIND</span><p>{companion.thought}</p></div>
        <div className='companion-needs'>{Object.entries(companion.needs).map(([need, value]) => <label key={need}><span>{need}<b>{value}</b></span><progress value={value} max={100} /></label>)}</div>
        <div className='companion-care'>{careActions.map(([action, Icon, label]) => <button type='button' key={action} disabled={Boolean(busy)} onClick={() => act(action)}><Icon size={19} /><span>{label}</span></button>)}</div>
        <div className='companion-bonds'><span><i className='joe' />Joe · {companion.bonds.joe} care moments</span><span><i className='focus' />Focus · {companion.bonds.focus} care moments</span></div>
        <div className='companion-wish'><Leaf size={16} /><p>{companion.wish}</p></div>
      </section>
      <section className='companion-inner'>
        <div className='companion-tabs' aria-label='Companion pages'>{pages.map(([key, Icon, label]) => <button type='button' key={key} aria-pressed={tab === key} onClick={() => setTab(key)}><Icon size={15} />{label}</button>)}</div>
        {tab === 'chat' && <CompanionChat companion={companion} capabilities={capabilities} profile={profile} busy={busy} act={act} />}
        {tab === 'memories' && <CompanionJournal companion={companion} busy={busy} act={act} />}
        {tab === 'personality' && <CompanionPersonality companion={companion} capabilities={capabilities} profile={profile} busy={busy} act={act} />}
      </section>
    </div>}
  </GlassDialog>;
}

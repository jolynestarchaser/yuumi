import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Apple, Droplets, Heart, Home, Leaf, MessageCircle, Moon, Pause, Pill, Play, Star, Volume2 } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import useCompanion from '../../hooks/useCompanion.js';
import CompanionAvatar from './CompanionAvatar.js';
import { CompanionLanguageProvider, useCompanionLanguage } from './companionLanguage.js';
import { companionVoiceProfile } from './companionVoiceProfile.js';
import { creatureVoiceSupported, playCreatureVoice, unlockCreatureVoice } from './voice/audioPlayer.js';
import { roamingDuration, roamingWords } from './companionBehavior.js';
import type { LifecycleCareAction } from '../../../../shared/contracts.js';

const careIcons: Record<LifecycleCareAction, typeof Apple> = {
  feed: Apple,
  play: Star,
  cuddle: Heart,
  rest: Moon,
  explore: Leaf,
  clean: Droplets,
  medicine: Pill,
};

function Roamer({ onOpen, onHome }: { onOpen: () => void; onHome: () => void }) {
  const { companion, error, act, busy } = useCompanion();
  const { t, language } = useCompanionLanguage();
  const [x, setX] = useState(16);
  const [paused, setPaused] = useState(false);
  const [turn, setTurn] = useState(0);
  const [reaction, setReaction] = useState<LifecycleCareAction | ''>('');
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const travelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roamerRef = useRef<HTMLElement>(null);
  const xRef = useRef(16);
  const [travelling, setTravelling] = useState(false);
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [visible, setVisible] = useState(() => !document.hidden);
  const reduced = useReducedMotion();
  const supported = creatureVoiceSupported();
  const moving = Boolean(companion) && visible && !paused && !reduced && !busy && !reaction && companion?.appearance?.animated !== false && companion?.mood !== 'sleepy' && companion?.behaviorState !== 'resting';
  const duration = companion ? roamingDuration(companion) : 8;
  useEffect(() => {
    const updateVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);
  useLayoutEffect(() => {
    if (!moving) {
      if (travelTimer.current) clearTimeout(travelTimer.current);
      // With a fixed left:0 anchor, the wrapper's rendered left is its current
      // translation. Read before cancelling the transition, and freeze before paint.
      const visibleX = roamerRef.current?.getBoundingClientRect().left ?? xRef.current;
      xRef.current = visibleX;
      setX(visibleX);
      setTravelling(false);
    }
  }, [moving]);
  useEffect(() => {
    const clamp = () => {
      const current = roamerRef.current?.getBoundingClientRect().left ?? xRef.current;
      const next = Math.max(8, Math.min(current, window.innerWidth - 216));
      if (travelTimer.current) clearTimeout(travelTimer.current);
      xRef.current = next;
      setX(next);
      setTravelling(false);
    };
    window.addEventListener('resize', clamp);
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setTurn((value) => value + 1);
      if (moving) {
        const next = 8 + Math.random() * Math.max(0, window.innerWidth - 224);
        const current = roamerRef.current?.getBoundingClientRect().left ?? xRef.current;
        if (Math.abs(next - current) < 8) return;
        setFacing(next < current ? 'left' : 'right');
        xRef.current = next;
        setTravelling(true);
        setX(next);
        if (travelTimer.current) clearTimeout(travelTimer.current);
        travelTimer.current = setTimeout(() => setTravelling(false), duration * 1000);
      }
    }, 12000);
    return () => { clearInterval(timer); if (travelTimer.current) clearTimeout(travelTimer.current); window.removeEventListener('resize', clamp); };
  }, [moving, duration, companion?.id]);
  useEffect(() => () => { if (reactionTimer.current) clearTimeout(reactionTimer.current); }, []);
  useLayoutEffect(() => {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    if (travelTimer.current) clearTimeout(travelTimer.current);
    const visibleX = roamerRef.current?.getBoundingClientRect().left ?? xRef.current;
    xRef.current = visibleX;
    setX(visibleX);
    setTravelling(false);
    setReaction('');
    setTurn(0);
  }, [companion?.id]);
  useEffect(() => {
    if (turn > 0 && turn % 5 === 0 && companion?.lifecycle?.lifeStatus === 'alive') {
      playCreatureVoice('idle', { ...companion.appearance, voice: companionVoiceProfile(companion.appearance, companion.traits, companion.needs) }, false, companion.id);
    }
  }, [turn, companion?.id]);
  useEffect(() => { if (companion?.lifecycle?.lifeStatus && companion.lifecycle.lifeStatus !== 'alive') onHome(); }, [companion?.lifecycle?.lifeStatus, onHome]);
  if (!companion?.bornAt) return error ? <aside className='companion-roamer' style={{ left: 16 }}><button onClick={onHome}>{t('Return home')}</button><p>{t(error)}</p></aside> : null;
  if (companion.lifecycle?.lifeStatus && companion.lifecycle.lifeStatus !== 'alive') return null;
  const words = t(roamingWords(companion, turn));
  const voice = companionVoiceProfile(companion.appearance, companion.traits, companion.needs, language === 'th' ? 'th-TH' : 'en-US');
  const requestAction = companion.request?.action || 'explore';
  const CareIcon = careIcons[requestAction];
  async function careHere() {
    unlockCreatureVoice();
    if (busy || !companion.allowedActions?.includes(requestAction) || !await act({ action: requestAction })) return;
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    setReaction(requestAction);
    playCreatureVoice(requestAction === 'rest' ? 'sleepy' : 'care_response', { ...companion.appearance, voice }, false, companion.id);
    reactionTimer.current = setTimeout(() => setReaction(''), 2600);
  }
  // Desktop translation belongs to this wrapper; avatar descendants own gait/reactions.
  return <aside ref={roamerRef} className='companion-roamer' style={{ transform: `translateX(${x}px)`, transition: travelling ? `transform ${duration}s linear` : 'none' }} aria-label={companion.name} lang={language}>
    <div className='companion-speech'><strong>{companion.name}</strong><p>{words}</p>{companion.request && <button className='companion-roamer-care' type='button' onClick={() => void careHere()} disabled={Boolean(busy) || !companion.allowedActions?.includes(requestAction)} aria-label={t('Care for {name}', { name: companion.name })}><CareIcon size={14} /><span>{t(companion.request.text)}</span></button>}{voice.enabled && supported && <button type='button' onClick={() => { unlockCreatureVoice(); playCreatureVoice('greeting', { ...companion.appearance, voice }, true, companion.id); }} aria-label={t('Hear a greeting chirp')}><Volume2 size={14} />{t('Chirp')}</button>}</div>
    <button className='companion-roamer-pet' type='button' onClick={onOpen} aria-label={t('Chat')}><CompanionAvatar companion={companion} small reaction={reaction} walking={moving && travelling} facing={facing} /></button>
    <div className='companion-roamer-actions'>
      <button type='button' onClick={() => setPaused(!paused)} aria-label={t(paused ? 'Walk' : 'Pause walking')}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>
      <button type='button' onClick={onOpen} aria-label={t('Chat')}><MessageCircle size={15} /></button>
      <button type='button' onClick={onHome} aria-label={t('Return home')}><Home size={15} /></button>
    </div>
  </aside>;
}

export default function CompanionRoamer(props: { onOpen: () => void; onHome: () => void }) {
  return <CompanionLanguageProvider><Roamer {...props} /></CompanionLanguageProvider>;
}

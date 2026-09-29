import { useEffect, useRef, useState } from 'react';
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
  const reduced = useReducedMotion();
  const supported = creatureVoiceSupported();
  const moving = !paused && !reduced && companion?.appearance?.animated !== false && companion?.mood !== 'sleepy';
  useEffect(() => {
    const clamp = () => setX((value) => Math.max(8, Math.min(value, window.innerWidth - 216)));
    window.addEventListener('resize', clamp);
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setTurn((value) => value + 1);
      if (moving) setX(8 + Math.random() * Math.max(0, window.innerWidth - 224));
    }, 12000);
    return () => { clearInterval(timer); window.removeEventListener('resize', clamp); };
  }, [moving]);
  useEffect(() => () => { if (reactionTimer.current) clearTimeout(reactionTimer.current); }, []);
  useEffect(() => { if (reactionTimer.current) clearTimeout(reactionTimer.current); setReaction(''); setTurn(0); }, [companion?.id]);
  useEffect(() => {
    if (turn > 0 && turn % 5 === 0 && companion?.lifecycle?.lifeStatus === 'alive') {
      playCreatureVoice('idle', { ...companion.appearance, voice: companionVoiceProfile(companion.appearance, companion.traits, companion.needs) });
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
    playCreatureVoice(requestAction === 'rest' ? 'sleepy' : 'care_response', { ...companion.appearance, voice });
    reactionTimer.current = setTimeout(() => setReaction(''), 2600);
  }
  return <aside className={`companion-roamer ${moving ? 'walking' : ''}`} style={{ left: x, transitionDuration: moving ? `${roamingDuration(companion)}s` : undefined }} aria-label={companion.name} lang={language}>
    <div className='companion-speech'><strong>{companion.name}</strong><p>{words}</p>{companion.request && <button className='companion-roamer-care' type='button' onClick={() => void careHere()} disabled={Boolean(busy) || !companion.allowedActions?.includes(requestAction)} aria-label={t('Care for {name}', { name: companion.name })}><CareIcon size={14} /><span>{t(companion.request.text)}</span></button>}{voice.enabled && supported && <button type='button' onClick={() => { unlockCreatureVoice(); playCreatureVoice('greeting', { ...companion.appearance, voice }, true); }} aria-label={t('Hear a greeting chirp')}><Volume2 size={14} />{t('Chirp')}</button>}</div>
    <button className='companion-roamer-pet' type='button' onClick={onOpen} aria-label={t('Chat')}><CompanionAvatar companion={companion} small reaction={reaction} /></button>
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

import { useEffect, useState } from 'react';
import { Home, MessageCircle, Pause, Play, Volume2 } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import useCompanion from '../../hooks/useCompanion.js';
import CompanionAvatar from './CompanionAvatar.js';
import { CompanionLanguageProvider, useCompanionLanguage } from './companionLanguage.js';
import { defaultVoice, useCompanionVoice } from './useCompanionVoice.js';
import type { PublicCompanion } from '../../../../shared/contracts.js';

function roamingWords(companion: PublicCompanion, turn: number) {
  if (companion.mood === 'sleepy' || companion.needs.energy < 35) return 'A cozy nap sounds lovely. I’ll rest here.';
  if (companion.needs.fullness < 40) return 'A little snack would be nice when you have time.';
  if (companion.traits.playfulness > companion.traits.curiosity && companion.traits.playfulness > companion.traits.affection) return ['Shall we invent a tiny game?', 'I bet I can hop over an imaginary cloud!'][turn % 2];
  if (companion.traits.affection > companion.traits.curiosity) return ['It’s cozy being here with you two.', 'I’m saving a little imaginary hug for Joe and Focus.'][turn % 2];
  return ['I wonder what’s around the next corner.', 'I’m exploring our little world. Want to join?'][turn % 2];
}

function Roamer({ onOpen, onHome }: { onOpen: () => void; onHome: () => void }) {
  const { companion, error } = useCompanion();
  const { t, language } = useCompanionLanguage();
  const [x, setX] = useState(16);
  const [paused, setPaused] = useState(false);
  const [turn, setTurn] = useState(0);
  const reduced = useReducedMotion();
  const { speak, stop, speaking, supported, voiceError } = useCompanionVoice();
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
  if (!companion?.bornAt) return error ? <aside className='companion-roamer' style={{ left: 16 }}><button onClick={onHome}>{t('Return home')}</button><p>{t(error)}</p></aside> : null;
  const words = t(roamingWords(companion, turn));
  const voice = { ...(companion.appearance?.voice || defaultVoice), language: language === 'th' ? 'th-TH' as const : 'en-US' as const };
  return <aside className={`companion-roamer ${moving ? 'walking' : ''}`} style={{ left: x }} aria-label={companion.name} lang={language}>
    <div className='companion-speech'><strong>{companion.name}</strong><p>{words}</p>{voice.enabled && supported && <button type='button' onClick={() => speaking ? stop() : speak(words, voice)} aria-label={t(speaking ? 'Stop voice' : 'Listen')}><Volume2 size={14} />{t(speaking ? 'Stop voice' : 'Listen')}</button>}{voiceError && <small role='alert'>{t('Voice could not play. Try another device voice.')}</small>}</div>
    <button className='companion-roamer-pet' type='button' onClick={onOpen} aria-label={t('Chat')}><CompanionAvatar companion={companion} small /></button>
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

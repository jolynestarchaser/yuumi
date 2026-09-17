import { useEffect, useState } from 'react';
import type { CompanionVoice } from '../../../../shared/contracts.js';

export const defaultVoice: CompanionVoice = { enabled: false, language: 'th-TH', voiceURI: '', rate: .95, pitch: 1.25 };

export function useCompanionVoice() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  useEffect(() => {
    if (!supported) return;
    const update = () => setVoices(window.speechSynthesis.getVoices());
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => { window.speechSynthesis.removeEventListener('voiceschanged', update); window.speechSynthesis.cancel(); };
  }, [supported]);
  const stop = () => { if (supported) window.speechSynthesis.cancel(); setSpeaking(false); };
  const speak = (text: string, settings: CompanionVoice) => {
    if (!supported || !settings.enabled) return;
    window.speechSynthesis.cancel();
    setVoiceError(false);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = settings.language;
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.voice = voices.find((voice) => voice.voiceURI === settings.voiceURI && voice.lang.toLowerCase().startsWith(settings.language.slice(0, 2)))
      || voices.find((voice) => voice.lang.toLowerCase().startsWith(settings.language.slice(0, 2))) || null;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = (event) => { setSpeaking(false); if (!['canceled', 'interrupted'].includes(event.error)) setVoiceError(true); };
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };
  return { voices, supported, speaking, voiceError, speak, stop };
}

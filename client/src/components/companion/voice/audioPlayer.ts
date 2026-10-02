import type { CompanionAppearance } from '../../../../../shared/contracts.js';
import { vocalizations, vocalizationPriority, type Syllable, type VocalizationIntent } from './vocalizations.js';
import { canPlayVocalization } from './voicePolicy.js';
import { finishCreaturePlayback, publishCreaturePlayback } from './voicePlayback.js';

let context: AudioContext | null = null;
let current: AudioBufferSourceNode | null = null;
let currentGain: GainNode | null = null;
let activeUntil = 0;
let activePriority = -1;
let lastPlayed = 0;
let lastPriority = -1;
let pendingPlay = 0;
const lastIntent = new Map<VocalizationIntent, number>();
const nextVariant = new Map<VocalizationIntent, number>();
const buffers = new Map<string, AudioBuffer>();

function audioContext() {
  if (typeof window === 'undefined') return null;
  const Constructor = window.AudioContext;
  if (!Constructor) return null;
  try { return context ||= new Constructor(); } catch { return null; }
}

export function creatureVoiceSupported() {
  return typeof window !== 'undefined' && Boolean(window.AudioContext);
}

// Call from the initiating click/submit, before an async request loses user activation.
export function unlockCreatureVoice() {
  const audio = audioContext();
  if (audio?.state === 'suspended') void audio.resume().catch(() => {});
}

function renderSyllable(data: Float32Array, sampleRate: number, start: number, syllable: Syllable, pitchScale: number) {
  const count = Math.floor(syllable.duration * sampleRate);
  const base = ({ mi: 440, mii: 430, pyo: 490, kii: 545, mo: 365, nya: 415 } as const)[syllable.sound] * pitchScale;
  const color = ({ mi: [.29, .09, .025], mii: [.26, .07, .02], pyo: [.18, .17, .04], kii: [.36, .12, .035], mo: [.14, .2, .045], nya: [.3, .18, .05] } as const)[syllable.sound];
  const nasal = syllable.sound === 'mi' || syllable.sound === 'mii' || syllable.sound === 'mo' || syllable.sound === 'nya';
  let phase = 0;
  for (let i = 0; i < count; i++) {
    const progress = i / count;
    const envelope = Math.min(1, i / (sampleRate * (nasal ? .035 : .014)), (count - i) / (sampleRate * .055));
    const contour = syllable.pitch + (syllable.endPitch - syllable.pitch) * progress;
    phase += 2 * Math.PI * base * contour * (1 + .009 * Math.sin(progress * 14)) / sampleRate;
    const tone = Math.sin(phase) + color[0] * Math.sin(phase * 2) + color[1] * Math.sin(phase * 3) + color[2] * Math.sin(phase * 4);
    const breath = nasal ? .028 * Math.sin(phase * 5.17) * (1 - progress) : 0;
    data[start + i] = Math.max(-1, Math.min(1, (tone + breath) * envelope * .27));
  }
}

function clip(audio: AudioContext, intent: VocalizationIntent, variant: number, appearance?: CompanionAppearance) {
  const voice = appearance?.voice;
  const pitchScale = Math.max(.78, Math.min(1.22, (voice?.pitch || 1.25) / 1.25));
  const speed = Math.max(.8, Math.min(1.2, voice?.rate || .95));
  const key = `${intent}:${variant}:${pitchScale.toFixed(2)}:${speed.toFixed(2)}:${audio.sampleRate}`;
  const cached = buffers.get(key);
  if (cached) return cached;
  const pattern = vocalizations[intent][variant];
  const scaled = pattern.map((part) => ({ ...part, duration: part.duration / speed, pause: (part.pause || 0) / speed }));
  const length = Math.ceil((scaled.reduce((sum, part) => sum + part.duration + (part.pause || 0), 0) + .02) * audio.sampleRate);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  let position = 0;
  for (const part of scaled) {
    renderSyllable(data, audio.sampleRate, position, part, pitchScale);
    position += Math.floor((part.duration + (part.pause || 0)) * audio.sampleRate);
  }
  if (buffers.size >= 64) buffers.clear();
  buffers.set(key, buffer);
  return buffer;
}

export function stopCreatureVoice() {
  pendingPlay++;
  if (current) { current.onended = null; current.stop(); current.disconnect(); current = null; }
  currentGain?.disconnect();
  currentGain = null;
  activeUntil = 0;
  activePriority = -1;
  publishCreaturePlayback(null);
}

export function playCreatureVoice(intent: VocalizationIntent, appearance?: CompanionAppearance, preview = false, targetId?: string) {
  if (!preview && appearance?.voice?.enabled === false) return false;
  if (typeof document !== 'undefined' && document.hidden) return false;
  // Ambient chirps never create an audio context or attempt autoplay on their own.
  if (intent === 'idle' && !context) return false;
  const audio = audioContext();
  if (!audio) return false;
  if (audio.state === 'suspended') {
    const request = ++pendingPlay;
    void audio.resume().then(() => { if (request === pendingPlay) playCreatureVoice(intent, appearance, preview, targetId); }).catch(() => {});
    return false;
  }
  if (audio.state !== 'running') return false;
  const now = performance.now();
  const priority = vocalizationPriority[intent];
  if (!canPlayVocalization(intent, now, lastIntent.get(intent), lastPlayed || undefined, lastPriority, activeUntil, activePriority, preview)) return false;
  const variant = (nextVariant.get(intent) || 0) % vocalizations[intent].length;
  nextVariant.set(intent, variant + 1);
  stopCreatureVoice();
  const source = audio.createBufferSource();
  source.buffer = clip(audio, intent, variant, appearance);
  const gain = audio.createGain();
  const energy = intent === 'sleepy' || intent === 'idle' ? .55 : intent === 'thinking' || intent === 'working' ? .7 : intent === 'success' || intent === 'happy' ? 1 : .85;
  gain.gain.value = .62 * energy * Math.max(0, Math.min(1, appearance?.voice?.volume ?? .8));
  source.connect(gain).connect(audio.destination);
  const token = pendingPlay;
  source.onended = () => { if (current === source) { current = null; currentGain = null; activePriority = -1; activeUntil = 0; finishCreaturePlayback(token); } source.disconnect(); gain.disconnect(); };
  current = source;
  currentGain = gain;
  activePriority = priority;
  activeUntil = now + source.buffer.duration * 1000;
  lastPlayed = now;
  lastPriority = priority;
  lastIntent.set(intent, now);
  source.start();
  const speed = Math.max(.8, Math.min(1.2, appearance?.voice?.rate || .95));
  let atMs = 0;
  const syllables = vocalizations[intent][variant].map((part) => {
    const durationMs = part.duration / speed * 1000;
    const entry = { atMs, durationMs, mouth: part.sound === 'mo' || part.sound === 'pyo' ? 'round' as const : 'open' as const };
    atMs += durationMs + (part.pause || 0) / speed * 1000;
    return entry;
  });
  publishCreaturePlayback({ token, targetId, species: appearance?.species || 'spirit', startedAt: performance.now(), durationMs: source.buffer.duration * 1000, syllables });
  return true;
}

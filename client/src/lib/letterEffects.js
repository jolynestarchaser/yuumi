export const LETTER_EFFECTS = Object.freeze({
  none: Object.freeze({ label: 'สงบนิ่ง', glyphs: [] }),
  hearts: Object.freeze({ label: 'หัวใจโคจร', glyphs: ['💚', '💙', '💖', '♡'] }),
  sparkles: Object.freeze({ label: 'ประกายวิ้ง', glyphs: ['✦', '✧', '✨', '⋆'] }),
  'emoji-rain': Object.freeze({ label: 'Emoji โปรย', glyphs: ['😊', '💫', '🌈', '⭐'] }),
  confetti: Object.freeze({ label: 'คอนเฟตตี', glyphs: ['▰', '◆', '●', '▸'] }),
  bubbles: Object.freeze({ label: 'ฟองฝัน', glyphs: ['◯', '○', '◌', '🫧'] }),
  stars: Object.freeze({ label: 'ทางช้างเผือก', glyphs: ['★', '✦', '🌟', '⋆'] })
});

const DEFAULT_EFFECT = 'hearts';

/**
 * Resolve an effect name to the shared client-side visual configuration.
 * Custom emoji is placed first for emoji-rain so the sender's choice is visible.
 *
 * @param {string} effect Requested effect name.
 * @param {string} emoji Sender-selected emoji.
 * @returns {{name: string, label: string, glyphs: string[]}}
 */
export function resolveLetterEffect(effect, emoji = '💌') {
  const name = Object.hasOwn(LETTER_EFFECTS, effect) ? effect : DEFAULT_EFFECT;
  const preset = LETTER_EFFECTS[name];
  const customEmoji = typeof emoji === 'string' ? emoji.trim() : '';
  const glyphs = name === 'emoji-rain' && customEmoji
    ? [customEmoji, ...preset.glyphs]
    : [...preset.glyphs];
  return { name, label: preset.label, glyphs };
}

/**
 * Build deterministic particle data. Deterministic positions avoid visual jumps
 * when React re-renders while a notification is on screen.
 *
 * @param {{effect?: string, emoji?: string, count?: number}} options Effect options.
 * @returns {Array<{id: string, glyph: string, x: number, delay: number, duration: number, drift: number, scale: number, rotation: number}>}
 */
export function createCelebrationParticles({ effect = DEFAULT_EFFECT, emoji = '💌', count = 18 } = {}) {
  const preset = resolveLetterEffect(effect, emoji);
  if (!preset.glyphs.length || count <= 0) return [];
  return Array.from({ length: count }, (_, index) => ({
    id: `${preset.name}-${index}`,
    glyph: preset.glyphs[index % preset.glyphs.length],
    x: (index * 37 + 11) % 96,
    delay: (index * 0.17) % 1.4,
    duration: 2.7 + (index % 5) * 0.24,
    drift: ((index * 29) % 140) - 70,
    scale: 0.72 + (index % 4) * 0.18,
    rotation: ((index * 47) % 180) - 90
  }));
}

/**
 * Select the newest unread message that has not been dismissed in this session.
 *
 * @param {Array<object>} messages Inbox messages ordered newest first.
 * @param {Set<string>} dismissedIds Message IDs dismissed for the current session.
 * @returns {object|null}
 */
export function getNextUnreadMessage(messages = [], dismissedIds = new Set()) {
  return messages.find((message) => message && !message.readAt && !dismissedIds.has(message._id)) ?? null;
}

/**
 * Play a short three-note glass chime without loading an audio asset.
 * Browsers may reject autoplay; this function treats that as a silent fallback.
 *
 * @param {{enabled?: boolean, AudioContextClass?: typeof AudioContext}} options Audio options.
 * @returns {Promise<boolean>} Whether the chime was scheduled.
 */
export async function playLetterChime({ enabled = true, AudioContextClass } = {}) {
  if (!enabled) return false;
  const Context = AudioContextClass ?? globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!Context) return false;
  let context;
  try {
    context = new Context();
    if (context.state === 'suspended') await context.resume();
    const startedAt = context.currentTime;
    [880, 1174.66, 1568].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = startedAt + index * 0.105;
      oscillator.type = index === 2 ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.075, noteStart + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.42);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.44);
    });
    globalThis.setTimeout(() => { context.close().catch(() => {}); }, 900);
    return true;
  } catch {
    await context?.close?.().catch?.(() => {});
    return false;
  }
}

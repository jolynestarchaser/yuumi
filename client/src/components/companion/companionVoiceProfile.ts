import type { CompanionAppearance, CompanionSpecies, CompanionVoice } from '../../../../shared/contracts.js';

const speciesVoices: Record<CompanionSpecies | 'dog' | 'frog' | 'duck', Pick<CompanionVoice, 'preset' | 'rate' | 'pitch'>> = {
  spirit: { preset: 'fairy', rate: .88, pitch: 1.55 },
  bunny: { preset: 'fairy', rate: 1.08, pitch: 1.45 },
  cat: { preset: 'natural', rate: .94, pitch: 1.16 },
  dog: { preset: 'natural', rate: .98, pitch: .98 },
  frog: { preset: 'fairy', rate: .86, pitch: 1.05 },
  duck: { preset: 'spark', rate: 1.02, pitch: 1.28 },
  fox: { preset: 'spark', rate: 1.12, pitch: 1.35 },
  dragon: { preset: 'dragon', rate: .82, pitch: .78 },
  robot: { preset: 'robot', rate: .76, pitch: 1.02 },
  child: { preset: 'natural', rate: 1, pitch: 1.18 },
  custom: { preset: 'natural', rate: .96, pitch: 1.2 },
};

/** Reuse saved voice settings as a gentle creature timbre; no text is spoken. */
export function companionVoiceProfile(
  appearance?: CompanionAppearance,
  traits?: { curiosity: number; affection: number; playfulness: number },
  needs?: { energy: number },
  language: CompanionVoice['language'] = 'th-TH',
): CompanionVoice {
  const species = appearance?.species || 'spirit';
  const base = appearance?.voice || { enabled: true, language, voiceURI: '', ...speciesVoices[species] };
  const pace = needs && needs.energy < 35 ? -.12 : traits && traits.playfulness >= 70 ? .06 : 0;
  return { ...base, language, rate: Math.min(1.5, Math.max(.5, Math.round((base.rate + pace) * 100) / 100)) };
}

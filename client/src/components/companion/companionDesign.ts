import type { CompanionTheme, CompanionVoicePreset } from '../../../../shared/contracts.js';

export const colorThemes: { id: Exclude<CompanionTheme, 'custom'>; label: string; bodyColor: string; accentColor: string; eyeColor: string }[] = [
  { id: 'lavender', label: 'Lavender garden', bodyColor: '#d4c2f0', accentColor: '#c4dbbf', eyeColor: '#423452' },
  { id: 'forest', label: 'Enchanted forest', bodyColor: '#8dcca0', accentColor: '#f6d893', eyeColor: '#21433c' },
  { id: 'ocean', label: 'Ocean dream', bodyColor: '#8edce5', accentColor: '#cab4f2', eyeColor: '#234369' },
  { id: 'sunset', label: 'Sunset peach', bodyColor: '#ffbc95', accentColor: '#f18eac', eyeColor: '#603b55' },
  { id: 'starlight', label: 'Electric starlight', bodyColor: '#ffe16a', accentColor: '#74cde8', eyeColor: '#39375c' },
  { id: 'candy', label: 'Candy cloud', bodyColor: '#f3add7', accentColor: '#aae7dd', eyeColor: '#593b75' }
];
export const voicePresets: { id: Exclude<CompanionVoicePreset, 'custom'>; label: string; rate: number; pitch: number }[] = [
  { id: 'natural', label: 'Natural friend', rate: .95, pitch: 1.25 },
  { id: 'spark', label: 'Tiny electric sprite', rate: 1.2, pitch: 2 },
  { id: 'fairy', label: 'Dreamy fairy', rate: .85, pitch: 1.65 },
  { id: 'dragon', label: 'Gentle little dragon', rate: .8, pitch: .7 },
  { id: 'robot', label: 'Pocket robot', rate: .7, pitch: 1.05 }
];

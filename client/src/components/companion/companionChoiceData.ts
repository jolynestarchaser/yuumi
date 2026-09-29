import { Cloud, Moon, Sun, Wrench } from 'lucide-react';
import type { CompanionFace, CompanionSpecies, CompanionWorld, Temperament } from '../../../../shared/contracts.js';

export const creatureBases: { id: CompanionSpecies; label: string; note: string }[] = [
  { id: 'spirit', label: 'Forest spirit', note: 'Leaf-eared and curious' },
  { id: 'bunny', label: 'Bunny', note: 'A soft little hopper' },
  { id: 'cat', label: 'Cat', note: 'Paws, naps, and mischief' },
  { id: 'fox', label: 'Fox', note: 'Bright-eyed and quick' },
  { id: 'dragon', label: 'Dragon', note: 'Tiny wings, big heart' },
  { id: 'robot', label: 'Robot', note: 'A pocket-sized friend' },
  { id: 'custom', label: 'Make my own', note: 'Describe your little creature' },
];

export const companionWorlds: { id: CompanionWorld; label: string; note: string; Icon: typeof Moon }[] = [
  { id: 'moon-garden', label: 'Moon garden', note: 'Night flowers and soft stars', Icon: Moon },
  { id: 'sunny-meadow', label: 'Sunny meadow', note: 'Warm grass and sleepy bees', Icon: Sun },
  { id: 'cloud-cove', label: 'Cloud cove', note: 'A quiet place above the rain', Icon: Cloud },
  { id: 'pocket-workshop', label: 'Pocket workshop', note: 'Little inventions everywhere', Icon: Wrench },
];

export const startingTemperaments: { id: Temperament; label: string; note: string }[] = [
  { id: 'curious', label: 'Curious', note: 'Peeks around every corner' },
  { id: 'gentle', label: 'Gentle', note: 'Stays close when you need them' },
  { id: 'playful', label: 'Playful', note: 'Makes a game of small things' },
];

export const companionFaces: { id: CompanionFace; label: string }[] = [
  { id: 'gentle', label: 'Soft smile' }, { id: 'happy', label: 'Happy eyes' },
  { id: 'sleepy', label: 'Sleepy blink' }, { id: 'mischievous', label: 'Cheeky wink' },
  { id: 'starry', label: 'Starry eyes' },
];

export const companionShapes = [
  { id: 'round', label: 'Round' }, { id: 'bean', label: 'Bean' }, { id: 'fluffy', label: 'Fluffy' },
] as const;

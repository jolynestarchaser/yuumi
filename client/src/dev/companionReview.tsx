// Vite-only review entry. No backend requests, live companions, or provider calls.
import { createRoot } from 'react-dom/client';
import CompanionWidget from '../components/companion/CompanionWidget.js';
import { api } from '../lib/api.js';
import { useAuthStore } from '../store/authStore.js';
import type { PublicCompanion } from '../../../shared/contracts.js';
import '../styles.css';
import '../customization.css';

if (!import.meta.env.DEV) throw new Error('The mock review is development-only.');
const now = '2026-10-02T08:00:00.000Z';
let pet: PublicCompanion = {
  id: 'joe-and-focus', name: 'Yogust', form: 'child', seed: 'A little friend from the moon garden.',
  inspirations: { joe: 'Quiet mornings and small adventures.', focus: 'Flowers, stars, and stories.' },
  bornAt: now, updatedAt: now, needs: { fullness: 88, energy: 93, joy: 99, comfort: 100, hygiene: 52, health: 100 },
  traits: { curiosity: 62, affection: 85, playfulness: 71 }, bonds: { joe: 18, focus: 22 }, xp: 1280,
  mood: 'cozy', thought: 'Shall we discover something small together today?', chatColor: '#cdb2ea',
  appearance: { visualStyle: 'soft', animated: true, usePortrait: false, species: 'child', world: 'moon-garden' },
  behaviorState: 'resting', memories: [{ id: 'memory-1', actor: 'joe', at: now, text: 'We explored the garden together.', kind: 'care' }],
  turns: [{ id: 'turn-1', actor: 'joe', at: now, text: 'Hello, little friend.' }, { id: 'turn-2', actor: 'companion', at: now, text: 'I saved a little smile for you.' }],
  portrait: null, revision: 1, level: 17, stage: 'Grown companion', growthStage: 'grown', formId: 'child',
  visualForm: { species: 'child', xpTier: 3, xpPath: 'guardian', lifeStage: 'grown' },
  wish: 'A quiet walk with both of you.', request: null,
  allowedActions: ['feed', 'play', 'cuddle', 'rest', 'explore', 'clean'],
  lifecycle: { rulesVersion: 3, lifeStatus: 'alive', healthCondition: 'well', stage: 'grown', simulatedAgeHours: 400, stageCareCount: 36, lowNeedExposureHours: 0, simulationAt: now, lastEngagementAt: now, generation: 1, lineageId: 'mock-family' },
};
api.defaults.adapter = async (config) => {
  const command = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
  if (command?.action === 'customize') pet = { ...pet, name: command.name, form: command.form, seed: command.seed, appearance: command.appearance, visualForm: { ...pet.visualForm, species: command.appearance.species }, revision: pet.revision + 1 };
  const data = config.url === '/companions/roster' ? { companions: [pet] } : { companion: pet, capabilities: { chat: true, portraits: false } };
  return { data: { ok: true, data }, status: 200, statusText: 'OK', headers: {}, config };
};
useAuthStore.setState({ profile: 'joe' });
createRoot(document.getElementById('root')!).render(<CompanionWidget onClose={() => {}} onGoOut={() => {}} />);

import type { CompanionAppearance, PublicCompanion } from '../../../../shared/contracts.js';

export interface CompanionEditorDraft {
  name: string;
  form: PublicCompanion['form'];
  seed: string;
  appearance: CompanionAppearance;
}

export function companionEditorDraft(companion: PublicCompanion): CompanionEditorDraft {
  const species = companion.appearance?.species ?? companion.visualForm?.species
    ?? (companion.form === 'child' ? 'child' : companion.form === 'pet' ? 'bunny' : 'spirit');
  return {
    name: companion.name,
    form: companion.form,
    seed: companion.seed,
    appearance: { animated: true, ...companion.appearance, species, visualStyle: 'soft', usePortrait: false },
  };
}

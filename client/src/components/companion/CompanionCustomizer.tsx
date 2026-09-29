import { useState } from 'react';
import type { CompanionPanelProps } from './types.js';
import CompanionAvatar from './CompanionAvatar.js';
import CompanionAppearancePicker, { defaultAppearance } from './CompanionAppearancePicker.js';
import CompanionDesignFields from './CompanionDesignFields.js';
import { useCompanionLanguage } from './companionLanguage.js';
import { formForSpecies } from './companionCreation.js';
import { companionWorlds } from './companionChoiceData.js';

export default function CompanionCustomizer({ companion, busy, act }: Pick<CompanionPanelProps, 'companion' | 'busy' | 'act'>) {
  const { t } = useCompanionLanguage();
  const [draft, setDraft] = useState(() => ({ name: companion.name, form: companion.form, seed: companion.seed, appearance: companion.appearance || defaultAppearance }));
  const [revision, setRevision] = useState(companion.revision);
  const [saved, setSaved] = useState(false);
  const reload = () => { setDraft({ name: companion.name, form: companion.form, seed: companion.seed, appearance: companion.appearance || defaultAppearance }); setRevision(companion.revision); setSaved(false); };
  const world = companionWorlds.find(({ id }) => id === draft.appearance.world) || companionWorlds[0];
  return <form className='companion-customizer' onChange={() => setSaved(false)} onSubmit={async (event) => {
    event.preventDefault();
    if (await act({ action: 'customize', ...draft, expectedRevision: revision })) { setSaved(true); setRevision(revision + 1); }
  }}>
    <h4>{t('Edit appearance and voice')}</h4>
    <div className={`companion-customizer-preview world-${world.id}`}>
      <CompanionAvatar companion={{ ...companion, ...draft, visualForm: undefined }} />
      <div><small>{t('Preview — save to keep changes')}</small><label>{t('Their name')}<input required maxLength={32} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><span>{t('From the {world}', { world: t(world.label) })}</span></div>
    </div>
    <CompanionAppearancePicker value={draft.appearance} disabled={Boolean(busy)} onChange={(appearance) => { setDraft({ ...draft, appearance }); setSaved(false); }} />
    <CompanionDesignFields value={draft.appearance} disabled={Boolean(busy)} onChange={(appearance) => { setDraft({ ...draft, form: appearance.species !== draft.appearance.species && appearance.species ? formForSpecies(appearance.species) : draft.form, appearance }); setSaved(false); }} />
    <details><summary>{t('Story notes')}</summary><label><textarea aria-label={t('Story notes')} maxLength={500} value={draft.seed} onChange={(event) => setDraft({ ...draft, seed: event.target.value })} /></label></details>
    <div className='companion-creation-actions'><button type='button' className='companion-secondary' onClick={reload} disabled={Boolean(busy)}>{t('Reload saved design')}</button><button type='submit' className='companion-primary' disabled={Boolean(busy) || !draft.name.trim() || !draft.seed.trim() || (draft.appearance.species === 'custom' && !draft.appearance.customDescription?.trim())}>{t(busy === 'customize' ? 'Saving…' : 'Save design')}</button></div>
    {saved && <small role='status'>{t('Design saved for both of you.')}</small>}
  </form>;
}

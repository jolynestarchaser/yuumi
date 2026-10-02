import { useState } from 'react';
import type { CompanionPanelProps } from './types.js';
import CompanionAvatar from './CompanionAvatar.js';
import CompanionAppearancePicker from './CompanionAppearancePicker.js';
import CompanionDesignFields from './CompanionDesignFields.js';
import { useCompanionLanguage } from './companionLanguage.js';
import { formForSpecies } from './companionCreation.js';
import { companionWorlds, creatureBases } from './companionChoiceData.js';
import { companionEditorDraft } from './companionEditorDraft.js';
import './companion-editor.css';

export default function CompanionCustomizer({ companion, busy, act }: Pick<CompanionPanelProps, 'companion' | 'busy' | 'act'>) {
  const { t } = useCompanionLanguage();
  const [draft, setDraft] = useState(() => companionEditorDraft(companion));
  const [baseline, setBaseline] = useState(() => JSON.stringify(companionEditorDraft(companion)));
  const [revision, setRevision] = useState(companion.revision);
  const [saved, setSaved] = useState(false);
  const reload = () => { const next = companionEditorDraft(companion); setDraft(next); setBaseline(JSON.stringify(next)); setRevision(companion.revision); setSaved(false); };
  const dirty = JSON.stringify(draft) !== baseline;
  const speciesLabel = creatureBases.find(({ id }) => id === draft.appearance.species)?.label || 'Forest spirit';
  const world = companionWorlds.find(({ id }) => id === draft.appearance.world) || companionWorlds[0];
  return <form className='companion-customizer' onChange={() => setSaved(false)} onSubmit={async (event) => {
    event.preventDefault();
    if (!dirty || busy) return;
    if (await act({ action: 'customize', ...draft, expectedRevision: revision })) { setSaved(true); setBaseline(JSON.stringify(draft)); setRevision(revision + 1); }
  }}>
    <header className='companion-editor-heading'><h4>{t('Edit appearance and voice')}</h4><p>{t('Try a new look. Your shared companion changes only when you save.')}</p></header>
    <fieldset className='companion-editor-body' disabled={Boolean(busy)}>
      <div className={`companion-customizer-preview world-${world.id}`}>
        <div className='companion-editor-stage'><CompanionAvatar decorative activity='idle' companion={{ ...companion, ...draft, visualForm: undefined }} /></div>
        <div className='companion-editor-identity'><small className='companion-editor-preview-label'>{t('Live preview')}</small><label>{t('Their name')}<input required maxLength={32} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><strong>{t(speciesLabel)}</strong><span>{t('From the {world}', { world: t(world.label) })}</span></div>
      </div>
      <CompanionAppearancePicker value={draft.appearance} disabled={Boolean(busy)} onChange={(appearance) => { setDraft({ ...draft, appearance }); setSaved(false); }} />
      <CompanionDesignFields value={draft.appearance} disabled={Boolean(busy)} onChange={(appearance) => { setDraft({ ...draft, form: appearance.species !== draft.appearance.species && appearance.species ? formForSpecies(appearance.species) : draft.form, appearance }); setSaved(false); }} />
      <details><summary>{t('Story notes')}</summary><label><textarea aria-label={t('Story notes')} maxLength={500} value={draft.seed} onChange={(event) => setDraft({ ...draft, seed: event.target.value })} /></label></details>
    </fieldset>
    <footer className='companion-editor-footer'><small role='status'>{t(saved ? 'Design saved for both of you.' : dirty ? 'Unsaved design changes' : 'Your saved design')}</small><div className='companion-creation-actions'><button type='button' className='companion-secondary' onClick={reload} disabled={Boolean(busy)}>{t('Reload saved design')}</button><button type='submit' className='companion-primary' disabled={Boolean(busy) || !dirty || !draft.name.trim() || !draft.seed.trim() || (draft.appearance.species === 'custom' && !draft.appearance.customDescription?.trim())}>{t(busy === 'customize' ? 'Saving…' : 'Save design')}</button></div></footer>
  </form>;
}

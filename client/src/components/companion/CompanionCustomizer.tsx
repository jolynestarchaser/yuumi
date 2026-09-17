import { useState } from 'react';
import type { CompanionPanelProps } from './types.js';
import CompanionAvatar from './CompanionAvatar.js';
import CompanionAppearancePicker, { defaultAppearance } from './CompanionAppearancePicker.js';
import CompanionDesignFields from './CompanionDesignFields.js';
import { useCompanionLanguage } from './companionLanguage.js';

export default function CompanionCustomizer({ companion, busy, act }: Pick<CompanionPanelProps, 'companion' | 'busy' | 'act'>) {
  const { t } = useCompanionLanguage();
  const [draft, setDraft] = useState(() => ({ name: companion.name, form: companion.form, seed: companion.seed, appearance: companion.appearance || defaultAppearance }));
  const [revision, setRevision] = useState(companion.revision);
  const [saved, setSaved] = useState(false);
  const reload = () => { setDraft({ name: companion.name, form: companion.form, seed: companion.seed, appearance: companion.appearance || defaultAppearance }); setRevision(companion.revision); setSaved(false); };
  return <form className='companion-customizer' onChange={() => setSaved(false)} onSubmit={async (event) => {
    event.preventDefault();
    if (await act('customize', { ...draft, expectedRevision: revision })) { setSaved(true); setRevision(revision + 1); }
  }}>
    <h4>{t('Edit appearance and voice')}</h4>
    <div className='companion-customizer-preview'><CompanionAvatar companion={{ ...companion, ...draft }} small />
    <label>{t('Their name')}<input required maxLength={32} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
    </div>
    <CompanionAppearancePicker value={draft.appearance} hasPortrait={Boolean(companion.portrait?.url)} disabled={Boolean(busy)} onChange={(appearance) => { setDraft({ ...draft, appearance }); setSaved(false); }} />
    <CompanionDesignFields value={draft.appearance} disabled={Boolean(busy)} onChange={(appearance) => setDraft({ ...draft, appearance })} />
    <details><summary>{t('Species, colors, and special features')}</summary><label><textarea aria-label={t('Species, colors, and special features')} maxLength={500} value={draft.seed} onChange={(event) => setDraft({ ...draft, seed: event.target.value })} /></label></details>
    <div className='companion-creation-actions'><button type='button' className='companion-secondary' onClick={reload} disabled={Boolean(busy)}>{t('Reload saved design')}</button><button type='submit' className='companion-primary' disabled={Boolean(busy) || !draft.name.trim() || !draft.seed.trim() || (draft.appearance.species === 'custom' && !draft.appearance.customDescription?.trim())}>{t(busy === 'customize' ? 'Saving…' : 'Save design')}</button></div>
    {saved && <small role='status'>{t('Design saved for both of you.')}</small>}
  </form>;
}

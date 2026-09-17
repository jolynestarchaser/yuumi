import type { CompanionAppearance } from '../../../../shared/contracts.js';
import { useCompanionLanguage } from './companionLanguage.js';

export const defaultAppearance: CompanionAppearance = { visualStyle: 'soft', animated: true, usePortrait: true };

export default function CompanionAppearancePicker({ value, onChange, disabled = false, hasPortrait = false }: {
  value: CompanionAppearance;
  onChange: (value: CompanionAppearance) => void;
  disabled?: boolean;
  hasPortrait?: boolean;
}) {
  const { t } = useCompanionLanguage();
  return <fieldset className='companion-appearance-picker' disabled={disabled}>
    <legend>{t('Appearance')}</legend>
    <div className='companion-style-buttons'>
      <button type='button' aria-pressed={value.visualStyle === 'soft'} onClick={() => onChange({ ...value, visualStyle: 'soft' })}>{t('Soft')}</button>
      <button type='button' aria-pressed={value.visualStyle === 'pixel'} onClick={() => onChange({ ...value, visualStyle: 'pixel' })}>{t('Pixel art')}</button>
    </div>
    <label><input type='checkbox' checked={value.animated} onChange={(event) => onChange({ ...value, animated: event.target.checked })} />{t('Animation')}</label>
    {hasPortrait && value.visualStyle === 'pixel' && <label><input type='checkbox' checked={value.usePortrait} onChange={(event) => onChange({ ...value, usePortrait: event.target.checked })} />{t('Use saved portrait')}</label>}
  </fieldset>;
}

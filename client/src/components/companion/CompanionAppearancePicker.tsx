import type { CompanionAppearance } from '../../../../shared/contracts.js';
import { useCompanionLanguage } from './companionLanguage.js';

export const defaultAppearance: CompanionAppearance = { visualStyle: 'soft', animated: true, usePortrait: false };

export default function CompanionAppearancePicker({ value, onChange, disabled = false }: {
  value: CompanionAppearance;
  onChange: (value: CompanionAppearance) => void;
  disabled?: boolean;
}) {
  const { t } = useCompanionLanguage();
  return <fieldset className='companion-appearance-picker' disabled={disabled}>
    <legend>{t('Appearance')}</legend>
    <label><input type='checkbox' checked={value.animated} onChange={(event) => onChange({ ...value, visualStyle: 'soft', usePortrait: false, animated: event.target.checked })} />{t('Animation')}</label>
  </fieldset>;
}

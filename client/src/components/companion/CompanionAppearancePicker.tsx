import type { CompanionAppearance } from '../../../../shared/contracts.js';

export const defaultAppearance: CompanionAppearance = { visualStyle: 'soft', animated: true, usePortrait: true };

export default function CompanionAppearancePicker({ value, onChange, disabled = false, hasPortrait = false }: {
  value: CompanionAppearance;
  onChange: (value: CompanionAppearance) => void;
  disabled?: boolean;
  hasPortrait?: boolean;
}) {
  return <fieldset className='companion-appearance-picker' disabled={disabled}>
    <legend>Appearance · รูปแบบตัวละคร</legend>
    <div className='companion-style-buttons'>
      <button type='button' aria-pressed={value.visualStyle === 'soft'} onClick={() => onChange({ ...value, visualStyle: 'soft' })}>Soft · แบบนุ่ม</button>
      <button type='button' aria-pressed={value.visualStyle === 'pixel'} onClick={() => onChange({ ...value, visualStyle: 'pixel' })}>Pixel art · พิกเซล</button>
    </div>
    <label><input type='checkbox' checked={value.animated} onChange={(event) => onChange({ ...value, animated: event.target.checked })} />Animation · เคลื่อนไหว</label>
    {hasPortrait && value.visualStyle === 'pixel' && <label><input type='checkbox' checked={value.usePortrait} onChange={(event) => onChange({ ...value, usePortrait: event.target.checked })} />ใช้ภาพที่สร้างไว้</label>}
  </fieldset>;
}

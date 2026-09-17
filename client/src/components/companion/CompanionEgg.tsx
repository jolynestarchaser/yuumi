import { useCompanionLanguage } from './companionLanguage.js';
import type { CompanionAppearance } from '../../../../shared/contracts.js';

export default function CompanionEgg({ name, appearance }: { name: string; appearance: CompanionAppearance }) {
  const { t } = useCompanionLanguage();
  return <div className={`companion-birth style-${appearance.visualStyle} ${appearance.animated ? '' : 'motion-paused'}`} role='status' aria-live='polite' style={{ '--egg-color': appearance.bodyColor || '#d4c2f0', '--egg-accent': appearance.accentColor || '#c4dbbf' }}>
    <div className='companion-egg-scene' aria-hidden='true'>
      <div className='companion-egg-glow' />
      <svg className='companion-egg' viewBox='0 0 64 72' width='192' height='216'>
        <g className='egg-bottom'><path d='M10 34 20 38 27 32 35 40 43 33 54 36C62 60 48 69 32 69S3 60 10 34Z' /><path className='egg-spot' d='M17 46h8v8h-8zM37 53h7v7h-7z' /></g>
        <g className='egg-top'><path d='M10 34C14 14 23 3 32 3S51 15 54 36L43 33 35 40 27 32 20 38Z' /><path className='egg-spot' d='M27 14h8v8h-8zM40 25h6v6h-6z' /></g>
      </svg>
      <span className='egg-spark spark-a'>✦</span><span className='egg-spark spark-b'>✧</span><span className='egg-spark spark-c'>♡</span>
    </div>
    <h3>{t('Hatching…')}</h3><p>{t('A little friend is on the way, {name}.', { name })}</p>
    <small>{t('Your character is being saved. No AI generation is used.')}</small>
  </div>;
}

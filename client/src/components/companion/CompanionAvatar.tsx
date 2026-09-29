import type { CompanionState, LifecycleCareAction, PublicCompanion } from '../../../../shared/contracts.js';
import { useCompanionLanguage } from './companionLanguage.js';
import PixelCompanion from './PixelCompanion.js';
import { visualFormFor } from './visualForm.js';

type AvatarCharacter = Pick<CompanionState, 'name' | 'form' | 'mood'>
  & Partial<Pick<CompanionState, 'xp' | 'appearance' | 'evolutions' | 'stageOutcomes' | 'lifecycle'>>
  & Partial<Pick<PublicCompanion, 'growthStage' | 'visualForm'>>;

const reactionMark: Record<LifecycleCareAction, string> = { feed: '🍎', play: '✦', cuddle: '♡', rest: 'Zz', explore: '🍃', clean: '✧', medicine: '♡' };

export default function CompanionAvatar({ companion, small = false, reaction = '' }: { companion: AvatarCharacter; small?: boolean; reaction?: LifecycleCareAction | '' }) {
  const { t } = useCompanionLanguage();
  const appearance = companion.appearance || { visualStyle: 'soft' as const, animated: true, usePortrait: false };
  const visualForm = visualFormFor({ ...companion, xp: companion.xp || 0 });
  const { species, lifeStage, xpPath, xpTier } = visualForm;
  return <div className={`companion-avatar species-${species} stage-${lifeStage} path-${xpPath} xp-tier-${xpTier} style-${appearance.visualStyle} ${appearance.animated ? '' : 'motion-paused'} ${small ? 'small' : ''} mood-${companion.mood} form-${companion.form} reaction-${reaction}`} style={{ '--creature-body': appearance.bodyColor || (species === 'child' ? '#f7d8be' : '#d4c2f0'), '--creature-accent': appearance.accentColor || (species === 'spirit' ? '#c4dbbf' : '#e9d0df'), '--creature-eye': appearance.eyeColor || '#423452' }} role='img' aria-label={`${companion.name || t('Your companion')}, ${t(companion.mood)}, ${t(appearance.visualStyle)}`}>
    <div className={`companion-avatar-motion face-${appearance.face || 'gentle'} silhouette-${appearance.silhouette || 'round'}`}>
      {appearance.visualStyle === 'pixel' ? <PixelCompanion species={species} face={appearance.face || 'gentle'} lifeStage={lifeStage} xpTier={xpTier} path={xpPath} /> : <div className='companion-creature'>
        <i className='creature-tail' /><i className='creature-wing left' /><i className='creature-wing right' />
        <i className='creature-ear left' /><i className='creature-ear right' />
        <div className='creature-body'>{lifeStage !== 'hatchling' && <span className='creature-markings' aria-hidden='true'>✦</span>}{(lifeStage === 'grown' || lifeStage === 'elder') && <span className='creature-crown' aria-hidden='true'>✧</span>}<span className='creature-star'>✦</span><div className='creature-face'><i /><b /><i /></div><div className='creature-cheeks'><i /><i /></div></div>
        <i className='creature-foot left' /><i className='creature-foot right' />
      </div>}
    </div>
    <span className='companion-spark one'>✧</span><span className='companion-spark two'>✦</span><span className='companion-spark three'>·</span>
    {reaction && <span key={reaction} className='companion-care-reaction' aria-hidden='true'>{reactionMark[reaction]}</span>}
  </div>;
}

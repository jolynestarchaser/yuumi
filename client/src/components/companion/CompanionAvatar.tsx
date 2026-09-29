import type { CompanionState, LifecycleCareAction, PublicCompanion } from '../../../../shared/contracts.js';
import { useCompanionLanguage } from './companionLanguage.js';
import PixelCompanion from './PixelCompanion.js';
import { visualFormFor } from './visualForm.js';
import { CircleHelp, Code2, Ellipsis, Moon, Search, Sparkles } from 'lucide-react';
import type { CompanionActivity } from './types.js';

type AvatarCharacter = Pick<CompanionState, 'name' | 'form' | 'mood'>
  & Partial<Pick<CompanionState, 'xp' | 'appearance' | 'evolutions' | 'stageOutcomes' | 'lifecycle' | 'behaviorState'>>
  & Partial<Pick<PublicCompanion, 'growthStage' | 'visualForm'>>;

const reactionMark: Record<LifecycleCareAction, string> = { feed: '🍎', play: '✦', cuddle: '♡', rest: 'Zz', explore: '🍃', clean: '✧', medicine: '♡' };
const activityCue = {
  thinking: { label: 'Thinking', Icon: Ellipsis },
  searching: { label: 'Searching', Icon: Search },
  working: { label: 'Working', Icon: Code2 },
  success: { label: 'Happy', Icon: Sparkles },
  error: { label: 'Confused', Icon: CircleHelp },
  sleeping: { label: 'Resting', Icon: Moon },
} as const;

export default function CompanionAvatar({ companion, small = false, decorative = false, reaction = '', activity }: { companion: AvatarCharacter; small?: boolean; decorative?: boolean; reaction?: LifecycleCareAction | ''; activity?: CompanionActivity }) {
  const { t } = useCompanionLanguage();
  const appearance = companion.appearance || { visualStyle: 'soft' as const, animated: true, usePortrait: false };
  const visualForm = visualFormFor({ ...companion, xp: companion.xp || 0 });
  const { species, lifeStage, xpPath, xpTier } = visualForm;
  const state = activity || (reaction ? (reaction === 'rest' ? 'sleeping' : 'success') : companion.behaviorState === 'resting' || companion.mood === 'sleepy' ? 'sleeping' : 'idle');
  const cue = state === 'idle' ? null : activityCue[state];
  return <div className={`companion-avatar species-${species} stage-${lifeStage} path-${xpPath} xp-tier-${xpTier} style-${appearance.visualStyle} ${appearance.animated ? '' : 'motion-paused'} ${small ? 'small' : ''} mood-${companion.mood} form-${companion.form} activity-${state} reaction-${reaction}`} style={{ '--creature-body': appearance.bodyColor || (species === 'child' ? '#f7d8be' : '#d4c2f0'), '--creature-accent': appearance.accentColor || (species === 'spirit' ? '#c4dbbf' : '#e9d0df'), '--creature-eye': appearance.eyeColor || '#423452' }} role={decorative ? 'presentation' : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : `${companion.name || t('Your companion')}, ${t(companion.mood)}, ${cue ? t(cue.label) : t('Idle')}, ${t(appearance.visualStyle)}`}>
    <div className={`companion-avatar-motion face-${appearance.face || 'gentle'} silhouette-${appearance.silhouette || 'round'}`}>
      {appearance.visualStyle === 'pixel' ? <PixelCompanion species={species} face={appearance.face || 'gentle'} activity={state} lifeStage={lifeStage} xpTier={xpTier} path={xpPath} /> : <div className='companion-creature'>
        <i className='creature-tail' /><i className='creature-wing left' /><i className='creature-wing right' />
        <i className='creature-ear left' /><i className='creature-ear right' />
        <i className='creature-arm left' /><i className='creature-arm right' />
        <div className='creature-body'>{lifeStage !== 'hatchling' && <span className='creature-markings' aria-hidden='true'>✦</span>}{(lifeStage === 'grown' || lifeStage === 'elder') && <span className='creature-crown' aria-hidden='true'>✧</span>}<span className='creature-star'>✦</span><div className='creature-face'><i /><b /><i /></div><div className='creature-cheeks'><i /><i /></div></div>
        <i className='creature-foot left' /><i className='creature-foot right' />
      </div>}
    </div>
    <span className='companion-spark one'>✧</span><span className='companion-spark two'>✦</span><span className='companion-spark three'>·</span>
    {cue && !small && <span className='companion-activity-cue' aria-hidden='true'><cue.Icon size={14} strokeWidth={2.2} /><span>{t(cue.label)}</span></span>}
    {reaction && <span key={reaction} className='companion-care-reaction' aria-hidden='true'>{reactionMark[reaction]}</span>}
  </div>;
}

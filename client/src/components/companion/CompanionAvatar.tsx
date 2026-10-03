import type { CompanionAppearance, CompanionState, LifecycleCareAction, PublicCompanion } from '../../../../shared/contracts.js';
import { useCompanionLanguage } from './companionLanguage.js';
import { petArtPalette, type PetArtRender } from './SoftPet.js';
import SoftPet from './IllustratedPet.js';
import './pet-art.css';
import { visualFormFor } from './visualForm.js';
import { artRecipeFor } from './artCatalog.js';
import { CircleHelp, Code2, Ellipsis, Moon, Search, Sparkles } from 'lucide-react';
import type { CompanionActivity } from './types.js';

type AvatarCharacter = Pick<CompanionState, 'name' | 'form' | 'mood'>
  & Partial<Pick<CompanionState, 'xp' | 'appearance' | 'evolutions' | 'stageOutcomes' | 'lifecycle' | 'behaviorState'>>
  & Partial<Pick<PublicCompanion, 'growthStage' | 'visualForm'>>;

type ArtCharacter = AvatarCharacter & { id?: string; level?: number; growth?: { render?: PetArtRender; appearanceLevel?: number } };

const reactionMark: Record<LifecycleCareAction, string> = { feed: '🍎', play: '✦', cuddle: '♡', rest: 'Zz', explore: '🍃', clean: '✧', medicine: '♡' };
const activityCue = {
  thinking: { label: 'Thinking', Icon: Ellipsis },
  searching: { label: 'Searching', Icon: Search },
  working: { label: 'Working', Icon: Code2 },
  success: { label: 'Happy', Icon: Sparkles },
  error: { label: 'Confused', Icon: CircleHelp },
  sleeping: { label: 'Resting', Icon: Moon },
} as const;

export default function CompanionAvatar({ companion, small = false, decorative = false, reaction = '', activity, levelUp = false, walking = false, facing = 'right' }: { companion: ArtCharacter; small?: boolean; decorative?: boolean; reaction?: LifecycleCareAction | ''; activity?: CompanionActivity; levelUp?: boolean; walking?: boolean; facing?: 'left' | 'right' }) {
  const { t } = useCompanionLanguage();
  // Legacy preferences remain saved; runtime artwork uses the illustrated atlas.
  const appearance: CompanionAppearance = { ...(companion.appearance || { animated: true }), visualStyle: 'soft' as const, usePortrait: false };
  const visualForm = visualFormFor({ ...companion, xp: companion.xp || 0 });
  const { species, lifeStage, xpPath, xpTier } = visualForm;
  appearance.bodyColor ||= petArtPalette[species];
  appearance.accentColor ||= species === 'spirit' ? '#a9cbaa' : species === 'frog' ? '#AEDBF0' : '#F6A4B6';
  const savedRender = companion.growth?.render?.species === species ? companion.growth.render : undefined;
  const level = savedRender?.level ?? companion.growth?.appearanceLevel ?? companion.level ?? Math.floor(Math.max(0, companion.xp || 0) / 80) + 1;
  const artRecipe = artRecipeFor(species, xpPath, level);
  const growthShape = (level - 1) % 5;
  const growthRing = Math.floor((level - 1) / 5) % 5;
  const state = activity || (reaction ? (reaction === 'rest' ? 'sleeping' : 'success') : companion.behaviorState === 'resting' || companion.mood === 'sleepy' ? 'sleeping' : 'idle');
  const cue = state === 'idle' ? null : activityCue[state];
  return <div className={`companion-avatar species-${species} stage-${lifeStage} path-${xpPath} xp-tier-${xpTier} growth-shape-${growthShape} growth-ring-${growthRing} growth-${artRecipe.growthFamilyId} style-${appearance.visualStyle} ${levelUp ? 'level-up' : ''} ${appearance.animated ? '' : 'motion-paused'} ${small ? 'small' : ''} mood-${companion.mood} form-${companion.form} activity-${state} reaction-${reaction}`} data-art-recipe={artRecipe.id} data-growth-family={artRecipe.growthFamilyId} data-growth-level={artRecipe.level} style={{ '--creature-body': appearance.bodyColor || (species === 'child' ? '#f7d8be' : '#dcc6f2'), '--creature-accent': appearance.accentColor || (species === 'spirit' ? '#a9cbaa' : '#e9d0df'), '--creature-eye': appearance.eyeColor || '#41334d' }} role={decorative ? 'presentation' : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : `${companion.name || t('Your companion')}, ${t(companion.mood)}, ${cue ? t(cue.label) : t('Idle')}, ${t(appearance.visualStyle)}`}>
    <div className={`companion-avatar-motion face-${appearance.face || 'gentle'} silhouette-${appearance.silhouette || 'round'}`}>
      <SoftPet species={species} face={appearance.face || 'gentle'} activity={state} level={level} render={savedRender} silhouette={appearance.silhouette} lifeStage={companion.lifecycle?.stage || companion.growthStage || lifeStage} appearance={appearance} walking={walking && state === 'idle' && !levelUp} facing={facing} voiceTargetId={companion.id} reaction={reaction} growth={levelUp} />
    </div>
    <span className='companion-spark one'>✧</span><span className='companion-spark two'>✦</span><span className='companion-spark three'>·</span>
    {cue && !small && <span className='companion-activity-cue' aria-hidden='true'><cue.Icon size={14} strokeWidth={2.2} /><span>{t(cue.label)}</span></span>}
    {reaction && <span key={reaction} className='companion-care-reaction' aria-hidden='true'>{reactionMark[reaction]}</span>}
  </div>;
}

import { useState } from 'react';
import type { CareAction, CompanionState } from '../../../../shared/contracts.js';
import { useCompanionLanguage } from './companionLanguage.js';
import PixelCompanion from './PixelCompanion.js';
type AvatarCharacter = Pick<CompanionState, 'name' | 'form' | 'mood'> & Partial<Pick<CompanionState, 'portrait' | 'appearance' | 'evolutions'>>;

export default function CompanionAvatar({ companion, small = false, reaction = '' }: { companion: AvatarCharacter; small?: boolean; reaction?: CareAction | '' }) {
  const { t } = useCompanionLanguage();
  const [failedImage, setFailedImage] = useState('');
  const appearance = companion.appearance || { visualStyle: companion.portrait?.url ? 'pixel' : 'soft', animated: true, usePortrait: true };
  const image = appearance.visualStyle === 'pixel' && appearance.usePortrait && companion.portrait?.url !== failedImage ? companion.portrait?.url : null;
  const species = companion.appearance?.species || (companion.form === 'child' ? 'child' : companion.form === 'pet' ? 'bunny' : 'spirit');
  return <div className={`companion-avatar species-${species} style-${appearance.visualStyle} ${appearance.animated ? '' : 'motion-paused'} ${small ? 'small' : ''} mood-${companion?.mood || 'curious'} form-${companion?.form || 'pet'} reaction-${reaction}`} style={{ '--creature-body': companion.appearance?.bodyColor || (species === 'child' ? '#f7d8be' : '#d4c2f0'), '--creature-accent': companion.appearance?.accentColor || (species === 'spirit' ? '#c4dbbf' : '#e9d0df'), '--creature-eye': companion.appearance?.eyeColor || '#423452' }} role='img' aria-label={`${companion?.name || t('Your companion')}, ${t(companion?.mood || 'curious')}, ${t(appearance.visualStyle)}`}>
    <div className={`companion-avatar-motion face-${appearance.face || 'gentle'} silhouette-${appearance.silhouette || 'round'}`}>
    {image ? <img src={image} alt='' onError={() => setFailedImage(image)} /> : appearance.visualStyle === 'pixel' ? <PixelCompanion species={species} face={appearance.face || 'gentle'} /> : <div className='companion-creature'>
      <i className='creature-tail' /><i className='creature-wing left' /><i className='creature-wing right' />
      <i className='creature-ear left' /><i className='creature-ear right' />
      <div className='creature-body'><span className='creature-star'>✦</span><div className='creature-face'><i /><b /><i /></div><div className='creature-cheeks'><i /><i /></div></div>
      <i className='creature-foot left' /><i className='creature-foot right' />
    </div>}
    {companion.evolutions?.length > 0 && <span className={`companion-evolution-mark path-${companion.evolutions.at(-1).path}`} aria-hidden='true'>{companion.evolutions.at(-1).path === 'guardian' ? '♡' : companion.evolutions.at(-1).path === 'trickster' ? '✦' : '❧'}</span>}
    </div>
    <span className='companion-spark one'>✧</span><span className='companion-spark two'>✦</span><span className='companion-spark three'>·</span>
    {reaction && <span key={reaction} className='companion-care-reaction' aria-hidden='true'>{({ feed: '🍎', play: '✦', cuddle: '♡', rest: 'Zz', explore: '🍃' })[reaction]}</span>}
  </div>;
}

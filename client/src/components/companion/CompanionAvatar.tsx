import { useState } from 'react';
import type { CompanionState } from '../../../../shared/contracts.js';
import PixelCompanion from './PixelCompanion.js';
type AvatarCharacter = Pick<CompanionState, 'name' | 'form' | 'mood'> & Partial<Pick<CompanionState, 'portrait' | 'appearance'>>;

export default function CompanionAvatar({ companion, small = false }: { companion: AvatarCharacter; small?: boolean }) {
  const [failedImage, setFailedImage] = useState('');
  const appearance = companion.appearance || { visualStyle: companion.portrait?.url ? 'pixel' : 'soft', animated: true, usePortrait: true };
  const image = appearance.visualStyle === 'pixel' && appearance.usePortrait && companion.portrait?.url !== failedImage ? companion.portrait?.url : null;
  return <div className={`companion-avatar style-${appearance.visualStyle} ${appearance.animated ? '' : 'motion-paused'} ${small ? 'small' : ''} mood-${companion?.mood || 'curious'} form-${companion?.form || 'pet'}`} role='img' aria-label={`${companion?.name || 'Your companion'}, ${companion?.mood || 'curious'}, ${appearance.visualStyle}`}>
    <div className='companion-avatar-motion'>
    {image ? <img src={image} alt='' onError={() => setFailedImage(image)} /> : appearance.visualStyle === 'pixel' ? <PixelCompanion form={companion.form} /> : <div className='companion-creature'>
      <i className='creature-ear left' /><i className='creature-ear right' />
      <div className='creature-body'><span className='creature-star'>✦</span><div className='creature-face'><i /><b /><i /></div><div className='creature-cheeks'><i /><i /></div></div>
      <i className='creature-foot left' /><i className='creature-foot right' />
    </div>}
    </div>
    <span className='companion-spark one'>✧</span><span className='companion-spark two'>✦</span><span className='companion-spark three'>·</span>
  </div>;
}

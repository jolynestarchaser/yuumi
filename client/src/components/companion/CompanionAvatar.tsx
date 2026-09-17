import type { CompanionState } from '../../../../shared/contracts.js';
type AvatarCharacter = Pick<CompanionState, 'name' | 'form' | 'mood'> & Partial<Pick<CompanionState, 'portrait'>>;

export default function CompanionAvatar({ companion, small = false }: { companion: AvatarCharacter; small?: boolean }) {
  const image = companion?.portrait?.url;
  return <div className={`companion-avatar ${small ? 'small' : ''} mood-${companion?.mood || 'curious'} form-${companion?.form || 'pet'}`} role='img' aria-label={`${companion?.name || 'Your companion'}, ${companion?.mood || 'curious'}`}>
    {image ? <img src={image} alt='' /> : <div className='companion-creature'>
      <i className='creature-ear left' /><i className='creature-ear right' />
      <div className='creature-body'><span className='creature-star'>✦</span><div className='creature-face'><i /><b /><i /></div><div className='creature-cheeks'><i /><i /></div></div>
      <i className='creature-foot left' /><i className='creature-foot right' />
    </div>}
    <span className='companion-spark one'>✧</span><span className='companion-spark two'>✦</span><span className='companion-spark three'>·</span>
  </div>;
}

import { BookHeart, MessageCircle, PawPrint, Settings2, Sparkles } from 'lucide-react';
import { useCompanionLanguage } from './companionLanguage.js';

export const companionPages = [
  ['home', PawPrint, 'Care together'], ['chat', MessageCircle, 'Chat'],
  ['memories', BookHeart, 'Memories'], ['design', Settings2, 'Appearance'],
  ['personality', Sparkles, 'Personality'],
] as const;
export type CompanionPage = typeof companionPages[number][0];

export default function CompanionNavigation({ page, onSelect, alive }: {
  page: CompanionPage; onSelect: (page: CompanionPage) => void; alive: boolean;
}) {
  const { t } = useCompanionLanguage();
  return <nav className='companion-workspace-nav' aria-label={t('Our little companion')} onKeyDown={(event) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll('button'));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : (index + (event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1) + buttons.length) % buttons.length;
    buttons[next].focus();
  }}>
    {companionPages.filter(([key]) => alive || key === 'home' || key === 'chat' || key === 'memories').map(([key, Icon, label]) =>
      <button type='button' key={key} aria-current={page === key ? 'page' : undefined} onClick={() => onSelect(key)}><Icon size={20} aria-hidden='true' /><span>{t(label)}</span></button>)}
  </nav>;
}

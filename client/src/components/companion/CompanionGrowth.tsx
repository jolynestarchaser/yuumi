import type { PublicCompanion } from '../../../../shared/contracts.js';
import { useCompanionLanguage } from './companionLanguage.js';

export default function CompanionGrowth({ companion }: { companion: PublicCompanion }) {
  const { t } = useCompanionLanguage();
  const levelXp = companion.xp % 80;
  const nextEvolution = (Math.floor(companion.level / 3) + 1) * 3;
  const evolution = companion.evolutions?.at(-1);
  return <section className='companion-growth' aria-label={t('Growth')}>
    <div><strong>{t('Level')} {companion.level}</strong><span>{levelXp} {t("/ 80 EXP")}</span></div>
    <progress aria-label={t('Experience to next level')} value={levelXp} max={80} />
    <small>{t('Next evolution at level {level}', { level: nextEvolution })}</small>
    {evolution && <p className='companion-evolution-badge'>{t('Evolved')} · {t(evolution.species)} · {t(evolution.path)} ✦</p>}
    <p>{t('Care +8 EXP · Chat +4 EXP. Species and the way you care shape each random evolution.')}</p>
    {Boolean(companion.evolutions?.length) && <details><summary>{t('Evolution history')}</summary>{[...companion.evolutions].reverse().map((entry) => <p key={entry.level}>{t('Level')} {entry.level} · {t(entry.species)} · {t(entry.path)}</p>)}</details>}
  </section>;
}

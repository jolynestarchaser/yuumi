import type { PublicCompanion } from '../../../../shared/contracts.js';
import { useCompanionLanguage } from './companionLanguage.js';

export default function CompanionGrowth({ companion }: { companion: PublicCompanion }) {
  const { t } = useCompanionLanguage();
  const levelXp = companion.xp % 80;
  const nextEvolution = companion.level < 3 ? 3 : companion.level < 6 ? 6 : companion.level < 10 ? 10 : companion.level + 5;
  const evolution = companion.evolutions?.at(-1);
  return <section className='companion-growth' aria-label={t('Growth')}>
    <div><strong>{t('Level')} {companion.level}</strong><span>{levelXp} {t("/ 80 EXP")}</span></div>
    <progress aria-label={t('Experience to next level')} value={levelXp} max={80} />
    <small>{t('Next evolution at level {level}', { level: nextEvolution })}</small>
    <p className='companion-form-label'>{t(companion.growthStage)}</p>
    <p>{t('Meaningful care +8 EXP, fulfilled request +4, chat +4. Daily care 40 · chat 12. The way you care shapes their next body and movement.')}</p>
    {evolution && <details><summary>{t('Evolution history')}</summary>{[...companion.evolutions].reverse().map((entry) => <p key={entry.level}>{t('Level')} {entry.level} · {t(entry.species)} · {t(entry.path)}</p>)}</details>}
  </section>;
}

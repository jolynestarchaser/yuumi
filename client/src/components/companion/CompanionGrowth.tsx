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
    <p className='companion-form-label'>{t(companion.growthStage || companion.stage)} · {companion.simulatedAgeDays || 0} {t('days together')}</p>
    <p>{t('Meaningful care +8 EXP, fulfilled request +4, chat +4 (unlimited). The way you care shapes their next body and movement.')}</p>
    {companion.nextStageRequirement && (
      <div className='companion-next-stage'>
        <small>
          {t('Next stage requirements: {reqDays} days age ({currentCare}/{reqCare} care)', {
            reqDays: companion.nextStageRequirement.minAgeDays,
            currentCare: companion.nextStageRequirement.currentCareCount,
            reqCare: companion.nextStageRequirement.requiredCareCount,
          })}
        </small>
        <progress
          aria-label={t('Care interactions toward next stage')}
          value={companion.nextStageRequirement.currentCareCount}
          max={companion.nextStageRequirement.requiredCareCount}
        />
      </div>
    )}
    {companion.stage === 'elder' && (
      <small className='companion-elder-note'>{t('Elder stage: Peaceful retirement is available in the memorial garden.')}</small>
    )}
    {evolution && <details><summary>{t('Evolution history')}</summary>{[...companion.evolutions].reverse().map((entry) => <p key={entry.level}>{t('Level')} {entry.level} · {t(entry.species)} · {t(entry.path)}</p>)}</details>}
  </section>;
}

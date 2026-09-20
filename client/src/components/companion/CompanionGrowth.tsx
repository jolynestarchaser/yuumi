import type { PublicCompanion } from '../../../../shared/contracts.js';
import { useCompanionLanguage } from './companionLanguage.js';

export default function CompanionGrowth({ companion }: { companion: PublicCompanion }) {
  const { t } = useCompanionLanguage();
  const levelXp = companion.xp % 80;
  const evolution = companion.evolutions?.at(-1);
  const lifecycle = companion.lifecycle;
  const protectionUntil = lifecycle?.protectionUntil ? new Date(lifecycle.protectionUntil) : null;
  const requirements = lifecycle?.stage === 'hatchling' ? { hours: 48, care: 6, stage: 'child' } : lifecycle?.stage === 'child' ? { hours: 168, care: 18, stage: 'juvenile' } : lifecycle?.stage === 'juvenile' ? { hours: 336, care: 36, stage: 'grown' } : lifecycle?.stage === 'grown' ? { hours: 1440, care: 0, stage: 'elder' } : null;
  return <section className='companion-growth' aria-label={t('Growth')}>
    <div><strong>{t('Level')} {companion.level}</strong><span>{levelXp} {t("/ 80 EXP")}</span></div>
    <progress aria-label={t('Experience to next level')} value={levelXp} max={80} />
    <p className='companion-form-label'>{t(companion.growthStage)}</p>
    {lifecycle && <p>{t('Generation')} {lifecycle.generation} · {t(lifecycle.lifeStatus)} · {t(lifecycle.healthCondition)}{companion.automaticallyPaused ? ` · ${t('Paused while away')}` : ''}</p>}
    {protectionUntil && protectionUntil.getTime() > Date.now() && <small>{t('Return protection active until {time}', { time: protectionUntil.toLocaleString() })}</small>}
    {requirements && lifecycle?.lifeStatus === 'alive' && <><progress aria-label={t('Age progress to next stage')} value={Math.min(lifecycle.simulatedAgeHours, requirements.hours)} max={requirements.hours} /><small>{t('Next stage: {stage} · age {age}/{target} hours · care {care}/{careTarget}', { stage: t(requirements.stage), age: Math.floor(lifecycle.simulatedAgeHours), target: requirements.hours, care: lifecycle.stageCareCount, careTarget: requirements.care })}</small></>}
    <p>{t('Meaningful care +8 EXP, fulfilled request +4, chat +4. Valid rewards have no daily XP cap.')}</p>
    {Boolean(companion.stageOutcomes?.length) && <details><summary>{t('Lifecycle history')}</summary>{[...(companion.stageOutcomes || [])].reverse().map((entry) => <p key={entry.id}>{t(entry.stage)} · {new Date(entry.at).toLocaleDateString()}</p>)}</details>}
    {evolution && <details><summary>{t('Evolution history')}</summary>{[...companion.evolutions].reverse().map((entry) => <p key={entry.level}>{t('Level')} {entry.level} · {t(entry.species)} · {t(entry.path)}</p>)}</details>}
  </section>;
}

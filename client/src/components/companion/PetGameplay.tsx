import { useState } from 'react';
import type { PetCapability, PetRenderSpec, PublicCompanion } from '../../../../shared/contracts.js';
import type { CompanionAct } from './types.js';
import CompanionAvatar from './CompanionAvatar.js';
import { useCompanionLanguage } from './companionLanguage.js';

const capabilityFamily = (id: PetCapability) => id === 'greeting' ? 'rhythm' as const : id === 'water' ? 'explore' as const : 'find' as const;

export default function PetGameplay({ companion, busy, act }: { companion: PublicCompanion; busy: string; act: CompanionAct }) {
  const { t, language } = useCompanionLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const growth = companion.growth;
  if (!growth) return null;
  const plan = growth.activePlan;
  const progress = plan ? Math.max(0, Math.min(1, (growth.appearanceLevel - plan.fromLevel) / (plan.toLevel - plan.fromLevel))) : 1;
  const selected = growth.history.find((entry) => entry.growthEventId === selectedId);
  const pending = growth.history.filter((entry) => growth.pendingPresentationIds.includes(entry.growthEventId));
  const session = growth.activity;
  const expired = session && new Date(session.expiresAt).getTime() <= Date.now();
  const nextXp = growth.nextThreshold ? growth.nextThreshold - growth.levelThreshold : 1;
  const snapshot = (render: PetRenderSpec): PublicCompanion => ({ ...companion,
    // Compatibility adapter for old artwork; renderer integration should prefer growth.render.
    xp: (render.level - 1) * 80, level: render.level,
    growth: { ...growth, render, appearanceLevel: render.level },
    visualForm: { ...companion.visualForm, xpTier: render.level >= 10 ? 3 : render.level >= 6 ? 2 : render.level >= 3 ? 1 : 0 },
  });
  return <section className='companion-growth' aria-label={t('Growth')}>
    <h4 className='companion-growth-heading'>{t('Growth')}</h4>
    <div><strong>{t('Level')} {companion.level}</strong><span>{growth.nextThreshold ? `${companion.xp - growth.levelThreshold} / ${nextXp} XP` : t('Current chapter complete')}</span></div>
    <progress aria-label={t('Experience to next level')} value={growth.nextThreshold ? Math.min(nextXp, companion.xp - growth.levelThreshold) : 1} max={nextXp} />
    <p>{t('Age: {hours} hours', { hours: Math.floor(growth.ageHours) })} · {t(companion.growthStage)}</p>
    {!growth.ageVerified && <p>{t('Age is recorded from migration; the original birthday is unknown.')}</p>}
    <p>{t('Today: {xp}/{cap} XP', { xp: growth.dailyXp, cap: growth.dailyXpCap })}</p>
    {growth.dailyXp >= growth.dailyXpCap && <p role='status'>{t('Today’s growth rewards are complete. We can still spend time together.')}</p>}
    {plan && <><p>{t('Growing {part} · Lv{from}–{to}', { part: t(plan.growthFamilyId), from: plan.fromLevel, to: plan.toLevel })}</p><progress aria-label={t('Growth segment progress')} value={progress} max={1} /><small>{t('Care still changes the final details; the growing feature stays.')}</small></>}
    {growth.contentBlocked && <p role='status'>{t('Growth artwork is unavailable. Earned XP is saved; the last valid form remains.')}</p>}
    {pending.length > 0 && <div role='status'><p>{t('{count} new growth steps', { count: pending.length })}</p><button type='button' className='companion-secondary' disabled={Boolean(busy)} onClick={() => setSelectedId(pending[0].growthEventId)}>{t('See growth')}</button><button type='button' className='companion-secondary' disabled={Boolean(busy)} onClick={async () => { if (await act({ action: 'growthAck', eventIds: pending.map((entry) => entry.growthEventId) })) setSelectedId(null); }}>{t('Skip to current form')}</button></div>}
    {selected && <div className='companion-thought' aria-live='polite'>
      <strong>{t('Level')} {selected.level} · {t(selected.kind)}</strong>
      <div className='companion-care'>
        <div><span>{t('Before')}</span><CompanionAvatar companion={snapshot(selected.before)} small /></div>
        <div><span>{t('After')}</span><CompanionAvatar companion={snapshot(selected.after)} small /></div>
      </div>
      <p>{selected.changedPartIds.map((id) => t(id)).join(', ')}{selected.rarity ? ` · ${t(selected.rarity)}` : ''}</p>
      {selected.reasonTags.length > 0 && <p>{t('Care increased the chances: {trends}. The outcome also includes randomness.', { trends: selected.reasonTags.map((axis) => t(axis)).join(', ') })}</p>}
      {selected.newCapabilityIds.map((id) => <button type='button' className='companion-secondary' key={id} disabled={Boolean(busy) || companion.needs.energy < 25} onClick={() => act({ action: 'startActivity', family: capabilityFamily(id), capability: id })}>{t('Try {ability}', { ability: t(id) })}</button>)}
      {companion.needs.energy < 25 && <p>{t('The new form is ready. Rest before trying its activity.')}</p>}
      <button type='button' className='companion-secondary' disabled={Boolean(busy)} onClick={async () => { if (await act({ action: 'growthAck', eventIds: [selected.growthEventId] })) { const next = pending.find((entry) => entry.presentationSequence > selected.presentationSequence); setSelectedId(next?.growthEventId || null); } }}>{t('Continue')}</button>
    </div>}
    <details><summary>{t('Growth history')}</summary>{growth.history.map((entry) => <p key={entry.growthEventId}><button type='button' className='companion-secondary' onClick={() => setSelectedId(entry.growthEventId)}>{t('Level')} {entry.level} · {t(entry.kind)}</button></p>)}</details>
    <details><summary>{t('Care trends')}</summary>{Object.entries(growth.careProfile).sort(([, a], [, b]) => b - a).map(([axis, weight]) => <p key={axis}>{t(axis)} · {Math.round(weight * 100)}%</p>)}<p>{t('Bond')} {Math.floor(growth.bond)} / 1000 · {t('Trust')} {Math.floor(growth.trust)} / 100</p>{growth.habitIds.map((id) => <p key={id}>{t(id)}</p>)}</details>
    <label>{t('Next growth plan')} <select value={growth.morphPreference} disabled={Boolean(busy)} onChange={(event) => act({ action: 'morphPreference', preference: event.target.value as 'gentle' | 'adventurous' })}><option value='gentle'>{t('Gentle')}</option><option value='adventurous'>{t('Adventurous')}</option></select></label>
    <details><summary>{t('Activities')}</summary>
      {!session || expired ? <div className='companion-care'>{(['rhythm', 'find', 'explore'] as const).map((family) => <button type='button' key={family} disabled={Boolean(busy)} onClick={() => act({ action: 'startActivity', family })}>{t(`activity.${family}`)}</button>)}</div> : <div>
        <p>{t(`activity.${session.family}`)} · {session.answers.length + 1} / {session.targets.length}{session.capability ? ` · ${t(session.capability)}` : ''}</p>
        <p>{t('Choose {target}', { target: session.targets[session.answers.length] + 1 })}</p>
        <div className='companion-care'>{[0, 1, 2].map((answer) => <button type='button' key={answer} disabled={Boolean(busy)} onClick={() => act({ action: 'activityStep', sessionId: session.sessionId, answer })}>{answer + 1}</button>)}</div>
      </div>}
      <p>{t('Completed play earns up to 30 XP; exploration up to 28. Repeated rewards diminish.')}</p>
    </details>
    <details><summary>{t('Talk without typing')}</summary><div className='companion-care'>{(['company', 'nature', 'quiet'] as const).map((choice) => <button type='button' key={choice} disabled={Boolean(busy)} onClick={() => act({ action: 'promptChoice', choice })}>{t(`prompt.${choice}`)}</button>)}</div></details>
    <small>{t('Rewards reset at {time}', { time: new Date(growth.nextRewardResetAt).toLocaleString(language === 'th' ? 'th-TH' : 'en-US') })}</small>
  </section>;
}

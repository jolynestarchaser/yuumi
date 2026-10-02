import type { CareVector, PetFormStyle, PetGrowthAudit, StoredCompanion } from '../../../shared/contracts.js';
import { lateChapter } from './petChapters.js';
import { loadPetForms, type AvailablePetForms } from './petFormCatalog.js';
import { petDraw, weightedChoice } from './petProgression.js';

/** Separate from the finite anatomy steps; no existing part or capability is replaced. */
export function applyPetFormLevel(state: StoredCompanion, level: number, profile: CareVector, now: Date, catalog: AvailablePetForms = loadPetForms()): boolean {
  const p = state.progression!;
  const chapter = lateChapter(level)!;
  const id = `${state._id || 'pet'}:chapter:${chapter.toLevel}`;
  const snapshotId = p.blockedSnapshot?.level === level ? p.blockedSnapshot.snapshotId : `${id}:context`;
  const frozen = p.blockedSnapshot?.level === level ? p.blockedSnapshot.profile : profile;
  const preference = p.blockedSnapshot?.level === level ? p.blockedSnapshot.preference || p.morphPreference : p.morphPreference;
  const block = (reason: string) => {
    p.contentBlocked = reason;
    p.blockedSnapshot = { level, snapshotId, profile: structuredClone(frozen), preference }; return false;
  };
  if (!p.formDecision || p.formDecision.plan.id !== id) {
    let pool = catalog.forms.filter((form) => form.species === p.render.species);
    if (!pool.length) return block('No validated compatible body rigs are available.');
    if (pool.some((form) => form.id !== p.render.bodyForm?.id)) pool = pool.filter((form) => form.id !== p.render.bodyForm?.id);
    const styles = (['nature', 'celestial', 'adventurer'] as PetFormStyle[]).filter((style) => pool.some((form) => form.style === style)).map((style) => ({
      id: style, weight: 1 + 4 * (style === 'nature' ? frozen.nature + frozen.calm : style === 'celestial' ? frozen.affection + frozen.balance : frozen.play + frozen.curiosity),
    }));
    const label = `${id}:${snapshotId}:${catalog.catalogVersion}`;
    const chosenStyle = weightedChoice(styles, petDraw(p.seedSecret, `${label}:style`)).id;
    const candidates = pool.map((form) => ({ id: form.id, style: form.style, body: form.body,
      weight: (p.recentFormIds?.slice(-2).includes(form.id) ? .4 : 1) * (preference === 'gentle' ? form.body === 'compact' ? 1.5 : .5 : form.body === 'agile' ? 1.5 : .5)
        * (.85 + .3 * petDraw(p.seedSecret, `${label}:chapter-jitter:${form.id}`)),
    }));
    const selected = weightedChoice(candidates.filter((entry) => entry.style === chosenStyle), petDraw(p.seedSecret, `${label}:body`));
    const form = pool.find((entry) => entry.id === selected.id)!;
    const selectedDetailIds = [...form.detailIds];
    // Labelled detail draws select a stable ordering supported by the selected rig.
    selectedDetailIds.sort((a, b) => petDraw(p.seedSecret, `${label}:detail:${a}`) - petDraw(p.seedSecret, `${label}:detail:${b}`) || a.localeCompare(b));
    const plan = { id, fromLevel: chapter.fromLevel, toLevel: chapter.toLevel, catalogVersion: catalog.catalogVersion,
      compatibleFormIds: pool.map((entry) => entry.id).sort(), precursorDetailIds: selectedDetailIds, snapshotId };
    p.formPlan = plan;
    p.formDecision = { plan, profile: structuredClone(frozen), preference, styles, candidates, selectedId: selected.id, selectedDetailIds };
    p.audit.push({ id: `${id}:plan`, kind: 'plan', snapshotId, at: now, profile: structuredClone(frozen), candidates, selectedId: selected.id,
      configVersion: p.configVersion, catalogVersion: catalog.catalogVersion, rngVersion: p.rngVersion });
  }
  const decision = p.formDecision;
  const available = catalog.forms.find((entry) => entry.id === decision.selectedId && entry.species === p.render.species);
  if (catalog.catalogVersion !== decision.plan.catalogVersion || !available || decision.selectedDetailIds.some((detail) => !available.detailIds.includes(detail))) return block('The saved chapter rig or detail is unavailable. Restore its original catalog to resume.');
  const before = structuredClone(p.render);
  const major = level === chapter.toLevel;
  const detailIds = decision.selectedDetailIds.slice(0, Math.min(9, chapter.step));
  p.render = { ...p.render, level,
    ...(major ? { bodyForm: { id: available.id, style: available.style, body: available.body, chapter: chapter.toLevel / 10 - 1, rendererVersion: available.rendererVersion }, detailIds, precursorProgress: undefined }
      : { precursorProgress: { planId: id, fromLevel: chapter.fromLevel, toLevel: chapter.toLevel, step: chapter.step, totalSteps: 10, detailIds } }),
  };
  const audit: PetGrowthAudit = { id: `${id}:${level}`, kind: major ? 'final' : 'plan', snapshotId: decision.plan.snapshotId, at: now,
    profile: decision.profile, candidates: decision.candidates, selectedId: decision.selectedId, configVersion: p.configVersion,
    catalogVersion: decision.plan.catalogVersion, rngVersion: p.rngVersion, formDecision: structuredClone(decision) };
  p.audit.push(audit);
  p.presentationSequence = (p.presentationSequence || 0) + 1;
  p.events.push({ growthEventId: `${state._id || 'pet'}:level:${level}`, level, kind: major ? 'evolution' : 'minor', planId: id,
    stepSpecId: major ? null : detailIds.at(-1) || null, beforeRenderRef: `${id}:${level}:before`, afterRenderRef: `${id}:${level}:after`,
    before, after: structuredClone(p.render), changedPartIds: major ? ['bodyForm', 'details'] : ['precursorProgress'], newCapabilityIds: [],
    presentationSequence: p.presentationSequence, appliedAt: now, acknowledgedAt: null, recipeId: major ? available.id : undefined, reasonTags: [],
  });
  if (major) { p.recentFormIds = [...(p.recentFormIds || []), available.id].slice(-2); p.formPlan = null; p.formDecision = null; }
  p.appearanceLevel = level; p.contentBlocked = null; p.blockedSnapshot = null;
  return true;
}

import { createHmac, randomBytes } from 'node:crypto';
import { CARE_AXES, FAMILIES, LIVE_LEVEL_CAP, PET_CATALOG_VERSION, PET_CONFIG_VERSION, PET_RNG_VERSION, SEGMENTS, familiesFor, petLevel, recipeId, vector, xpThreshold } from './petCatalog.js';
import type { CareVector, CompanionSpecies, PetGrowthAudit, PetGrowthFamily, PetGrowthPlan, PetProgression, PetRarity, PetRenderSpec, StoredCompanion } from '../../../shared/contracts.js';
import { careProfile } from './petCare.js';

const speciesFor = (state: StoredCompanion): CompanionSpecies => state.appearance?.species || (state.form === 'pet' ? 'bunny' : state.form === 'child' ? 'child' : 'spirit');
/** Independent labelled HMAC draws mapped to exactly representable uniform 53-bit values. */
export function petDraw(secret: string, label: string): number {
  const bytes = createHmac('sha256', secret).update(label).digest();
  return (bytes.readUIntBE(0, 6) * 32 + (bytes[6] >>> 3)) / 9007199254740992;
}
export function weightedChoice<T extends { id: string; weight: number }>(candidates: T[], draw: number): T {
  const sorted = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
  const total = sorted.reduce((sum, entry) => sum + entry.weight, 0);
  if (!sorted.length || !Number.isFinite(total) || total <= 0 || sorted.some((entry) => !Number.isFinite(entry.weight) || entry.weight < 0) || draw < 0 || draw >= 1) throw new Error('Invalid growth pool.');
  let cursor = draw * total;
  for (const candidate of sorted) { cursor -= candidate.weight; if (cursor < 0) return candidate; }
  return sorted.at(-1)!;
}
export function initializePetProgression(state: StoredCompanion, now: Date, legacy = false, secret = randomBytes(32).toString('hex')): StoredCompanion {
  if (state.progression) return state;
  const oldLevel = Math.floor(Math.max(0, state.xp) / 80) + 1;
  const baseline = legacy ? oldLevel : 1;
  const genome = vector(CARE_AXES.map((axis) => .25 + petDraw(secret, `genome:${axis}`) * .5));
  const species = speciesFor(state);
  const progression: PetProgression = {
    version: 1, seedSecret: secret, genome, ageVerified: Boolean(state.bornAt),
    configVersion: PET_CONFIG_VERSION, catalogVersion: PET_CATALOG_VERSION, rngVersion: PET_RNG_VERSION,
    appearanceLevel: baseline, legacyLevel: legacy ? oldLevel : null, legacyDiscoveryPending: legacy && Boolean(state.bornAt || state.xp > 0),
    tutorialGranted: legacy, morphPreference: 'gentle', pityCommonCount: 0,
    render: { species, level: baseline, catalogVersion: PET_CATALOG_VERSION, parts: {}, capabilityIds: [], legacy },
    plans: [], events: [], audit: [], days: [], bond: 0, trust: 60, habitIds: [],
    personality: { sociability: state.traits.affection / 100, energyDisposition: state.traits.playfulness / 100, curiosityDisposition: state.traits.curiosity / 100, boldness: .5, routinePreference: .5 },
    lastRewardAt: {}, restStartedAt: null, contentBlocked: null, activity: null,
  };
  // No invented old care evidence, RNG outcomes, or tutorial reward on migration.
  return { ...state, bornAt: legacy && !state.bornAt ? now : state.bornAt, xp: legacy ? Math.max(state.xp, xpThreshold(oldLevel)) : state.xp, progression,
    ...(state.lifecycle ? { lifecycle: { ...state.lifecycle, simulationAt: now, lastEngagementAt: now, lowNeedExposureHours: 0, healthCondition: 'well' as const } } : {}),
  };
}
const dot = (a: CareVector, b: CareVector) => CARE_AXES.reduce((sum, axis) => sum + a[axis] * b[axis], 0);
export function affinityWeight(profile: CareVector, affinity: CareVector, genome: CareVector, preference: 'gentle' | 'adventurous', family: PetGrowthFamily, personality?: PetProgression['personality'], factors: { novelty?: number; repeat?: number; jitter?: number; fullReshape?: boolean } = {}): number {
  const traitFit = personality ? (affinity.play * personality.energyDisposition + affinity.curiosity * personality.curiosityDisposition + affinity.affection * personality.sociability + affinity.calm * personality.routinePreference + affinity.nature * personality.boldness + affinity.balance * .5) : .5;
  const mode = factors.fullReshape ? preference === 'gentle' ? .5 : 1.5 : 1;
  return (1 + 4 * dot(profile, affinity)) * (1 + .7 * (dot(genome, affinity) - .5)) * (1 + .25 * traitFit)
    * (factors.novelty || 1) * (factors.repeat || 1) * (factors.jitter || 1) * mode;
}
function auditEntry(p: PetProgression, id: string, kind: 'plan' | 'final', snapshotId: string, profile: CareVector, candidates: { id: string; weight: number }[], selectedId: string, now: Date): PetGrowthAudit {
  return { id, kind, snapshotId, profile, candidates, selectedId, at: now, configVersion: p.configVersion, catalogVersion: p.catalogVersion, rngVersion: p.rngVersion };
}
export function applyPetGrowth(input: StoredCompanion, now = new Date()): StoredCompanion {
  if (!input.progression || !input.bornAt) return input;
  const state: StoredCompanion = { ...input, progression: structuredClone(input.progression) };
  const p = state.progression!;
  const liveProfile = careProfile(p, now);
  const target = petLevel(state.xp, p.legacyLevel);
  if (p.catalogVersion !== PET_CATALOG_VERSION || p.configVersion !== PET_CONFIG_VERSION || p.rngVersion !== PET_RNG_VERSION) {
    p.contentBlocked = 'Growth content version is unavailable.'; return state;
  }
  if (p.legacyDiscoveryPending) {
    const evidence = p.days.reduce((sum, day) => sum + day.evidence.reduce((total, entry) => total + entry.units, 0), 0);
    if (evidence < 6 || state.needs.fullness < 35 || state.needs.energy < 25 || state.needs.hygiene < 30) return state;
    // An explicit discovery, never backfilled historical milestones.
    p.legacyDiscoveryPending = false;
    p.render = { ...p.render, legacy: true, parts: { ...p.render.parts, paws: { step: 3, variant: 'soft' } }, capabilityIds: [...new Set([...p.render.capabilityIds, 'grasp' as const])] };
    p.events.push({ growthEventId: `legacy-discovery-${state._id || 'pet'}`, level: p.appearanceLevel, kind: 'evolution', planId: 'legacy-discovery', stepSpecId: null,
      beforeRenderRef: 'legacy-baseline', afterRenderRef: 'legacy-discovery-v1.1', before: input.progression.render, after: structuredClone(p.render), changedPartIds: ['paws'], newCapabilityIds: ['grasp'], presentationSequence: 1, appliedAt: now, acknowledgedAt: null, reasonTags: [] });
  }
  if (p.legacyDiscoveryPending) return state;
  for (let level = p.appearanceLevel + 1; level <= target; level++) {
    const segment = SEGMENTS.find((entry) => level > entry.from && level <= entry.to);
    if (!segment) { p.contentBlocked = 'This growth segment is not available yet.'; break; }
    const segmentId = `seg${String(segment.from).padStart(2, '0')}_${String(segment.to).padStart(2, '0')}`;
    let plan = p.plans.find((entry) => entry.segmentId === segmentId);
    const snapshotId = p.blockedSnapshot?.level === level ? p.blockedSnapshot.snapshotId : `${state._id || 'pet'}:${level}:${state.revision}:${p.days.at(-1)?.xp || 0}`;
    const profile = p.blockedSnapshot?.level === level ? p.blockedSnapshot.profile : liveProfile;
    const block = (reason: string) => { p.contentBlocked = reason; p.blockedSnapshot = { level, snapshotId, profile: structuredClone(profile) }; if (plan) plan.status = 'contentBlocked'; };
    if (!plan) {
      const candidates = familiesFor(p.render.species, segment.to).map((id) => ({ id, weight: affinityWeight(profile, FAMILIES[id].affinity, p.genome, p.morphPreference, id, p.personality, { jitter: .85 + .3 * petDraw(p.seedSecret, `${segmentId}:${snapshotId}:plan-jitter:${id}`) }) }));
      if (!candidates.length) { block('No compatible growth family.'); break; }
      const family = weightedChoice(candidates, petDraw(p.seedSecret, `${segmentId}:${snapshotId}:plan:${p.configVersion}`)).id;
      plan = {
        planId: `${state._id || 'pet'}:${segmentId}`, segmentId, fromLevel: segment.from, toLevel: segment.to,
        growthFamilyId: family, continuityTags: [family, 'soft-outline'],
        minorStepSpecIds: Object.fromEntries(Array.from({ length: segment.to - segment.from - 1 }, (_, i) => [String(segment.from + i + 1), `${p.render.species}_${family}_step${i + 1}_v1.1`])),
        allowedFinalRecipeIds: FAMILIES[family].variants.map((entry) => recipeId(p.render.species, family, segment.to, entry.id)),
        fallbackRecipeId: recipeId(p.render.species, family, segment.to, 'basic'), planSnapshotId: snapshotId,
        configVersion: p.configVersion, catalogVersion: p.catalogVersion, rngVersion: p.rngVersion, status: 'active',
      };
      p.plans.push(plan);
      p.audit.push(auditEntry(p, plan.planId, 'plan', snapshotId, profile, candidates, family, now));
    }
    const family = plan.growthFamilyId;
    const spec = FAMILIES[family];
    const before = structuredClone(p.render);
    const major = level === segment.to;
    const step = level - segment.from;
    let variant: PetRenderSpec['parts'][PetGrowthFamily]['variant'] = 'neutral';
    let rarity: PetRarity | undefined;
    let selectedRecipe: string | undefined;
    let reasonAffinity = spec?.affinity;
    if (!spec || !plan.minorStepSpecIds[String(level)] && !major || plan.catalogVersion !== p.catalogVersion) { block('A growth step is missing.'); break; }
    if (major) {
      const pool = spec.variants.filter((entry) => plan!.allowedFinalRecipeIds.includes(recipeId(p.render.species, family, level, entry.id)));
      if (pool.length < 3 || !pool.some((entry) => recipeId(p.render.species, family, level, entry.id) === plan!.fallbackRecipeId)) { block('A continuous final recipe is missing.'); break; }
      const tierWeights = p.pityCommonCount >= 3 ? { common: 0, uncommon: 95, rare: 5 } : { common: 70, uncommon: 25, rare: 5 };
      const tiers = (['common', 'uncommon', 'rare'] as const).filter((tier) => pool.some((entry) => entry.tier === tier) && tierWeights[tier] > 0).map((id) => ({ id, weight: tierWeights[id] }));
      const label = `${plan.planId}:${snapshotId}:${p.configVersion}`;
      rarity = tiers.length ? weightedChoice(tiers, petDraw(p.seedSecret, `${label}:tier`)).id : 'common';
      const recentRoutes = p.events.filter((entry) => entry.kind === 'evolution').slice(-2).map((entry) => entry.after.parts[entry.changedPartIds[0]]?.variant);
      const candidates = pool.filter((entry) => entry.tier === rarity).map((entry) => {
        const id = recipeId(p.render.species, family, level, entry.id);
        return { id, weight: affinityWeight(profile, entry.affinity, p.genome, p.morphPreference, family, p.personality,
          { novelty: p.events.some((event) => event.recipeId === id) ? 1 : 1.25, repeat: recentRoutes.length === 2 && recentRoutes.every((route) => route === entry.variant) ? .6 : 1, jitter: .85 + .3 * petDraw(p.seedSecret, `${label}:recipe-jitter:${id}`) }) };
      });
      const chosen = tiers.length ? weightedChoice(candidates, petDraw(p.seedSecret, `${label}:recipe`)).id : plan.fallbackRecipeId;
      variant = pool.find((entry) => recipeId(p.render.species, family, level, entry.id) === chosen)!.variant;
      selectedRecipe = chosen;
      reasonAffinity = pool.find((entry) => recipeId(p.render.species, family, level, entry.id) === chosen)!.affinity;
      p.pityCommonCount = rarity === 'common' ? p.pityCommonCount + 1 : 0;
      const total = tiers.reduce((sum, entry) => sum + entry.weight, 0);
      p.audit.push({ ...auditEntry(p, `${plan.planId}:final`, 'final', snapshotId, profile, candidates, chosen, now), effectiveTiers: Object.fromEntries(tiers.map((entry) => [entry.id, entry.weight / total])) });
      plan.status = 'completed';
    }
    const newCapabilities = major && !p.render.capabilityIds.includes(spec.capability) ? [spec.capability] : [];
    p.render = { ...p.render, level, parts: { ...p.render.parts, [family]: { step, variant } }, capabilityIds: [...p.render.capabilityIds, ...newCapabilities] };
    const eventId = `${state._id || 'pet'}:level:${level}`;
    p.events.push({ growthEventId: eventId, level, kind: major ? 'evolution' : 'minor', planId: plan.planId,
      stepSpecId: major ? null : plan.minorStepSpecIds[String(level)], beforeRenderRef: `${p.catalogVersion}:${eventId}:before`, afterRenderRef: `${p.catalogVersion}:${eventId}:after`,
      before, after: structuredClone(p.render), changedPartIds: [family], newCapabilityIds: newCapabilities,
      presentationSequence: p.events.length + 1, appliedAt: now, acknowledgedAt: null,
      ...(rarity ? { rarity, recipeId: selectedRecipe } : {}), reasonTags: CARE_AXES.filter((axis) => profile[axis] > 1 / 6 + .02 && reasonAffinity[axis] > 0).sort((a, b) => profile[b] * reasonAffinity[b] - profile[a] * reasonAffinity[a]).slice(0, 2),
    });
    if (!major) plan.status = 'active';
    p.appearanceLevel = level; p.contentBlocked = null; p.blockedSnapshot = null;
  }
  return state;
}

export function acknowledgeGrowth(state: StoredCompanion, eventIds: string[], now: Date): StoredCompanion {
  if (!state.progression || eventIds.some((id) => !state.progression!.events.some((entry) => entry.growthEventId === id))) throw Object.assign(new Error('Choose existing growth events.'), { status: 400 });
  return { ...state, progression: { ...state.progression, events: state.progression.events.map((entry) => eventIds.includes(entry.growthEventId) ? { ...entry, acknowledgedAt: entry.acknowledgedAt || now } : entry) } };
}

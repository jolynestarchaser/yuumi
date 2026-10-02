import { CARE_AXES, vector } from './petCatalog.js';
import type { CareVector, PetCareEvidence, PetProgression, PetRewardDay, Profile, StoredCompanion } from '../../../shared/contracts.js';

const HOUR = 3_600_000;
const definitions: Record<string, { xp: number; units: number; bond: number; vector: CareVector }> = {
  feed: { xp: 12, units: 1, bond: 2, vector: vector([0, 0, 0, 0, .4, .6]) },
  cuddle: { xp: 8, units: 1, bond: 3, vector: vector([.8, 0, 0, .2, 0, 0]) },
  clean: { xp: 10, units: 1, bond: 2, vector: vector([0, 0, 0, .6, 0, .4]) },
  rest: { xp: 8, units: 1, bond: 2, vector: vector([.1, 0, 0, .9, 0, 0]) },
  play: { xp: 30, units: 3, bond: 4, vector: vector([0, .8, .2, 0, 0, 0]) },
  explore: { xp: 28, units: 3, bond: 3, vector: vector([0, .1, .55, 0, .35, 0]) },
  chat: { xp: 12, units: 1, bond: 3, vector: vector([.5, 0, .5, 0, 0, 0]) },
  treat: { xp: 4, units: 1, bond: 2, vector: vector([1, 0, 0, 0, 0, 0]) },
};
export function rewardCalendar(now: Date, timezone = process.env.PET_REWARD_TIMEZONE || 'Asia/Bangkok') {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const dayId = (at: number) => formatter.format(new Date(at));
  const id = dayId(now.getTime());
  let low = now.getTime(), high = low + 30 * HOUR;
  // Find the next account-local date boundary, including DST transitions.
  while (high - low > 1) { const mid = Math.floor((low + high) / 2); if (dayId(mid) === id) low = mid; else high = mid; }
  return { id, nextResetAt: new Date(high) };
}
export function effectiveEvidence(day: PetRewardDay): PetCareEvidence[] {
  const raw = day.evidence;
  const sum = (rows: PetCareEvidence[]) => rows.reduce((total, entry) => total + entry.units, 0);
  const base = sum(raw.filter((entry) => entry.category !== 'treat' && entry.category !== 'chat'));
  const treat = sum(raw.filter((entry) => entry.category === 'treat'));
  const chat = sum(raw.filter((entry) => entry.category === 'chat'));
  // Enforce both 20% bounds together: capping chat must not inflate treat's share.
  const allowedTreat = Math.min(treat, (base + chat) / 4, base / 3);
  const allowedChat = Math.min(chat, (base + allowedTreat) / 4);
  const adjusted = raw.map((entry) => ({ ...entry, units: entry.units * (entry.category === 'treat' ? treat ? allowedTreat / treat : 0 : entry.category === 'chat' ? chat ? allowedChat / chat : 0 : 1) }));
  const total = sum(adjusted);
  return adjusted.map((entry) => ({ ...entry, units: entry.units * Math.min(1, total ? 30 / total : 1) }));
}
export function careProfile(p: PetProgression, now: Date): CareVector {
  const short = vector([0, 0, 0, 0, 0, 0]), long = vector([0, 0, 0, 0, 0, 0]);
  for (const day of p.days) for (const entry of effectiveEvidence(day)) {
    const age = Math.max(0, (now.getTime() - new Date(entry.at).getTime()) / HOUR);
    for (const axis of CARE_AXES) {
      if (age <= 72) short[axis] += entry.vector[axis] * entry.units * 2 ** (-age / 18);
      if (age <= 14 * 24) long[axis] += entry.vector[axis] * entry.units * 2 ** (-age / 120);
    }
  }
  const shortTotal = Object.values(short).reduce((a, b) => a + b, 18), longTotal = Object.values(long).reduce((a, b) => a + b, 18);
  return Object.fromEntries(CARE_AXES.map((axis) => [axis, .7 * (short[axis] + 3) / shortTotal + .3 * (long[axis] + 3) / longTotal])) as CareVector;
}
function finalizeDay(p: PetProgression, day: PetRewardDay, now: Date) {
  const evidence = effectiveEvidence(day);
  if (evidence.reduce((sum, entry) => sum + entry.units, 0) < 6) return;
  const profile = careProfile({ ...p, days: [day] }, now);
  const target = {
    sociability: Math.min(1, profile.affection * 3), energyDisposition: Math.min(1, profile.play * 3),
    curiosityDisposition: Math.min(1, profile.curiosity * 3), boldness: Math.min(1, (profile.play + profile.curiosity) * 1.5), routinePreference: Math.min(1, profile.calm * 3),
  };
  for (const key of Object.keys(target) as (keyof typeof target)[]) p.personality[key] += Math.max(-.02, Math.min(.02, .04 * (target[key] - p.personality[key])));
}
export function ensureRewardDay(p: PetProgression, now: Date): PetRewardDay {
  const current = p.days.at(-1);
  if (current && new Date(current.nextResetAt).getTime() > now.getTime()) return current;
  if (current) finalizeDay(p, current, now);
  const calendar = rewardCalendar(now);
  const day: PetRewardDay = { ...calendar, xp: 0, bond: 0, trust: 0, counts: {}, diversityGranted: false, evidence: [] };
  p.days = [...p.days.filter((entry) => now.getTime() - new Date(entry.nextResetAt).getTime() < 14 * 24 * HOUR), day];
  return day;
}
/** Call only for confirmed game actions; operation receipts guarantee one award. */
export function rewardPetAction(input: StoredCompanion, category: string, now: Date, eventId: string, actor?: Profile, eligible = true, overrideVector?: CareVector): StoredCompanion {
  if (!input.progression) return input;
  const p = structuredClone(input.progression);
  const day = ensureRewardDay(p, now);
  const definition = definitions[category];
  const previousAt = p.lastRewardAt[category];
  const cooldown = category === 'chat' ? 10 * 60_000 : 60_000;
  if (!definition || !eligible || previousAt && now.getTime() - new Date(previousAt).getTime() < cooldown || day.evidence.some((entry) => entry.eventId === eventId)) return { ...input, progression: p };
  const count = day.counts[category] || 0;
  const multiplier = count < 2 ? 1 : count < 5 ? .25 : 0;
  day.counts[category] = count + 1;
  p.lastRewardAt[category] = now;
  const reward = Math.min(240 - day.xp, Math.floor(definition.xp * multiplier));
  day.xp += reward;
  if (multiplier) day.evidence.push({ eventId, at: now, category, vector: overrideVector || definition.vector, units: definition.units * multiplier });
  const categories = new Set(day.evidence.filter((entry) => !['treat', 'chat', 'diversity'].includes(entry.category) && entry.units > 0).map((entry) => entry.category));
  if (categories.size >= 3 && !day.diversityGranted) { day.diversityGranted = true; day.evidence.push({ eventId: `${day.id}:diversity`, at: now, category: 'diversity', vector: vector([0, 0, 0, 0, 0, 1]), units: 2 }); }
  const bond = Math.min(30 - day.bond, definition.bond * multiplier);
  day.bond += bond; p.bond = Math.min(1000, p.bond + bond);
  const trust = Math.min(2 - day.trust, .5 * multiplier);
  day.trust += trust; p.trust = Math.min(100, p.trust + trust);
  const exploreDays = p.days.filter((entry) => (entry.counts.explore || 0) > 0);
  if (exploreDays.length >= 3 && exploreDays.reduce((sum, entry) => sum + Math.min(5, entry.counts.explore), 0) >= 5 && !p.habitIds.includes('bring-leaf')) p.habitIds = [...p.habitIds, 'bring-leaf'].slice(-3);
  return { ...input, xp: input.xp + reward, progression: p,
    traits: { curiosity: p.personality.curiosityDisposition * 100, affection: p.personality.sociability * 100, playfulness: p.personality.energyDisposition * 100 },
    bonds: actor && multiplier ? { ...input.bonds, [actor]: input.bonds[actor] + 1 } : input.bonds };
}

export function grantTutorial(input: StoredCompanion, now: Date): StoredCompanion {
  if (!input.progression || input.progression.tutorialGranted) return input;
  return { ...input, xp: input.xp + 125, progression: { ...input.progression, tutorialGranted: true } };
}

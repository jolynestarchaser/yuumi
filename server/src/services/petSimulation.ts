import type { CompanionGrowthStage, StoredCompanion } from '../../../shared/contracts.js';
const HOUR = 3_600_000;
const bounded = (value: number) => Math.max(0, Math.min(100, value));
export function petAgeStage(hours: number): CompanionGrowthStage {
  return hours < 24 ? 'hatchling' : hours < 168 ? 'child' : hours < 720 ? 'juvenile' : hours < 1440 ? 'grown' : 'elder';
}
export function simulatePet(input: StoredCompanion, now: Date) {
  if (!input.lifecycle || !input.bornAt || input.archivedAt || input.lifecycle.lifeStatus !== 'alive') return { state: input, automaticallyPaused: false };
  const life = input.lifecycle;
  const clock = new Date(life.simulationAt).getTime(), at = now.getTime();
  if (!Number.isFinite(clock) || !Number.isFinite(at)) throw new Error('Invalid pet clock.');
  if (at <= clock) return { state: input, automaticallyPaused: false };
  const deadline = new Date(life.lastEngagementAt).getTime() + 12 * HOUR;
  const end = Math.max(clock, Math.min(at, deadline));
  const hours = (end - clock) / HOUR;
  const restEnd = input.behaviorState === 'resting' && input.restUntil ? new Date(input.restUntil).getTime() : clock;
  const restHours = Math.max(0, Math.min(end, restEnd) - clock) / HOUR;
  const awake = hours - restHours;
  const assisted = at >= deadline;
  const needs = {
    fullness: bounded(input.needs.fullness - 4 * awake - 2 * restHours), energy: bounded(input.needs.energy - 3 * awake + 12 * restHours),
    hygiene: bounded(input.needs.hygiene - 1.5 * hours), joy: bounded(50 + (input.needs.joy - 50) * Math.exp(-hours / 8)),
    comfort: bounded(65 + (input.needs.comfort - 65) * Math.exp(-hours / 12)), health: 100,
  };
  if (assisted) { needs.fullness = Math.max(35, needs.fullness); needs.energy = Math.max(60, needs.energy); needs.hygiene = Math.max(35, needs.hygiene); needs.joy = Math.max(50, needs.joy); needs.comfort = Math.max(65, needs.comfort); }
  const ageHours = Math.max(0, (at - new Date(input.bornAt).getTime()) / HOUR);
  return { state: { ...input, needs, needsUpdatedAt: now, behaviorState: restEnd > at ? 'resting' as const : 'active' as const, restUntil: restEnd > at ? input.restUntil : null,
    lifecycle: { ...life, simulationAt: now, simulatedAgeHours: ageHours, stage: petAgeStage(ageHours), healthCondition: 'well' as const, lowNeedExposureHours: 0 } }, automaticallyPaused: assisted };
}

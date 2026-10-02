/** Chapters use XP levels only; biological age is deliberately absent. */
export function lateChapter(level: number) {
  if (!Number.isSafeInteger(level) || level < 1) throw new Error('Invalid pet level.');
  if (level <= 10) return null;
  const fromLevel = 10 + Math.floor((level - 11) / 10) * 10;
  if (!Number.isSafeInteger(fromLevel + 10)) throw new Error('Pet chapter overflow.');
  return { fromLevel, toLevel: fromLevel + 10, step: level - fromLevel };
}

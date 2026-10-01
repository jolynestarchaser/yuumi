export interface MessageDay {
  day: string;
  senders: string[];
}

export function bangkokDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function messageStreak(days: MessageDay[], now = new Date()) {
  const today = bangkokDay(now);
  const yesterday = new Date(`${today}T00:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const previousDay = yesterday.toISOString().slice(0, 10);
  const byDay = new Map(days.map((row) => [row.day, row.senders]));
  const todaySenders = byDay.get(today) || [];
  let cursor = byDay.has(today) ? today : previousDay;
  let count = 0;
  while (byDay.has(cursor)) {
    count += 1;
    const date = new Date(`${cursor}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    cursor = date.toISOString().slice(0, 10);
  }
  return { count, day: today, today: { joe: todaySenders.includes('joe'), focus: todaySenders.includes('focus') } };
}

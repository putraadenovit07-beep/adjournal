export function fRp(v: number): string {
  return 'Rp ' + Math.round(v).toLocaleString('id-ID');
}

export function fN(v: number): string {
  return v.toLocaleString('id-ID');
}

export function fPct(v: number): string {
  return v.toFixed(2) + '%';
}

export function calcProfit(e: { spend: number; revenue: number }): number {
  return (e.revenue || 0) - (e.spend || 0);
}

export function calcROI(e: { spend: number; revenue: number }): number {
  const p = calcProfit(e);
  return e.spend > 0 ? (p / e.spend) * 100 : 0;
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round(Math.abs(db - da) / 86400000);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function getMilestoneWindow(milestones: { clicks: number; days: number }[], idx: number) {
  let fromDay = 0;
  for (let i = 0; i < idx; i++) fromDay += milestones[i].days;
  return { fromDay, toDay: fromDay + milestones[idx].days - 1 };
}

export function getMilestoneInfo(
  ms: { clicks: number; days: number },
  idx: number,
  allMs: { clicks: number; days: number }[],
  start: string,
  today: string
) {
  const win = getMilestoneWindow(allMs, idx);
  const startDate = start ? addDays(start, win.fromDay) : null;
  const endDate = start ? addDays(start, win.toDay) : null;
  let status: 'upcoming' | 'active' | 'done' = 'upcoming';
  let daysLeft: number | null = null;
  let daysUntilStart: number | null = null;
  let daysPassed = 0;

  if (startDate && endDate) {
    if (today > endDate) {
      status = 'done';
      daysPassed = ms.days;
    } else if (today >= startDate) {
      status = 'active';
      daysLeft = daysBetween(today, endDate) + 1;
      daysPassed = daysBetween(startDate, today) + 1;
    } else {
      daysUntilStart = daysBetween(today, startDate);
    }
  }

  let pct = 0;
  if (status === 'done') pct = 100;
  else if (status === 'active') pct = Math.min(100, Math.round(daysPassed / ms.days * 100));

  return { status, startDate, endDate, pct, daysLeft, daysUntilStart, totalDays: ms.days, daysPassed };
}

export function formatDate(): string {
  const d = new Date();
  const dn = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const mn = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return dn[d.getDay()] + ', ' + d.getDate() + ' ' + mn[d.getMonth()] + ' ' + d.getFullYear();
}

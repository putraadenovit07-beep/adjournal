export interface Campaign {
  id: number;
  name: string;
  platform: string;
  startdate: string;
  desc: string;
}

export interface Entry {
  id: number;
  campaignId: number;
  date: string;
  spend: number;
  adclicks: number;
  impressions: number;
  revenue: number;
  note: string;
}

export interface Milestone {
  clicks: number;
  days: number;
}

export interface Goals {
  modal: number;
  start: string;
  milestones: Milestone[];
  locked: boolean;
}

const CAMPAIGNS_KEY = 'adj_campaigns';
const DB_KEY = 'adj_db';
const GOALS_KEY = 'adj_goals';

export function loadCampaigns(): Campaign[] {
  try {
    return JSON.parse(localStorage.getItem(CAMPAIGNS_KEY) || '[]');
  } catch { return []; }
}

export function saveCampaigns(data: Campaign[]): void {
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(data));
}

export function loadEntries(): Entry[] {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY) || '[]');
  } catch { return []; }
}

export function saveEntries(data: Entry[]): void {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

export function loadGoals(): Goals {
  try {
    const saved = JSON.parse(localStorage.getItem(GOALS_KEY) || 'null');
    if (saved) return saved;
  } catch {}
  return { modal: 0, start: '', milestones: [], locked: false };
}

export function saveGoals(data: Goals): void {
  localStorage.setItem(GOALS_KEY, JSON.stringify(data));
}

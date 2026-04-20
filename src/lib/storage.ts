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

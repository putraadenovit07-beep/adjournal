import { getToken, getGistId, setGistId, setUsername } from './auth';
import type { Campaign, Entry, Goals, Payout } from './storage';

const GIST_FILENAME = 'adjournal-data.json';
const GIST_DESC = 'AdJournal Database';

export type ThemeName = 'default' | 'adsense';

export interface ProfileSettings {
  hideModalAwal?: boolean;
  hideRecentCampaigns?: boolean;
  theme?: ThemeName;
  telegramEnabled?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
}

export interface ProfileData {
  campaigns: Campaign[];
  entries: Entry[];
  goals: Goals;
  settings?: ProfileSettings;
  payouts?: Payout[];
}

export interface GlobalModalConfig {
  enabled: boolean;
  amount: number;
  currency: 'idr' | 'usd';
  usdAmount?: number;
  profileOrder: string[];
}

export interface GistData {
  profiles: Record<string, ProfileData>;
  version: number;
  globalModal?: GlobalModalConfig;
}

const EMPTY_GOALS: Goals = { modal: 0, start: '', milestones: [], locked: false };

export const EMPTY_SETTINGS: ProfileSettings = {
  hideModalAwal: false,
  hideRecentCampaigns: false,
  theme: 'default',
  telegramEnabled: false,
  telegramBotToken: '',
  telegramChatId: '',
};

/**
 * Recompute each profile's modal under the global "shared pool" mode.
 * All accounts share the same topup pool; each account's modal reflects
 * total_pool - sum(spend of OTHER accounts), so its sisa (modal - own_spend)
 * equals total_pool - total_spend across all accounts. This matches the
 * actual remaining balance shown by the ad provider (e.g. dao.ad).
 *
 * Returns a new GistData with profiles' goals.modal updated. If global
 * modal is disabled or absent, the gist is returned unchanged.
 */
export function recomputeGlobalModalCascade(gist: GistData): GistData {
  const gm = gist.globalModal;
  if (!gm?.enabled || !gm.amount) return gist;

  const total = gm.amount;
  const profileNames = Object.keys(gist.profiles);

  const spendByProfile: Record<string, number> = {};
  let totalSpend = 0;
  for (const name of profileNames) {
    const s = (gist.profiles[name]?.entries || []).reduce((acc, e) => acc + (e.spend || 0), 0);
    spendByProfile[name] = s;
    totalSpend += s;
  }

  const updatedProfiles = { ...gist.profiles };
  for (const name of profileNames) {
    const otherSpend = totalSpend - spendByProfile[name];
    const myModal = Math.max(0, total - otherSpend);
    const existing = updatedProfiles[name];
    if (!existing) continue;
    updatedProfiles[name] = {
      ...existing,
      goals: { ...existing.goals, modal: myModal },
    };
  }

  return { ...gist, profiles: updatedProfiles };
}

export const EMPTY_PROFILE: ProfileData = {
  campaigns: [],
  entries: [],
  goals: EMPTY_GOALS,
  settings: { ...EMPTY_SETTINGS },
  payouts: [],
};

const EMPTY_GIST: GistData = { profiles: {}, version: 0 };

function headers() {
  const token = getToken();
  return {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

export async function validateToken(token: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.login as string;
  } catch { return null; }
}

async function fetchGist(gistId: string): Promise<GistData | null> {
  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, { headers: headers() });
    if (!res.ok) return null;
    const json = await res.json();
    const file = json.files?.[GIST_FILENAME];
    if (!file?.content) return null;
    const parsed = JSON.parse(file.content);
    if (parsed.campaigns && !parsed.profiles) {
      return {
        profiles: {
          'Akun Utama': {
            campaigns: parsed.campaigns || [],
            entries: parsed.entries || [],
            goals: parsed.goals || EMPTY_GOALS,
          }
        },
        version: parsed.version || 0,
      };
    }
    return parsed as GistData;
  } catch { return null; }
}

async function createGist(data: GistData): Promise<string> {
  const res = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      description: GIST_DESC,
      public: false,
      files: { [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) } }
    })
  });
  if (!res.ok) throw new Error('Gagal membuat Gist');
  const json = await res.json();
  return json.id as string;
}

export async function initDb(): Promise<GistData> {
  const cachedId = getGistId();
  if (cachedId) {
    const data = await fetchGist(cachedId);
    if (data) return data;
  }

  try {
    const res = await fetch('https://api.github.com/gists?per_page=30', { headers: headers() });
    if (res.ok) {
      const gists = await res.json();
      const found = (gists as Array<{ id: string; description: string; files: Record<string, unknown> }>)
        .find(g => g.description === GIST_DESC && g.files[GIST_FILENAME]);
      if (found) {
        setGistId(found.id);
        const data = await fetchGist(found.id);
        if (data) return data;
      }
    }
  } catch {}

  const newId = await createGist(EMPTY_GIST);
  setGistId(newId);
  return EMPTY_GIST;
}

export async function writeDb(data: GistData): Promise<void> {
  let gistId = getGistId();
  if (!gistId) {
    gistId = await createGist(data);
    setGistId(gistId);
    return;
  }
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({
      files: { [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) } }
    })
  });
  if (!res.ok) {
    const err = await res.json();
    if ((err as { message?: string }).message?.includes('Not Found')) {
      const newId = await createGist(data);
      setGistId(newId);
    } else {
      throw new Error('Gagal menyimpan ke Gist');
    }
  }
}

export async function loginWithToken(token: string): Promise<{ username: string; gistData: GistData } | null> {
  const username = await validateToken(token);
  if (!username) return null;
  setUsername(username);
  const gistData = await initDb();
  return { username, gistData };
}

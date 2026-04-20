import { getToken, getGistId, setGistId, setUsername } from './auth';
import type { Campaign, Entry, Goals } from './storage';

const GIST_FILENAME = 'adjournal-data.json';
const GIST_DESC = 'AdJournal Database';

export interface ProfileData {
  campaigns: Campaign[];
  entries: Entry[];
  goals: Goals;
}

export interface GistData {
  profiles: Record<string, ProfileData>;
  version: number;
}

const EMPTY_GOALS: Goals = { modal: 0, start: '', milestones: [], locked: false };

export const EMPTY_PROFILE: ProfileData = {
  campaigns: [],
  entries: [],
  goals: EMPTY_GOALS,
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
    // Migrate old format (single profile) to new multi-profile format
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

  // Search existing gist
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

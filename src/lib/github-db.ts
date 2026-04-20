import { getToken, getGistId, setGistId, setUsername } from './auth';
import type { Campaign, Entry, Goals } from './storage';

const GIST_FILENAME = 'adjournal-data.json';
const GIST_DESC = 'AdJournal Database';

export interface DbData {
  campaigns: Campaign[];
  entries: Entry[];
  goals: Goals;
  version: number;
}

const EMPTY_GOALS: Goals = { modal: 0, start: '', milestones: [], locked: false };

export const EMPTY_DB: DbData = {
  campaigns: [],
  entries: [],
  goals: EMPTY_GOALS,
  version: 0,
};

function headers() {
  return {
    'Authorization': `token ${getToken()}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

async function ghFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...options, headers: { ...headers(), ...(options.headers as Record<string,string> || {}) } });
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

async function fetchGistData(gistId: string): Promise<DbData | null> {
  try {
    const res = await ghFetch(`https://api.github.com/gists/${gistId}`);
    if (!res.ok) return null;
    const json = await res.json();
    const file = json.files?.[GIST_FILENAME];
    if (!file?.content) return null;
    return JSON.parse(file.content) as DbData;
  } catch { return null; }
}

async function createGist(data: DbData): Promise<string> {
  const res = await ghFetch('https://api.github.com/gists', {
    method: 'POST',
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

export async function initDb(): Promise<DbData> {
  const cachedId = getGistId();

  if (cachedId) {
    const data = await fetchGistData(cachedId);
    if (data) return data;
  }

  // Search for existing gist
  try {
    const res = await ghFetch('https://api.github.com/gists?per_page=30');
    if (res.ok) {
      const gists = await res.json();
      const found = (gists as Array<{ id: string; description: string; files: Record<string, unknown> }>)
        .find(g => g.description === GIST_DESC && g.files[GIST_FILENAME]);
      if (found) {
        setGistId(found.id);
        const data = await fetchGistData(found.id);
        if (data) return data;
      }
    }
  } catch {}

  // Create new gist
  const newId = await createGist(EMPTY_DB);
  setGistId(newId);
  return EMPTY_DB;
}

export async function writeDb(data: DbData): Promise<void> {
  let gistId = getGistId();
  if (!gistId) {
    gistId = await createGist(data);
    setGistId(gistId);
    return;
  }

  const res = await ghFetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
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

export async function loginWithToken(token: string): Promise<{ username: string; data: DbData } | null> {
  const username = await validateToken(token);
  if (!username) return null;
  setUsername(username);
  const data = await initDb();
  return { username, data };
}

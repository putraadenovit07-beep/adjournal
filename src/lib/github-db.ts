import { getGhToken, getGistId, setGistId } from './auth';
import { Campaign, Entry, Goals } from './storage';

const GIST_FILENAME = 'adjournal-data.json';
const GIST_DESC = 'AdJournal Database (auto-generated)';

export interface DbData {
  campaigns: Campaign[];
  entries: Entry[];
  goals: Goals;
  version: number;
}

async function ghFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getGhToken();
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

export async function createGist(data: DbData): Promise<string> {
  const res = await ghFetch('https://api.github.com/gists', {
    method: 'POST',
    body: JSON.stringify({
      description: GIST_DESC,
      public: false,
      files: {
        [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) }
      }
    })
  });
  if (!res.ok) throw new Error('Gagal membuat Gist');
  const json = await res.json();
  return json.id;
}

export async function readGist(): Promise<DbData | null> {
  const gistId = getGistId();
  if (!gistId) return null;
  try {
    const res = await ghFetch(`https://api.github.com/gists/${gistId}`);
    if (!res.ok) return null;
    const json = await res.json();
    const file = json.files?.[GIST_FILENAME];
    if (!file?.content) return null;
    return JSON.parse(file.content) as DbData;
  } catch { return null; }
}

export async function writeGist(data: DbData): Promise<void> {
  let gistId = getGistId();
  if (!gistId) {
    gistId = await createGist(data);
    setGistId(gistId);
    return;
  }
  const res = await ghFetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      files: {
        [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) }
      }
    })
  });
  if (!res.ok) {
    const err = await res.json();
    if (err.message?.includes('Not Found')) {
      const newId = await createGist(data);
      setGistId(newId);
    }
  }
}

export async function findOrCreateGist(initial: DbData): Promise<DbData> {
  const token = getGhToken();
  if (!token) return initial;
  const gistId = getGistId();

  if (gistId) {
    const data = await readGist();
    if (data) return data;
  }

  try {
    const res = await ghFetch('https://api.github.com/gists?per_page=30');
    if (res.ok) {
      const gists = await res.json();
      const found = gists.find((g: { description: string; files: Record<string, unknown> }) =>
        g.description === GIST_DESC && g.files[GIST_FILENAME]
      );
      if (found) {
        setGistId(found.id);
        const data = await readGist();
        if (data) return data;
      }
    }
  } catch {}

  const newId = await createGist(initial);
  setGistId(newId);
  return initial;
}

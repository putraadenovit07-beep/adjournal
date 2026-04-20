const AUTH_KEY = 'adj_auth';
const TOKEN_KEY = 'adj_gh_token';
const GIST_KEY = 'adj_gist_id';

export interface AuthData {
  username: string;
  password: string;
}

export function getAuth(): AuthData | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function setAuth(data: AuthData): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

export function checkLogin(username: string, password: string): boolean {
  const auth = getAuth();
  if (!auth) return false;
  return auth.username === username && auth.password === password;
}

export function hasAccount(): boolean {
  return getAuth() !== null;
}

export function getGhToken(): string {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setGhToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getGistId(): string {
  return localStorage.getItem(GIST_KEY) || '';
}

export function setGistId(id: string): void {
  localStorage.setItem(GIST_KEY, id);
}

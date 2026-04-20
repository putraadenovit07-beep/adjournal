const TOKEN_KEY = 'adj_gh_token';
const GIST_KEY = 'adj_gist_id';
const USERNAME_KEY = 'adj_gh_user';

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(GIST_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

export function getGistId(): string {
  return localStorage.getItem(GIST_KEY) || '';
}

export function setGistId(id: string): void {
  localStorage.setItem(GIST_KEY, id);
}

export function getUsername(): string {
  return localStorage.getItem(USERNAME_KEY) || '';
}

export function setUsername(name: string): void {
  localStorage.setItem(USERNAME_KEY, name);
}

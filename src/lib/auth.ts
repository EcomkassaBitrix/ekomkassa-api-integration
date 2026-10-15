export const AUTH_URL = 'https://functions.poehali.dev/d8ddffa8-e3ea-4f62-b09e-7913ddd853fd';
const TOKEN_KEY = 'authToken';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const authCall = async (action: string, body?: unknown) => {
  const r = await fetch(`${AUTH_URL}?action=${action}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': getToken() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  return { status: r.status, data };
};

export const logout = async () => {
  await authCall('logout', {}).catch(() => null);
  clearToken();
  window.location.reload();
};

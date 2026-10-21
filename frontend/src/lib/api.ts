const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('temerachi_token');
}

export function setSession(token: string, user: unknown) {
  localStorage.setItem('temerachi_token', token);
  localStorage.setItem('temerachi_user', JSON.stringify(user));
}

export function getUser<T = { fullName: string; role: string; email: string }>() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('temerachi_user');
  return raw ? (JSON.parse(raw) as T) : null;
}

export function logout() {
  localStorage.removeItem('temerachi_token');
  localStorage.removeItem('temerachi_user');
  window.location.href = '/login';
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new Error(message || 'Request failed');
  }
  return data as T;
}

export function money(value: number | string | null | undefined, currency = 'ETB') {
  const n = Number(value || 0);
  return `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function kg(value: number | string | null | undefined) {
  return `${Number(value || 0).toLocaleString()} kg`;
}

// A small fetch wrapper for the PlaceTrack API.
// - Keeps the access token in memory (NOT localStorage, so XSS can't read it from storage)
// - On a 401 it calls /auth/refresh once (using the httpOnly cookie) and retries
import { notifyApplicationsChanged } from './events';
const BASE = import.meta.env.VITE_API_URL || '/api';

let accessToken = null;
let onSessionExpired = () => {};
let refreshPromise = null;

export const setAccessToken = (token) => { accessToken = token; };
export const setSessionExpiredHandler = (fn) => { onSessionExpired = fn; };

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (${status})`);
    this.status = status;
    this.details = body?.details || [];
  }
  // { company: 'Company is required', ... } for showing errors under form fields
  get fieldErrors() {
    return Object.fromEntries(this.details.map((d) => [d.field, d.message]));
  }
}

// Several requests can fail with 401 at once; share a single refresh call between them
export function refreshSession() {
  refreshPromise ??= fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (res) => {
      if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
      const data = await res.json();
      accessToken = data.accessToken;
      return data;
    })
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export async function api(path, { method = 'GET', body, query, retry = true } = {}) {
  const qs = query
    ? '?' + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '' && v != null)).toString()
    : '';
  const res = await fetch(`${BASE}${path}${qs}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    try {
      await refreshSession();
      return api(path, { method, body, query, retry: false });
    } catch {
      accessToken = null;
      onSessionExpired();
    }
  }

  if (res.ok && method !== 'GET' && path.startsWith('/applications')) notifyApplicationsChanged();
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

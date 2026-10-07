/**
 * Thin fetch wrapper. Every API call goes through here so error handling,
 * credentials and JSON parsing are consistent.
 *
 * Resolves with `data` on success; rejects with an ApiError carrying the
 * server's plain-language message (or an offline message).
 */
import { STRINGS } from '../constants/strings';

const BASE = '/api';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
  /** Field-level messages from server validation, if any. */
  get fields() {
    return this.data?.fields || {};
  }
}

/**
 * @param {string} path e.g. "/plans"
 * @param {{method?:string, body?:any, query?:Record<string, any>, signal?:AbortSignal}} [options]
 */
export async function request(path, { method = 'GET', body, query, signal } = {}) {
  let url = BASE + path;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(STRINGS.app.offline, 0, null);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(payload?.message || STRINGS.app.genericError, response.status, payload?.data ?? null);
  }
  return { data: payload.data, message: payload.message };
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};

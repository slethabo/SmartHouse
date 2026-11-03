/**
 * Compatibility adapter for existing screen services.
 * Projects use Supabase when configured; the reference catalogue remains local.
 */
import { prototypeRequest } from '../demo/store';
import { ensureCloudSession, getSupabase, usesSupabase } from './supabaseClient';
import { createSupabaseProjects } from './supabaseProjects';


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

/** Cloud failures stay visible; never substitute a local save for a failed cloud write. */
export async function request(path, options = {}) {
  if (usesSupabase()) {
    const client = getSupabase();
    if (path === '/projects' || path.startsWith('/projects/') || path === '/consultation/config') {
      return createSupabaseProjects(client, ensureCloudSession)(path, options);
    }
    const { data, error } = await client.auth.getSession();
    if (error) throw new ApiError('Your session could not be restored. Please log in again.', 401);
    const session = data.session && !data.session.user.is_anonymous ? data.session : null;
    const publicRead = (!options.method || options.method === 'GET') && (path === '/rates' || /^\/plans(?:\/\d+)?$/.test(path));
    if (!session && !publicRead) throw new ApiError('Please log in to continue.', 401);
    if (path.startsWith('/admin/')) {
      const role = await client.rpc('my_role');
      if (role.error || role.data !== 'admin') throw new ApiError('Administrator access is required.', 403);
    }
    // Retained demo features use a separate local store for each signed-in account.
    return prototypeRequest(path, { ...options, storageKey: session ? `smarthouse.frontend-prototype.v1:${session.user.id}` : undefined });
  }
  return prototypeRequest(path, options);
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};

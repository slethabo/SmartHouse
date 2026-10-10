/**
 * Compatibility adapter for existing screen services.
 * All operations use local browser data in this frontend-only prototype.
 */
import { prototypeRequest } from '../demo/store';


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

/** Prototype data stays in this browser; no backend requests. */
export async function request(path, options = {}) {
  return prototypeRequest(path, options);
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};

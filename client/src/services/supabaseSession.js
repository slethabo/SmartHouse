/** Restore an existing account session. Never create anonymous users automatically. */
export function createSessionManager(client) {
  let pending;
  return async function ensureSession() {
    if (!pending) pending = client.auth.getSession();
    try {
      const { data, error } = await pending;
      if (error) throw new Error('Your session could not be restored. Please log in again.');
      if (!data.session || data.session.user.is_anonymous) {
        const failure = new Error('Please log in to open your projects.');
        failure.status = 401;
        throw failure;
      }
      return data.session;
    } finally { pending = undefined; }
  };
}

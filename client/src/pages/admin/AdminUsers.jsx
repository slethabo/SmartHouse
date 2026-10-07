import { useState } from 'react';
import { STRINGS, fill } from '../../constants/strings';
import { adminService } from '../../services/admin.service';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingBlock } from '../../components/ui/Spinner';
import { formatDate } from '../../utils/format';

export function AdminUsers({ onChanged }) {
  const s = STRINGS.admin.users;
  const toast = useToast();
  const { user: me } = useAuth();
  const { data, loading, error, reload, setData } = useFetch(({ signal }) => adminService.listUsers({ signal }), []);
  const items = data?.items || [];
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(null);

  const setActive = async (user, isActive) => {
    setBusy(user.id);
    try {
      const { data: updated, message } = await adminService.setUserActive(user.id, isActive);
      setData((d) => ({ items: d.items.map((u) => (u.id === user.id ? updated : u)) }));
      toast.success(message);
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
      setTarget(null);
    }
  };

  return (
    <section aria-labelledby="admin-users-title">
      <h2 id="admin-users-title" className="mb-4">
        {STRINGS.admin.tabs.users}
      </h2>
      {error && (
        <Banner type="error" onRetry={reload}>
          {error.message}
        </Banner>
      )}
      {loading ? (
        <LoadingBlock />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{s.name}</th>
                <th>{s.email}</th>
                <th>{s.role}</th>
                <th>{s.status}</th>
                <th>{s.joined}</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const isMe = u.id === me?.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.full_name}</strong> {isMe && <span className="badge badge--info">{s.you}</span>}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge--info' : 'badge--muted'}`}>{u.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge--success' : 'badge--danger'}`}>{u.is_active ? s.active : s.inactive}</span>
                    </td>
                    <td>{formatDate(u.created_at)}</td>
                    <td>
                      <div className="table__actions">
                        {u.is_active ? (
                          <Button
                            variant="danger"
                            size="sm"
                            icon="x"
                            disabled={isMe}
                            disabledReason={s.cannotDeactivateSelf}
                            loading={busy === u.id}
                            onClick={() => setTarget(u)}
                            aria-label={`${s.deactivate} ${u.full_name}`}
                          >
                            {s.deactivate}
                          </Button>
                        ) : (
                          <Button variant="secondary" size="sm" icon="refresh" loading={busy === u.id} onClick={() => setActive(u, true)} aria-label={`${s.reactivate} ${u.full_name}`}>
                            {s.reactivate}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(target)}
        title={s.deactivateTitle}
        body={target ? fill(s.deactivateBody, { name: target.full_name }) : ''}
        confirmLabel={s.deactivateConfirm}
        loading={Boolean(busy)}
        onCancel={() => setTarget(null)}
        onConfirm={() => setActive(target, false)}
      />
    </section>
  );
}

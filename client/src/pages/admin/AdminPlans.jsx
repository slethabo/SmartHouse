import { useState } from 'react';
import { STRINGS, fill } from '../../constants/strings';
import { adminService } from '../../services/admin.service';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingBlock } from '../../components/ui/Spinner';
import { PlanForm, EMPTY_PLAN } from '../../components/forms/PlanForm';
import { formatArea, formatRand } from '../../utils/format';

export function AdminPlans({ onChanged }) {
  const s = STRINGS.admin.plans;
  const toast = useToast();
  const { data, loading, error, reload, setData } = useFetch(({ signal }) => adminService.listPlans({ signal }), []);
  const items = data?.items || [];

  const [editing, setEditing] = useState(null); // null | EMPTY_PLAN | plan
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [serverFields, setServerFields] = useState({});
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toggling, setToggling] = useState(null);

  const openForm = (plan) => {
    setEditing(plan);
    setDirty(false);
    setServerError('');
    setServerFields({});
  };
  const requestClose = () => {
    if (dirty) setConfirmDiscard(true);
    else setEditing(null);
  };

  const submit = async (values) => {
    setSaving(true);
    setServerError('');
    setServerFields({});
    try {
      const { data: plan, message } = editing.id ? await adminService.updatePlan(editing.id, values) : await adminService.createPlan(values);
      setData((d) => {
        const list = d?.items || [];
        const exists = list.some((p) => p.id === plan.id);
        return { items: exists ? list.map((p) => (p.id === plan.id ? { ...p, ...plan } : p)) : [...list, plan] };
      });
      toast.success(message);
      setEditing(null);
      onChanged?.();
      reload(); // refresh cost estimates for the new/updated plan
    } catch (err) {
      setServerError(err.message);
      setServerFields(err.fields);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (plan) => {
    setToggling(plan.id);
    try {
      const { data: updated, message } = await adminService.setPlanActive(plan.id, !plan.is_active);
      setData((d) => ({ items: d.items.map((p) => (p.id === plan.id ? { ...p, ...updated } : p)) }));
      toast.success(message);
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setToggling(null);
    }
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      const { message } = await adminService.deletePlan(deleting.id);
      setData((d) => ({ items: d.items.filter((p) => p.id !== deleting.id) }));
      toast.success(message);
      setDeleting(null);
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <section aria-labelledby="admin-plans-title">
      <div className="flex flex--between mb-4">
        <h2 id="admin-plans-title">{STRINGS.admin.tabs.plans}</h2>
        <Button icon="plus" onClick={() => openForm(EMPTY_PLAN)}>
          {s.add}
        </Button>
      </div>

      {error && (
        <Banner type="error" onRetry={reload}>
          {error.message}
        </Banner>
      )}
      {loading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState icon="house" title={s.emptyTitle} body={s.emptyBody}>
          <Button icon="plus" onClick={() => openForm(EMPTY_PLAN)}>
            {s.add}
          </Button>
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{s.name}</th>
                <th>{s.style}</th>
                <th className="is-num">{s.bedrooms}</th>
                <th className="is-num">{s.floors}</th>
                <th className="is-num">{s.floorArea}</th>
                <th className="is-num">{s.minPlot}</th>
                <th className="is-num">{s.estimateFrom}</th>
                <th>{s.status}</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td>{p.style}</td>
                  <td className="is-num">{p.bedrooms}</td>
                  <td className="is-num">{p.floors}</td>
                  <td className="is-num">{formatArea(p.floor_area_m2)}</td>
                  <td className="is-num">{formatArea(p.min_plot_size_m2)}</td>
                  <td className="is-num">{p.cost ? formatRand(p.cost.low) : '—'}</td>
                  <td>
                    <span className={`badge ${p.is_active ? 'badge--success' : 'badge--muted'}`}>{p.is_active ? s.visible : s.hidden}</span>
                  </td>
                  <td>
                    <div className="table__actions">
                      <Button variant="secondary" size="sm" icon="edit" onClick={() => openForm(p)} aria-label={`${STRINGS.app.edit} ${p.name}`}>
                        {STRINGS.app.edit}
                      </Button>
                      <Button variant="secondary" size="sm" icon={p.is_active ? 'eyeOff' : 'eye'} loading={toggling === p.id} onClick={() => toggleActive(p)} aria-label={`${p.is_active ? s.hide : s.show} ${p.name}`}>
                        {p.is_active ? s.hide : s.show}
                      </Button>
                      <Button variant="danger" size="sm" icon="trash" onClick={() => setDeleting(p)} aria-label={`${STRINGS.app.delete} ${p.name}`}>
                        {STRINGS.app.delete}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={requestClose} title={editing?.id ? s.edit : s.add} wide labelledBy="plan-form-title">
        {editing && (
          <PlanForm
            key={editing.id || 'new'}
            initialValues={editing}
            onSubmit={submit}
            onCancel={requestClose}
            submitting={saving}
            serverError={serverError}
            serverFields={serverFields}
            onDirtyChange={setDirty}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={confirmDiscard}
        title={STRINGS.admin.confirmDiscardTitle}
        body={STRINGS.admin.confirmDiscardBody}
        confirmLabel={STRINGS.admin.discard}
        cancelLabel={STRINGS.admin.keepEditing}
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={s.deleteTitle}
        body={deleting ? fill(s.deleteBody, { name: deleting.name }) : ''}
        confirmLabel={s.deleteConfirm}
        loading={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}

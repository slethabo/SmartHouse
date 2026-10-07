import { Modal } from './Modal';
import { Button } from './Button';
import { STRINGS } from '../../constants/strings';

/**
 * Confirmation for destructive actions. Cancel is always available and is
 * the default-focused control.
 */
export function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel, danger = true, loading = false, onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} labelledBy="confirm-title">
      <p className="text-muted">{body}</p>
      <div className="dialog__actions">
        <Button variant="secondary" onClick={onCancel} autoFocus disabled={loading}>
          {cancelLabel || STRINGS.app.cancel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel || STRINGS.app.confirm}
        </Button>
      </div>
    </Modal>
  );
}

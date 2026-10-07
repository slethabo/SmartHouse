/**
 * Save / unsave a plan with optimistic UI, toast feedback and undo.
 */
import { useCallback, useState } from 'react';
import { plansService } from '../services/plans.service';
import { useToast } from '../context/ToastContext';
import { STRINGS } from '../constants/strings';

export function useSavePlan({ onChange } = {}) {
  const toast = useToast();
  const [pendingId, setPendingId] = useState(null);

  const toggle = useCallback(
    async (plan, currentlySaved) => {
      setPendingId(plan.id);
      try {
        if (currentlySaved) {
          const { message } = await plansService.unsave(plan.id);
          onChange?.(plan.id, false);
          toast.info(message || STRINGS.saved.removed, {
            action: {
              label: STRINGS.saved.undo,
              onClick: async () => {
                await plansService.save(plan.id);
                onChange?.(plan.id, true);
              },
            },
          });
        } else {
          const { message } = await plansService.save(plan.id);
          onChange?.(plan.id, true);
          toast.success(message);
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        setPendingId(null);
      }
    },
    [onChange, toast]
  );

  return { toggle, pendingId };
}

/**
 * Generic data-fetching hook with loading / error / retry and abort on unmount.
 *
 * const { data, loading, error, reload } = useFetch(() => plansService.browse(q), [q]);
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export function useFetch(fetcher, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: null });
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, loading: false }));
      return undefined;
    }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcherRef
      .current({ signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setState({ data: result.data, loading: false, error: null });
      })
      .catch((err) => {
        if (err.name === 'AbortError' || controller.signal.aborted) return;
        setState({ data: null, loading: false, error: err });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload, setData };
}

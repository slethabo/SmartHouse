/**
 * Remembers the user's last search (reduce memory load / anticipation).
 * Local storage is the fast path; the server copy is used when local is empty.
 */
import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS, DEFAULT_SEARCH } from '../constants/config';
import { recommendationService } from '../services/recommendation.service';

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.lastSearch);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useLastSearch(enabledRemote = true) {
  const [lastSearch, setLastSearchState] = useState(readLocal);
  const [restored, setRestored] = useState(Boolean(readLocal()));

  useEffect(() => {
    if (lastSearch || !enabledRemote) return undefined;
    let cancelled = false;
    recommendationService
      .lastSearch()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const value = { ...DEFAULT_SEARCH, plotSizeM2: data.plot_size_m2, budget: data.budget };
        setLastSearchState(value);
        setRestored(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lastSearch, enabledRemote]);

  const setLastSearch = useCallback((value) => {
    setLastSearchState(value);
    try {
      localStorage.setItem(STORAGE_KEYS.lastSearch, JSON.stringify(value));
    } catch {
      /* storage may be unavailable (private mode); ignore */
    }
  }, []);

  return { lastSearch, restored, setLastSearch };
}

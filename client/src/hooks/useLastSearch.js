/**
 * Remembers the user's last search (reduce memory load / anticipation).
 * Local storage is the fast path; the server copy is used when local is empty.
 */
import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS, DEFAULT_SEARCH } from '../constants/config';
import { recommendationService } from '../services/recommendation.service';
import { useAuth } from '../context/AuthContext';

function readLocal(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useLastSearch(enabledRemote = true) {
  const { user, cloudMode } = useAuth();
  const storageKey = cloudMode && user ? `${STORAGE_KEYS.lastSearch}:${user.id}` : STORAGE_KEYS.lastSearch;
  const [lastSearch, setLastSearchState] = useState(() => readLocal(storageKey));
  const [restored, setRestored] = useState(() => Boolean(readLocal(storageKey)));

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
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* storage may be unavailable (private mode); ignore */
    }
  }, [storageKey]);

  return { lastSearch, restored, setLastSearch };
}

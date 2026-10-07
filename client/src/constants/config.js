/** Non-text configuration for the UI. */

/** Quick budget presets (Rand) shown as chips under the budget field. */
export const BUDGET_PRESETS = [500000, 1000000, 1500000, 2500000, 4000000];

/** Default values for the "Find my house" form when there is no previous search. */
export const DEFAULT_SEARCH = { plotSizeM2: 400, budget: 1500000, bedrooms: '', floors: '', style: '' };

/** Finish levels in ascending price order. Mirrors the server. */
export const FINISH_LEVELS = ['basic', 'standard', 'premium'];

/** Local storage keys. */
export const STORAGE_KEYS = {
  lastSearch: 'smarthouse:lastSearch',
  lastResults: 'smarthouse:lastResults',
};

/** Validation bounds (mirror the API). */
export const LIMITS = {
  plotMax: 1000000,
  budgetMax: 10000000000,
};

/** Toast auto-dismiss time in ms. */
export const TOAST_DURATION = 4500;

/**
 * Locale-aware formatting. ZAR via Intl.NumberFormat (en-ZA).
 */
const randFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 1 });

/**
 * @param {number} value
 * @returns {string} e.g. "R 1 500 000"
 */
export function formatRand(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return randFormatter.format(Number(value));
}

/**
 * Compact Rand for chips: R500k, R1.5m
 * @param {number} value
 */
export function formatRandCompact(value) {
  const n = Number(value);
  if (n >= 1_000_000) return `R${(n / 1_000_000).toLocaleString('en-ZA', { maximumFractionDigits: 1 })}m`;
  if (n >= 1_000) return `R${Math.round(n / 1_000)}k`;
  return formatRand(n);
}

/**
 * @param {number} value
 * @returns {string} e.g. "400 m²"
 */
export function formatArea(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${numberFormatter.format(Number(value))} m²`;
}

/** @param {string|Date} value */
export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(new Date(value));
}

/** Parse a user-typed number that may contain spaces or commas. */
export function parseNumberInput(value) {
  if (typeof value === 'number') return value;
  const cleaned = String(value ?? '').replace(/[\s,R]/g, '');
  if (cleaned === '') return NaN;
  return Number(cleaned);
}

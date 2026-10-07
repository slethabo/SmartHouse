/**
 * Client-side validation. Returns `{ field: message }`; empty object = valid.
 * The server validates again; these checks exist for instant, specific feedback.
 */
import { STRINGS } from '../constants/strings';
import { LIMITS } from '../constants/config';
import { parseNumberInput } from './format';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email) {
  const e = STRINGS.auth.errors;
  if (!email || !email.trim()) return e.emailRequired;
  if (!EMAIL_RE.test(email.trim())) return e.emailInvalid;
  return '';
}

export function validatePassword(password, { strict = true } = {}) {
  const e = STRINGS.auth.errors;
  if (!password) return e.passwordRequired;
  if (!strict) return '';
  if (password.length < 8) return e.passwordShort;
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return e.passwordWeak;
  return '';
}

export function validateLogin({ email, password }) {
  const errors = {};
  const emailErr = validateEmail(email);
  const passErr = validatePassword(password, { strict: false });
  if (emailErr) errors.email = emailErr;
  if (passErr) errors.password = passErr;
  return errors;
}

export function validateRegister({ fullName, email, password, confirmPassword }) {
  const e = STRINGS.auth.errors;
  const errors = {};
  if (!fullName || !fullName.trim()) errors.fullName = e.fullNameRequired;
  else if (fullName.trim().length < 2) errors.fullName = e.fullNameShort;
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;
  const passErr = validatePassword(password);
  if (passErr) errors.password = passErr;
  if (!errors.password && password !== confirmPassword) errors.confirmPassword = e.passwordMismatch;
  return errors;
}

export function validateSearch({ plotSizeM2, budget }) {
  const e = STRINGS.dashboard.errors;
  const errors = {};
  const plot = parseNumberInput(plotSizeM2);
  const bud = parseNumberInput(budget);
  if (plotSizeM2 === '' || plotSizeM2 === undefined) errors.plotSizeM2 = e.plotRequired;
  else if (!Number.isFinite(plot) || plot <= 0) errors.plotSizeM2 = e.plotPositive;
  else if (plot > LIMITS.plotMax) errors.plotSizeM2 = e.plotTooBig;
  if (budget === '' || budget === undefined) errors.budget = e.budgetRequired;
  else if (!Number.isFinite(bud) || bud <= 0) errors.budget = e.budgetPositive;
  else if (bud > LIMITS.budgetMax) errors.budget = e.budgetTooBig;
  return errors;
}

/** Validation for the admin house-plan form. */
export function validatePlanForm(p) {
  const errors = {};
  const num = (v) => parseNumberInput(v);
  if (!p.name || p.name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';
  if (!p.style || p.style.trim().length < 2) errors.style = 'Style must be at least 2 characters.';
  if (!Number.isInteger(num(p.bedrooms)) || num(p.bedrooms) < 0) errors.bedrooms = 'Bedrooms must be a whole number of 0 or more.';
  if (!Number.isFinite(num(p.bathrooms)) || num(p.bathrooms) < 0) errors.bathrooms = 'Bathrooms must be 0 or more (halves allowed).';
  if (!Number.isInteger(num(p.floors)) || num(p.floors) < 1 || num(p.floors) > 5) errors.floors = 'Floors must be between 1 and 5.';
  if (!(num(p.floor_area_m2) > 0)) errors.floor_area_m2 = 'Floor area must be greater than 0 m².';
  if (!(num(p.footprint_m2) > 0)) errors.footprint_m2 = 'Footprint must be greater than 0 m².';
  else if (num(p.floor_area_m2) > 0 && num(p.footprint_m2) > num(p.floor_area_m2) * 1.5) errors.footprint_m2 = 'Footprint looks too large compared to the floor area.';
  if (!(num(p.min_plot_size_m2) > 0)) errors.min_plot_size_m2 = 'Minimum plot size must be greater than 0 m².';
  else if (num(p.footprint_m2) > 0 && num(p.min_plot_size_m2) < num(p.footprint_m2)) errors.min_plot_size_m2 = 'Minimum plot must be at least the footprint size.';
  if (p.image_url && !/^https?:\/\//i.test(p.image_url.trim())) errors.image_url = 'Image URL must start with http:// or https://';
  return errors;
}

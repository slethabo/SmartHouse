import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { STRINGS } from '../constants/strings';
import { validateEmail, validateLogin } from '../utils/validation';
import { FormField, PasswordField } from '../components/ui/FormField';
import { Button } from '../components/ui/Button';
import { Banner } from '../components/ui/Banner';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { safeReturnPath } from '../services/supabaseAuth';
import { authService } from '../services/auth.service';
import { AuthLayout } from '../components/layout/AuthLayout';

export function LoginPage() {
  useDocumentTitle(STRINGS.auth.loginTitle);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  async function resend() {
    setServerError(''); setNotice('');
    const invalid = validateEmail(form.email);
    if (invalid) { setErrors({ email: invalid }); return; }
    setSubmitting(true);
    try { setNotice(await authService.resendConfirmation(form.email)); }
    catch (e) { setServerError(e.message); }
    finally { setSubmitting(false); }
  }

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateLogin(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    setServerError('');
    try {
      const message = await login({ email: form.email.trim(), password: form.password });
      toast.success(message);
      navigate(safeReturnPath(location.state?.from), { replace: true });
    } catch (err) {
      setServerError(err.message);
      setErrors(err.fields || {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="card auth-card">
        <h1>{STRINGS.auth.loginTitle}</h1>
        <p>{STRINGS.auth.loginIntro}</p>
        {serverError && <Banner type="error">{serverError}</Banner>}
        {notice && <Banner type="success">{notice}</Banner>}
        {location.state?.message && <Banner type="success">{location.state.message}</Banner>}
        <form className="form mt-4" onSubmit={handleSubmit} noValidate>
          <FormField
            label={STRINGS.auth.email}
            type="email"
            autoComplete="email"
            placeholder={STRINGS.auth.emailPlaceholder}
            value={form.email}
            onChange={update('email')}
            error={errors.email}
            required
          />
          <PasswordField
            label={STRINGS.auth.password}
            autoComplete="current-password"
            value={form.password}
            onChange={update('password')}
            error={errors.password}
            required
          />
          <Button type="submit" block loading={submitting}>
            {submitting ? STRINGS.auth.loggingIn : STRINGS.auth.loginButton}
          </Button>
        </form>
        <div className="auth-support"><Link to="/forgot-password">Forgot your password?</Link><details><summary>Waiting for your confirmation email?</summary><p>Enter your email above, then request a new link.</p><Button variant="secondary" size="sm" disabled={submitting} onClick={resend}>Resend confirmation email</Button></details></div>
        <p className="auth-switch">
          {STRINGS.auth.noAccount} <Link to="/register">{STRINGS.nav.register}</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

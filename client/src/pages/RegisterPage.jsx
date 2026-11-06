import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { STRINGS } from '../constants/strings';
import { validateEmail, validateRegister } from '../utils/validation';
import { FormField, PasswordField } from '../components/ui/FormField';
import { Button } from '../components/ui/Button';
import { Banner } from '../components/ui/Banner';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { AuthLayout } from '../components/layout/AuthLayout';

export function RegisterPage() {
  useDocumentTitle(STRINGS.auth.registerTitle);
  const { register, anonymousWorkspace } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = anonymousWorkspace ? {
      ...(form.fullName.trim().length < 2 || form.fullName.trim().length > 120 ? { fullName: 'Enter a name from 2 to 120 characters.' } : {}),
      ...(validateEmail(form.email) ? { email: validateEmail(form.email) } : {}),
    } : validateRegister(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    setServerError('');
    try {
      const result = await register({ fullName: form.fullName.trim(), email: form.email.trim(), password: form.password });
      if (result.needsConfirmation) navigate('/login', { replace: true, state: { message: result.message } });
      else { toast.success(result.message); navigate('/', { replace: true }); }
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
        <h1>{STRINGS.auth.registerTitle}</h1>
        <p>{STRINGS.auth.registerIntro}</p>
        {anonymousWorkspace && <Banner>Link your email to keep your existing workspace. Confirm the email link, then choose a password.</Banner>}
        {serverError && <Banner type="error">{serverError}</Banner>}
        <form className="form mt-4" onSubmit={handleSubmit} noValidate>
          <FormField
            label={STRINGS.auth.fullName}
            autoComplete="name"
            maxLength={120}
            placeholder={STRINGS.auth.fullNamePlaceholder}
            value={form.fullName}
            onChange={update('fullName')}
            error={errors.fullName}
            required
          />
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
          {!anonymousWorkspace && <><PasswordField
            label={STRINGS.auth.password}
            autoComplete="new-password"
            hint={STRINGS.auth.passwordHint}
            value={form.password}
            onChange={update('password')}
            error={errors.password}
            required
          />
          <PasswordField
            label={STRINGS.auth.confirmPassword}
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            error={errors.confirmPassword}
            required
          /></>}
          <Button type="submit" block loading={submitting}>
            {submitting ? STRINGS.auth.registering : anonymousWorkspace ? 'Send confirmation link' : STRINGS.auth.registerButton}
          </Button>
        </form>
        <p className="auth-switch">
          {STRINGS.auth.haveAccount} <Link to="/login">{STRINGS.nav.login}</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

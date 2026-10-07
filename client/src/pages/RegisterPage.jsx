import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { STRINGS } from '../constants/strings';
import { validateRegister } from '../utils/validation';
import { FormField, PasswordField } from '../components/ui/FormField';
import { Button } from '../components/ui/Button';
import { Banner } from '../components/ui/Banner';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function RegisterPage() {
  useDocumentTitle(STRINGS.auth.registerTitle);
  const { register } = useAuth();
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
    const errs = validateRegister(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    setServerError('');
    try {
      const message = await register({ fullName: form.fullName.trim(), email: form.email.trim(), password: form.password });
      toast.success(message);
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(err.message);
      setErrors(err.fields || {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>{STRINGS.auth.registerTitle}</h1>
        <p>{STRINGS.auth.registerIntro}</p>
        {serverError && <Banner type="error">{serverError}</Banner>}
        <form className="form mt-4" onSubmit={handleSubmit} noValidate>
          <FormField
            label={STRINGS.auth.fullName}
            autoComplete="name"
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
          <PasswordField
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
          />
          <Button type="submit" block loading={submitting}>
            {submitting ? STRINGS.auth.registering : STRINGS.auth.registerButton}
          </Button>
        </form>
        <p className="auth-switch">
          {STRINGS.auth.haveAccount} <Link to="/login">{STRINGS.nav.login}</Link>
        </p>
      </div>
    </div>
  );
}

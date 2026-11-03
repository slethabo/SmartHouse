import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { validateEmail, validatePassword } from '../utils/validation';
import { FormField, PasswordField } from '../components/ui/FormField';
import { Button } from '../components/ui/Button';
import { Banner } from '../components/ui/Banner';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function AuthCallbackPage() {
  useDocumentTitle('Confirm your account');
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <div className="auth-page"><section className="card auth-card"><h1>Confirm your account</h1><Banner>The confirmation link is missing or has expired. Try logging in if your email is already confirmed, or request another link from the account page.</Banner><Link to="/login">Log in</Link> · <Link to="/register">Create account</Link></section></div>;
}

export function ForgotPasswordPage() {
  useDocumentTitle('Reset your password');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(''); setMessage('');
    const invalid = validateEmail(email);
    if (invalid) { setError(invalid); return; }
    setBusy(true);
    try { setMessage(await authService.resetPassword(email)); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <div className="auth-page"><section className="card auth-card"><h1>Reset your password</h1><p>Enter your account email to receive a reset link.</p>
    {error && <Banner type="error">{error}</Banner>}{message && <Banner type="success">{message}</Banner>}
    <form className="form mt-4" onSubmit={submit} noValidate><FormField label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /><Button type="submit" block loading={busy}>Send reset link</Button></form><p><Link to="/login">Back to login</Link></p>
  </section></div>;
}

export function ResetPasswordPage() {
  useDocumentTitle('Choose a new password');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError('');
    const invalid = validatePassword(password);
    if (invalid || password !== confirm) { setError(invalid || 'The two passwords do not match.'); return; }
    setBusy(true);
    try { await authService.updatePassword(password); navigate('/', { replace: true }); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  if (!user) return <div className="auth-page"><section className="card auth-card"><h1>Open your password reset email</h1><Banner>Use the latest link in your inbox. If it has expired, request another one.</Banner><Link to="/forgot-password">Request a reset link</Link></section></div>;
  return <div className="auth-page"><section className="card auth-card"><h1>Choose a new password</h1><p>Use at least 8 characters, including a letter and a number.</p>{error && <Banner type="error">{error}</Banner>}<form className="form mt-4" onSubmit={submit} noValidate>
    <PasswordField label="New password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
    <PasswordField label="Confirm password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
    <Button type="submit" block loading={busy}>Save password</Button>
  </form></section></div>;
}

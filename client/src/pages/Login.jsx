import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext.jsx';
import { errorMessage } from '../api/axios.js';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email.trim() || !form.password) return setError('Enter your email and password');
    setBusy(true);
    try {
      const u = await login(form.email.trim(), form.password);
      navigate(homeFor(u.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card shadow-sm mx-auto auth-card">
      <div className="card-body p-4">
        <h1 className="h4 mb-1">Login</h1>
        <p className="text-secondary small mb-4">Sign in to report or manage incidents.</p>
        {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
        <form onSubmit={onSubmit} noValidate>
          <div className="mb-3">
            <label className="form-label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="form-control" autoComplete="email" value={form.email} onChange={onChange} />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="form-control" autoComplete="current-password" value={form.password} onChange={onChange} />
          </div>
          <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Signing in...' : 'Login'}</button>
        </form>
        <p className="text-center small mt-3 mb-0">New here? <Link to="/register">Create an account</Link></p>
      </div>
    </div>
  );
}

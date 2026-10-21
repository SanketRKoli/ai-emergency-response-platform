import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext.jsx';
import { errorMessage, fieldErrors } from '../api/axios.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same rules as the server (the server always re-checks).
function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Full name must be at least 2 characters';
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address';
  if (f.password.length < 8) e.password = 'Password must be at least 8 characters';
  if (f.password !== f.confirmPassword) e.confirmPassword = 'Passwords do not match';
  return e;
}

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const u = await register({ ...form, name: form.name.trim(), email: form.email.trim() });
      navigate(homeFor(u.role), { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const field = (name, label, type = 'text', auto) => (
    <div className="mb-3">
      <label className="form-label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} autoComplete={auto} className={`form-control ${errors[name] ? 'is-invalid' : ''}`} value={form[name]} onChange={onChange} />
      {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
    </div>
  );

  return (
    <div className="card shadow-sm mx-auto auth-card">
      <div className="card-body p-4">
        <h1 className="h4 mb-1">Create account</h1>
        <p className="text-secondary small mb-4">Registered accounts are User accounts. Responder and Admin accounts are created by an administrator.</p>
        {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
        <form onSubmit={onSubmit} noValidate>
          {field('name', 'Full name', 'text', 'name')}
          {field('email', 'Email', 'email', 'email')}
          {field('password', 'Password', 'password', 'new-password')}
          {field('confirmPassword', 'Confirm password', 'password', 'new-password')}
          <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Creating account...' : 'Register'}</button>
        </form>
        <p className="text-center small mt-3 mb-0">Already registered? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
}

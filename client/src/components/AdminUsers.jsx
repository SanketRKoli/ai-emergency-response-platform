import { useEffect, useState } from 'react';
import api, { errorMessage } from '../api/axios.js';
import Loader from './Loader.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const GROUPS = ['Fire', 'Medical', 'Security', 'Accident', 'Infrastructure', 'Other'];
const EMPTY = { name: '', email: '', password: '', role: 'Responder', responderCategory: 'Fire' };

// Manage accounts: list, add a Responder or Admin, and activate or deactivate accounts.
export default function AdminUsers({ onChanged }) {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/admin/users').then((res) => setUsers(res.data.users)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await api.post('/admin/users', form); setForm(EMPTY); setShow(false); await load(); onChanged?.(); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  const toggle = async (u) => {
    setError('');
    try { await api.put(`/admin/users/${u.id}`, { isActive: !u.isActive }); await load(); onChanged?.(); } catch (err) { setError(errorMessage(err)); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white d-flex align-items-center">
        <span className="fw-semibold me-auto">Users and responders</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShow((s) => !s)}>{show ? 'Cancel' : '+ Add responder or admin'}</button>
      </div>
      {error && <div className="alert alert-danger m-3 py-2">{error}</div>}
      {show && (
        <form className="p-3 border-bottom row g-2" onSubmit={create}>
          <div className="col-md-3"><input className="form-control" placeholder="Full name" value={form.name} onChange={set('name')} required /></div>
          <div className="col-md-3"><input className="form-control" type="email" placeholder="Email" value={form.email} onChange={set('email')} required /></div>
          <div className="col-md-2"><input className="form-control" type="password" placeholder="Password (8+)" value={form.password} onChange={set('password')} required minLength={8} /></div>
          <div className="col-md-2"><select className="form-select" value={form.role} onChange={set('role')}><option>Responder</option><option>Admin</option></select></div>
          {form.role === 'Responder' && <div className="col-md-2"><select className="form-select" value={form.responderCategory} onChange={set('responderCategory')}>{GROUPS.map((g) => <option key={g}>{g}</option>)}</select></div>}
          <div className="col-12"><button className="btn btn-success btn-sm" disabled={busy}>{busy ? 'Creating...' : 'Create account'}</button></div>
        </form>
      )}
      {!users ? <Loader text="Loading users..." /> : (
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light"><tr><th>Name</th><th>Email</th><th>Role</th><th>Group</th><th>Status</th><th /></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td><td>{u.email}</td>
                  <td><span className={`badge text-bg-${u.role === 'Admin' ? 'dark' : u.role === 'Responder' ? 'primary' : 'secondary'}`}>{u.role}</span></td>
                  <td>{u.responderCategory || '-'}</td>
                  <td>{u.isActive ? <span className="text-success">Active</span> : <span className="text-danger">Disabled</span>}</td>
                  <td className="text-end">{u.id !== me.id && <button className={`btn btn-sm ${u.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={() => toggle(u)}>{u.isActive ? 'Disable' : 'Enable'}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

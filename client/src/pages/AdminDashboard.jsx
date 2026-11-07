import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api/axios.js';
import StatCards from '../components/StatCards.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import Loader from '../components/Loader.jsx';
import AdminCharts from '../components/AdminCharts.jsx';
import AdminIncidentModal from '../components/AdminIncidentModal.jsx';
import AdminUsers from '../components/AdminUsers.jsx';

const STATUSES = ['Submitted', 'AI Analyzed', 'Pending Assignment', 'Assigned', 'Accepted', 'In Progress', 'Resolved'];
const CATEGORIES = ['Fire', 'Medical', 'Security', 'Accident', 'Infrastructure', 'Maintenance', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const NO_FILTERS = { from: '', to: '', category: '', priority: '', status: '', q: '' };

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [filters, setFilters] = useState(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState(null);
  const [list, setList] = useState(null);
  const [responders, setResponders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  const query = useCallback((extra = {}) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, ...extra })) if (v) p.set(k, v);
    return p.toString();
  }, [filters]);

  const loadAll = useCallback(() => {
    setError('');
    api.get(`/admin/analytics?${query()}`).then((r) => setStats(r.data)).catch((e) => setError(errorMessage(e)));
    api.get(`/admin/incidents?${query({ page })}`).then((r) => setList(r.data)).catch((e) => setError(errorMessage(e)));
  }, [query, page]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { api.get('/admin/users?role=Responder').then((r) => setResponders(r.data.users.filter((u) => u.isActive))).catch(() => {}); }, []);
  // Refresh the numbers every 20 seconds so new incidents show up while the dashboard stays open.
  useEffect(() => { const t = setInterval(loadAll, 20000); return () => clearInterval(t); }, [loadAll]);

  const setFilter = (k) => (e) => { setPage(1); setFilters({ ...filters, [k]: e.target.value }); };
  const s = stats?.stats;
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h1 className="h4 mb-0 me-auto">Admin Dashboard</h1>
        {[['overview', 'Overview'], ['users', 'Users and responders']].map(([k, label]) => (
          <button key={k} className={`btn btn-sm ${tab === k ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {tab === 'users' ? <AdminUsers onChanged={() => api.get('/admin/users?role=Responder').then((r) => setResponders(r.data.users.filter((u) => u.isActive)))} /> : (
        <>
          <StatCards items={[['Total Incidents', '', s?.total], ['Pending', '', s?.pending], ['High Priority', 'warn', s?.highPriority], ['In Progress', '', s?.inProgress], ['Resolved', 'ok', s?.resolved]]} />

          <div className="card shadow-sm mb-3"><div className="card-body">
            <div className="row g-2 align-items-end">
              <div className="col-6 col-md-2"><label className="form-label small mb-1">From</label><input type="date" className="form-control form-control-sm" value={filters.from} onChange={setFilter('from')} /></div>
              <div className="col-6 col-md-2"><label className="form-label small mb-1">To</label><input type="date" className="form-control form-control-sm" value={filters.to} onChange={setFilter('to')} /></div>
              <div className="col-6 col-md-2"><label className="form-label small mb-1">Category</label><select className="form-select form-select-sm" value={filters.category} onChange={setFilter('category')}><option value="">All</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div className="col-6 col-md-2"><label className="form-label small mb-1">Priority</label><select className="form-select form-select-sm" value={filters.priority} onChange={setFilter('priority')}><option value="">All</option>{PRIORITIES.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div className="col-6 col-md-2"><label className="form-label small mb-1">Status</label><select className="form-select form-select-sm" value={filters.status} onChange={setFilter('status')}><option value="">All</option>{STATUSES.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div className="col-6 col-md-2"><label className="form-label small mb-1">Report ID</label><input className="form-control form-control-sm" placeholder="INC-2026-0001" value={filters.q} onChange={setFilter('q')} /></div>
            </div>
            {hasFilters && <button className="btn btn-link btn-sm px-0 mt-2" onClick={() => { setPage(1); setFilters(NO_FILTERS); }}>Clear filters</button>}
          </div></div>

          {stats ? <AdminCharts data={stats} /> : <Loader text="Loading charts..." />}

          <div className="card shadow-sm">
            <div className="card-header bg-white fw-semibold">Incidents {list && <span className="text-secondary fw-normal">({list.total})</span>}</div>
            {!list ? <Loader text="Loading incidents..." /> : list.incidents.length === 0 ? <div className="card-body text-center text-secondary py-5">No incidents match these filters</div> : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light"><tr><th>Report</th><th>Reporter</th><th>Category</th><th>Priority</th><th>Status</th><th>Responder</th><th>Submitted</th><th /></tr></thead>
                  <tbody>
                    {list.incidents.map((i) => (
                      <tr key={i.id}>
                        <td><Link to={`/incidents/${i.id}`} className="fw-semibold">{i.reportId}</Link>{i.isUrgent && <span className="badge text-bg-danger ms-2">Urgent</span>}{i.aiStatus === 'failed' && <div className="text-warning small">AI failed</div>}</td>
                        <td>{i.reporterName || '-'}</td>
                        <td>{i.category || '-'}</td>
                        <td><PriorityBadge priority={i.priority} /></td>
                        <td><StatusBadge status={i.status} /></td>
                        <td>{i.assignedResponderName || (i.assignedCategory ? `${i.assignedCategory} group` : '-')}</td>
                        <td className="small">{new Date(i.createdAt).toLocaleString('en-IN')}</td>
                        <td className="text-end"><button className="btn btn-outline-primary btn-sm" onClick={() => setSelected(i)}>Manage</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {list && list.pages > 1 && (
              <div className="card-footer bg-white d-flex justify-content-between align-items-center">
                <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                <span className="small text-secondary">Page {list.page} of {list.pages}</span>
                <button className="btn btn-outline-secondary btn-sm" disabled={page >= list.pages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            )}
            <div className="card-footer bg-white small text-secondary">AI-generated classification. Final priority should be verified by an authorized responder.</div>
          </div>
        </>
      )}
      {selected && <AdminIncidentModal incident={selected} responders={responders} onClose={() => setSelected(null)} onChanged={loadAll} />}
    </>
  );
}

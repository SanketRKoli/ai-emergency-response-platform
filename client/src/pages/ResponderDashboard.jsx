import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api/axios.js';
import StatCards from '../components/StatCards.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import Loader from '../components/Loader.jsx';

const FILTERS = [['all', 'All'], ['new', 'New'], ['mine', 'My active'], ['resolved', 'Resolved']];
const matches = (f, i) =>
  f === 'all' || (f === 'new' && i.claimable) || (f === 'mine' && i.mine && ['Accepted', 'In Progress'].includes(i.status)) || (f === 'resolved' && i.status === 'Resolved');
const where = (i) => i.locationDescription || (i.latitude != null ? `${i.latitude.toFixed(4)}, ${i.longitude.toFixed(4)}` : '-');
const isHigh = (i) => ['High', 'Critical'].includes(i.priority) && ['Assigned', 'Accepted', 'In Progress'].includes(i.status);

export default function ResponderDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState('');

  const load = () => api.get('/responder/incidents').then((res) => { setData(res.data); setError(''); }).catch((err) => setError(errorMessage(err)));
  // Load now, then refresh every 10 seconds so new incidents appear without reloading the page.
  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const accept = async (id) => {
    setBusyId(id);
    try { await api.put(`/responder/incidents/${id}/accept`); await load(); } catch (err) { setError(errorMessage(err)); await load(); } finally { setBusyId(''); }
  };

  const s = data?.stats;
  const rows = data ? data.incidents.filter((i) => matches(filter, i)) : [];
  return (
    <>
      <h1 className="h4 mb-0">Responder Dashboard</h1>
      <p className="text-secondary small mb-4">Group: {data?.group || '...'}</p>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <StatCards items={[['New Incidents', '', s?.newIncidents], ['Assigned', '', s?.assigned], ['High Priority', 'warn', s?.highPriority], ['In Progress', '', s?.inProgress], ['Resolved', 'ok', s?.resolved]]} />

      <div className="card shadow-sm">
        <div className="card-header bg-white d-flex flex-wrap gap-2 align-items-center">
          <span className="fw-semibold me-auto">Incidents</span>
          {FILTERS.map(([k, label]) => (
            <button key={k} className={`btn btn-sm ${filter === k ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
        {!data ? <Loader text="Loading incidents..." /> : rows.length === 0 ? (
          <div className="card-body text-center py-5 text-secondary"><div className="fs-5 mb-1">No incidents here</div><div className="small">New reports for your group appear automatically.</div></div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light"><tr><th>Incident</th><th>Category</th><th>Description</th><th>Location</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id}>
                    <td>
                      {isHigh(i) && <div className="text-danger fw-bold small">🚨 {i.priority.toUpperCase()} PRIORITY</div>}
                      <Link to={`/incidents/${i.id}`} className="fw-semibold">{i.reportId}</Link>
                      {i.isUrgent && <span className="badge text-bg-danger ms-2">Urgent</span>}
                      <div><PriorityBadge priority={i.priority} /> {i.mine && <span className="badge text-bg-light border">Mine</span>}</div>
                    </td>
                    <td>{i.category || '-'}</td>
                    <td style={{ maxWidth: 260 }}>{i.description.length > 90 ? `${i.description.slice(0, 90)}...` : i.description}</td>
                    <td>{where(i)}</td>
                    <td><StatusBadge status={i.status} /></td>
                    <td className="text-nowrap">
                      <Link to={`/incidents/${i.id}`} className="btn btn-outline-primary btn-sm me-1">View details</Link>
                      {i.claimable && <button className="btn btn-success btn-sm" disabled={busyId === i.id} onClick={() => accept(i.id)}>{busyId === i.id ? '...' : 'Accept'}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="card-footer bg-white small text-secondary">AI-generated classification. Final priority should be verified by an authorized responder.</div>
      </div>
    </>
  );
}

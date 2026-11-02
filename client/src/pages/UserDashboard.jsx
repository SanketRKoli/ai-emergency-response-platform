import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api, { errorMessage } from '../api/axios.js';
import StatCards from '../components/StatCards.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import Loader from '../components/Loader.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const where = (i) => i.locationDescription || (i.latitude != null ? `${i.latitude.toFixed(4)}, ${i.longitude.toFixed(4)}` : '-');

export default function UserDashboard() {
  const { user } = useAuth();
  const { state } = useLocation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/incidents').then((res) => setData(res.data)).catch((err) => setError(errorMessage(err)));
  useEffect(() => { load(); }, []);

  // While any report is still being analysed by the AI, refresh the list every few seconds.
  const analysing = data?.incidents.some((i) => ['pending', 'processing'].includes(i.aiStatus));
  useEffect(() => {
    if (!analysing) return undefined;
    const t = setTimeout(load, 4000);
    return () => clearTimeout(t);
  }, [analysing, data]);

  const s = data?.stats;
  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="h4 mb-0">Welcome, {user.name}</h1>
          <span className="text-secondary small">Your reports and their status</span>
        </div>
        <Link to="/report" className="btn btn-danger btn-lg">🚨 Report Emergency</Link>
      </div>

      {state?.submitted && (
        <div className="alert alert-success" role="alert">
          {state.urgent ? 'Urgent report' : 'Report'} <strong>{state.submitted}</strong> was submitted. It is saved and waiting for review.
        </div>
      )}

      <StatCards items={[['Total Reports', '', s?.total], ['Pending', '', s?.pending], ['In Progress', '', s?.inProgress], ['Resolved', 'ok', s?.resolved], ['High Priority', 'warn', s?.highPriority]]} />

      <div className="card shadow-sm">
        <div className="card-header bg-white fw-semibold">Recent reports</div>
        {error ? <div className="card-body"><div className="alert alert-danger mb-0">{error}</div></div>
          : !data ? <Loader text="Loading your reports..." />
          : data.incidents.length === 0 ? (
            <div className="card-body text-center py-5 text-secondary">
              <div className="fs-5 mb-1">No reports yet</div>
              <Link to="/report">Report your first incident</Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr><th>Report ID</th><th>Category</th><th>Priority</th><th>Location</th><th>Submitted</th><th>Status</th></tr></thead>
                <tbody>
                  {data.incidents.map((i) => (
                    <tr key={i.id}>
                      <td className="fw-semibold"><Link to={`/incidents/${i.id}`}>{i.reportId}</Link>{i.isUrgent && <span className="badge text-bg-danger ms-2">Urgent</span>}</td>
                      <td>{i.category || <span className="text-secondary">{i.aiStatus === 'failed' ? 'Manual review' : 'Analysing...'}</span>}</td>
                      <td><PriorityBadge priority={i.priority} /></td>
                      <td>{where(i)}</td>
                      <td>{new Date(i.createdAt).toLocaleString('en-IN')}</td>
                      <td><StatusBadge status={i.status} /></td>
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

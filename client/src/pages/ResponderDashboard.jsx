import StatCards from '../components/StatCards.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function ResponderDashboard() {
  const { user } = useAuth();
  return (
    <>
      <h1 className="h4 mb-0">Responder Dashboard</h1>
      <p className="text-secondary small mb-4">Group: {user.responderCategory}</p>
      <StatCards items={[['New Incidents'], ['Assigned'], ['High Priority', 'warn'], ['In Progress'], ['Resolved', 'ok']]} />
      <div className="card shadow-sm"><div className="card-body text-center py-5 text-secondary">
        <div className="fs-5 mb-1">No incidents yet</div>
        <div className="small">Incident handling is built in a later stage.</div>
      </div></div>
    </>
  );
}

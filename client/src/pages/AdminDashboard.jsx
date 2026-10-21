import StatCards from '../components/StatCards.jsx';

export default function AdminDashboard() {
  return (
    <>
      <h1 className="h4 mb-4">Admin Dashboard</h1>
      <StatCards items={[['Total Incidents'], ['Pending'], ['High Priority', 'warn'], ['In Progress'], ['Resolved', 'ok']]} />
      <div className="card shadow-sm"><div className="card-body text-center py-5 text-secondary">
        <div className="fs-5 mb-1">No data yet</div>
        <div className="small">Analytics and user management are built in a later stage.</div>
      </div></div>
    </>
  );
}

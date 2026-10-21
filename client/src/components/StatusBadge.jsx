const COLORS = {
  Submitted: 'secondary',
  'AI Analyzed': 'info',
  'Pending Assignment': 'warning',
  Assigned: 'primary',
  Accepted: 'primary',
  'In Progress': 'warning',
  Resolved: 'success',
};

export default function StatusBadge({ status }) {
  return <span className={`badge text-bg-${COLORS[status] || 'secondary'}`}>{status}</span>;
}

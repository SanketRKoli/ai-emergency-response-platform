const COLORS = { Low: 'secondary', Medium: 'info', High: 'warning', Critical: 'danger' };

export default function PriorityBadge({ priority }) {
  if (!priority) return <span className="text-secondary">-</span>;
  return <span className={`badge text-bg-${COLORS[priority] || 'secondary'}`}>{priority}</span>;
}

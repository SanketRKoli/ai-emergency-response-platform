// Visual progress of a report: done steps are ticked, the current step is highlighted, later steps are empty.
const STEPS = [
  ['Submitted', 'Report submitted'],
  ['AI Analyzed', 'AI analysed'],
  ['Assigned', 'Responder group assigned'],
  ['Accepted', 'Accepted by a responder'],
  ['In Progress', 'Response in progress'],
  ['Resolved', 'Resolved'],
];

export default function StatusTimeline({ incident }) {
  const at = {};
  for (const h of incident.history || []) if (!at[h.status]) at[h.status] = h.timestamp; // first time each status was reached

  const pending = incident.status === 'Pending Assignment';
  const reached = STEPS.findIndex(([s]) => s === (pending ? 'AI Analyzed' : incident.status));
  const aiFailed = incident.aiStatus === 'failed' && incident.status === 'Submitted';

  return (
    <ul className="list-unstyled mb-0">
      {STEPS.map(([status, label], i) => {
        const done = i < reached || incident.status === 'Resolved';
        const current = i === reached && !done;
        const isPendingSlot = pending && status === 'Assigned';
        const icon = done ? '✓' : current || isPendingSlot ? '●' : '○';
        const color = done ? 'text-success' : current ? 'text-primary' : isPendingSlot ? 'text-warning' : 'text-secondary';
        return (
          <li key={status} className="d-flex gap-3 pb-2">
            <span className={`fs-5 lh-1 ${color}`} style={{ width: 22 }}>{icon}</span>
            <div>
              <div className={done || current ? 'fw-semibold' : 'text-secondary'}>{isPendingSlot ? 'Waiting for a responder to be assigned' : label}</div>
              {at[status] && <div className="text-secondary small">{new Date(at[status]).toLocaleString('en-IN')}</div>}
              {status === 'AI Analyzed' && aiFailed && <div className="text-warning small">AI analysis unavailable; waiting for manual review</div>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

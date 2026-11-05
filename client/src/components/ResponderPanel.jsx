import { useState } from 'react';
import api, { errorMessage } from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

// Actions a responder can take on an incident: accept, start response, add notes, resolve.
export default function ResponderPanel({ incident, onChanged }) {
  const { user } = useAuth();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const mine = incident.assignedResponderId && String(incident.assignedResponderId) === String(user.id);
  const claimable = incident.status === 'Assigned' && !incident.assignedResponderId;
  const base = `/responder/incidents/${incident.id}`;

  const run = async (call) => {
    setBusy(true);
    setError('');
    try { await call(); setNote(''); onChanged(); } catch (err) { setError(errorMessage(err)); onChanged(); } finally { setBusy(false); }
  };

  let body;
  if (claimable) {
    body = <button className="btn btn-success" disabled={busy} onClick={() => run(() => api.put(`${base}/accept`))}>Accept incident</button>;
  } else if (mine && incident.status === 'Accepted') {
    body = (
      <>
        <textarea className="form-control mb-2" rows={2} maxLength={1000} placeholder="Optional note (for example: team is on the way)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn btn-primary" disabled={busy} onClick={() => run(() => api.put(`${base}/status`, { status: 'In Progress', note }))}>Start response</button>
      </>
    );
  } else if (mine && incident.status === 'In Progress') {
    body = (
      <>
        <textarea className="form-control mb-2" rows={3} maxLength={1000} placeholder="Write a response note, or the resolution note (required to resolve)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-outline-primary" disabled={busy || note.trim().length < 1} onClick={() => run(() => api.post(`${base}/notes`, { note }))}>Add note</button>
          <button className="btn btn-success" disabled={busy || note.trim().length < 3} onClick={() => run(() => api.put(`${base}/status`, { status: 'Resolved', note }))}>Mark resolved</button>
        </div>
      </>
    );
  } else if (incident.status === 'Resolved') {
    body = <div className="text-success">This incident has been resolved.</div>;
  } else if (incident.status === 'Pending Assignment') {
    body = <div className="text-secondary">No responder has been assigned yet. An administrator will assign it.</div>;
  } else {
    body = <div className="text-secondary">{incident.assignedResponderName ? `Handled by ${incident.assignedResponderName}.` : 'You can view this incident, but it is not assigned to you.'}</div>;
  }

  return (
    <div className="card shadow-sm mb-3 border-primary"><div className="card-body">
      <div className="fw-semibold mb-2">Responder actions</div>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {body}
    </div></div>
  );
}

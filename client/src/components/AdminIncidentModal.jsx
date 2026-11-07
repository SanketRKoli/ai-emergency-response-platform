import { useState } from 'react';
import api, { errorMessage } from '../api/axios.js';

const CATEGORIES = ['Fire', 'Medical', 'Security', 'Accident', 'Infrastructure', 'Maintenance', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const CAN_ASSIGN = ['Submitted', 'AI Analyzed', 'Pending Assignment', 'Assigned', 'Accepted', 'In Progress'];

// Admin actions on one incident: assign or reassign a responder, and correct the AI's classification.
export default function AdminIncidentModal({ incident, responders, onClose, onChanged }) {
  const [responderId, setResponderId] = useState('');
  const [category, setCategory] = useState(incident.category || 'Other');
  const [priority, setPriority] = useState(incident.priority || 'Medium');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const run = async (call, message) => {
    setBusy(true); setError(''); setDone('');
    try { await call(); setDone(message); onChanged(); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  const group = (r) => r.responderCategory;
  const sorted = [...responders].sort((a, b) => (group(a) === incident.assignedCategory ? -1 : 0) - (group(b) === incident.assignedCategory ? -1 : 0));

  return (
    <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }} role="dialog">
      <div className="modal-dialog modal-dialog-centered"><div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Manage {incident.reportId}</h5>
          <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
        </div>
        <div className="modal-body">
          <p className="small text-secondary">{incident.description.length > 140 ? `${incident.description.slice(0, 140)}...` : incident.description}</p>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          {done && <div className="alert alert-success py-2">{done}</div>}

          <div className="fw-semibold mb-1">Correct the AI classification</div>
          <div className="text-secondary small mb-2">AI suggested: {incident.aiCategory || '-'} / {incident.aiPriority || '-'}. Your correction is stored separately and the AI's values are kept.</div>
          <div className="row g-2 mb-3">
            <div className="col"><select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className="col"><select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></div>
            <div className="col-auto"><button className="btn btn-outline-primary" disabled={busy} onClick={() => run(() => api.put(`/admin/incidents/${incident.id}/classification`, { category, priority }), 'Classification updated.')}>Save</button></div>
          </div>

          <div className="fw-semibold mb-1">Assign to a responder</div>
          {!CAN_ASSIGN.includes(incident.status) ? <div className="text-secondary small">A {incident.status} incident cannot be assigned.</div> : (
            <div className="d-flex gap-2">
              <select className="form-select" value={responderId} onChange={(e) => setResponderId(e.target.value)}>
                <option value="">Choose a responder...</option>
                {sorted.map((r) => <option key={r.id} value={r.id}>{r.name} ({group(r)})</option>)}
              </select>
              <button className="btn btn-success" disabled={busy || !responderId} onClick={() => run(() => api.put(`/admin/incidents/${incident.id}/assign`, { responderId }), 'Assigned. The responder and the reporter were notified.')}>Assign</button>
            </div>
          )}
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Close</button></div>
      </div></div>
    </div>
  );
}

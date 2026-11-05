import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api/axios.js';
import Loader from '../components/Loader.jsx';
import MapView from '../components/MapView.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import ResponderPanel from '../components/ResponderPanel.jsx';
import { useAuth, homeFor } from '../context/AuthContext.jsx';

const methodLabel = (m) => {
  if (!m) return '';
  if (m.startsWith('rules')) return m.includes('fallback') ? 'Keyword rules (used because the language model was unavailable)' : 'Keyword rules (baseline, not machine learning)';
  const [provider, model] = m.split(':');
  return `Language model: ${model} (${provider})`;
};

export default function IncidentDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [incident, setIncident] = useState(null);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tick, setTick] = useState(0); // bump to reload after a responder action

  // Reload every few seconds while the AI analysis is still running.
  useEffect(() => {
    let stop = false;
    let timer;
    const load = () => api.get(`/incidents/${id}`)
      .then((res) => {
        if (stop) return;
        setIncident(res.data.incident);
        if (['pending', 'processing'].includes(res.data.incident.aiStatus)) timer = setTimeout(load, 4000);
      })
      .catch((err) => !stop && setError(errorMessage(err)));
    load();
    return () => { stop = true; clearTimeout(timer); };
  }, [id, tick]);

  // The photo needs the login token, so it is fetched through the API and shown from memory.
  useEffect(() => {
    if (!incident?.hasImage || imageUrl) return undefined;
    let url;
    api.get(`/incidents/${id}/image`, { responseType: 'blob' }).then((res) => { url = URL.createObjectURL(res.data); setImageUrl(url); }).catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [incident?.hasImage, id]);

  if (error) return <div className="alert alert-danger">{error} <Link to={homeFor(user.role)}>Back</Link></div>;
  if (!incident) return <Loader text="Loading report..." />;
  const i = incident;
  const hasCoords = i.latitude != null && i.longitude != null;
  const analysing = ['pending', 'processing'].includes(i.aiStatus);

  return (
    <div className="mx-auto" style={{ maxWidth: 820 }}>
      <Link to={homeFor(user.role)} className="small">&larr; Back to dashboard</Link>
      <div className="d-flex flex-wrap align-items-center gap-2 mt-2 mb-3">
        <h1 className="h4 mb-0">{i.reportId}</h1>
        <StatusBadge status={i.status} />
        {i.isUrgent && <span className="badge text-bg-danger">Urgent</span>}
        <span className="text-secondary small ms-auto">{new Date(i.createdAt).toLocaleString('en-IN')}</span>
      </div>
      {i.assignedResponderName && <div className="text-secondary small mb-3">Assigned responder: <strong>{i.assignedResponderName}</strong></div>}
      {user.role === 'Responder' && <ResponderPanel incident={i} onChanged={() => setTick((t) => t + 1)} />}

      <div className="card shadow-sm mb-3"><div className="card-body">
        <div className="fw-semibold mb-1">Description</div>
        <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{i.description}</p>
        {i.reporterName && <div className="text-secondary small mt-2">Reported by {i.reporterName}</div>}
      </div></div>

      <div className="card shadow-sm mb-3"><div className="card-body">
        <div className="fw-semibold mb-2">AI analysis</div>
        {analysing && <div className="text-secondary"><span className="spinner-border spinner-border-sm me-2" />AI analysis in progress...</div>}
        {i.aiStatus === 'failed' && <div className="alert alert-warning mb-0 py-2">AI analysis was not available. This report is waiting for manual review by an administrator.</div>}
        {i.aiStatus === 'completed' && (
          <>
            <div className="d-flex flex-wrap gap-4 mb-2">
              <div><div className="text-secondary small">Category</div><div className="fs-5 fw-semibold">{i.category}</div></div>
              <div><div className="text-secondary small">Priority</div><div className="fs-5"><PriorityBadge priority={i.priority} /></div></div>
              <div><div className="text-secondary small">Assigned group</div><div className="fs-5 fw-semibold">{i.assignedCategory || '-'}</div></div>
            </div>
            <p className="mb-1"><span className="text-secondary">Summary:</span> {i.aiSummary}</p>
            <p className="mb-2"><span className="text-secondary">Reason:</span> {i.aiReason}</p>
            <div className="text-secondary small mb-2">{methodLabel(i.aiMethod)}</div>
            <div className="alert alert-info py-2 mb-0 small">AI-generated classification. Final priority should be verified by an authorized responder.</div>
          </>
        )}
      </div></div>

      <div className="card shadow-sm mb-3"><div className="card-body">
        <div className="fw-semibold mb-2">Location</div>
        {i.locationDescription && <p className="mb-2">{i.locationDescription}</p>}
        {hasCoords && (
          <>
            <div className="text-secondary small mb-2">{i.latitude.toFixed(5)}, {i.longitude.toFixed(5)} ({i.locationSource === 'gps' ? 'from GPS' : i.locationSource === 'map' ? 'picked on the map' : 'typed'})</div>
            <MapView lat={i.latitude} lng={i.longitude} />
            <a className="btn btn-outline-primary btn-sm mt-2" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${i.latitude}&mlon=${i.longitude}#map=17/${i.latitude}/${i.longitude}`}>📍 Open Location on Map</a>
          </>
        )}
        {!hasCoords && !i.locationDescription && <span className="text-secondary">No location</span>}
      </div></div>

      {i.hasImage && (
        <div className="card shadow-sm mb-3"><div className="card-body">
          <div className="fw-semibold mb-2">Photo</div>
          {imageUrl ? <img src={imageUrl} alt="Incident" className="img-fluid rounded border" style={{ maxHeight: 360 }} /> : <Loader text="Loading photo..." />}
        </div></div>
      )}

      <div className="card shadow-sm mb-4"><div className="card-body">
        <div className="fw-semibold mb-2">Status history</div>
        <ul className="list-group list-group-flush">
          {i.history.map((h, k) => (
            <li className="list-group-item px-0" key={k}>
              <StatusBadge status={h.status} /> <span className="ms-2">{h.note}</span>
              <div className="text-secondary small">{new Date(h.timestamp).toLocaleString('en-IN')} · {h.changedBy}</div>
            </li>
          ))}
        </ul>
      </div></div>
    </div>
  );
}

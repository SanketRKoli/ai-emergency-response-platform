import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.js';

const timeAgo = (iso) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString('en-IN');
};

// Bell with an unread badge and a dropdown list. Refreshes every 15 seconds.
export default function NotificationBell() {
  const navigate = useNavigate();
  const box = useRef(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ unread: 0, notifications: [] });

  const load = () => api.get('/notifications').then((res) => setData(res.data)).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  // Close when clicking anywhere outside the dropdown.
  useEffect(() => {
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) { await api.put(`/notifications/${n.id}/read`).catch(() => {}); load(); }
    if (n.incidentId) navigate(`/incidents/${n.incidentId}`);
  };
  const readAll = async () => { await api.put('/notifications/read-all').catch(() => {}); load(); };

  return (
    <div className="position-relative" ref={box}>
      <button className="btn btn-outline-light btn-sm position-relative" aria-label="Notifications" onClick={() => { setOpen((o) => !o); load(); }}>
        🔔
        {data.unread > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">{data.unread > 9 ? '9+' : data.unread}</span>}
      </button>
      {open && (
        <div className="card shadow position-absolute end-0 mt-2 text-dark" style={{ width: 340, maxWidth: '90vw', zIndex: 1050 }}>
          <div className="card-header bg-white d-flex justify-content-between align-items-center">
            <strong>Notifications</strong>
            {data.unread > 0 && <button className="btn btn-link btn-sm p-0" onClick={readAll}>Mark all read</button>}
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {data.notifications.length === 0 ? (
              <div className="p-4 text-center text-secondary small">No notifications yet</div>
            ) : (
              <ul className="list-group list-group-flush">
                {data.notifications.map((n) => (
                  <li key={n.id} role="button" className={`list-group-item list-group-item-action ${n.read ? '' : 'bg-light'}`} onClick={() => openItem(n)}>
                    <div className={`small ${n.read ? '' : 'fw-semibold'}`}>{!n.read && <span className="text-primary me-1">●</span>}{n.message}</div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>{timeAgo(n.createdAt)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { Link, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="navbar navbar-dark bg-dark">
      <div className="container">
        <Link className="navbar-brand fw-semibold" to={user ? homeFor(user.role) : '/login'}>
          <span className="brand-dot" />AI Emergency Response Platform
        </Link>
        {user && (
          <div className="d-flex align-items-center gap-3 text-light">
            <NotificationBell />
            <span className="d-none d-sm-inline">{user.name}</span>
            <span className="badge text-bg-secondary">{user.role}{user.responderCategory ? ` · ${user.responderCategory}` : ''}</span>
            <button className="btn btn-outline-light btn-sm" onClick={onLogout}>Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
}

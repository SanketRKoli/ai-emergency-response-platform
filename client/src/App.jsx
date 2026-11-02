import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import ReportIncident from './pages/ReportIncident.jsx';
import IncidentDetails from './pages/IncidentDetails.jsx';
import ResponderDashboard from './pages/ResponderDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import NotFound from './pages/NotFound.jsx';
import { useAuth, homeFor } from './context/AuthContext.jsx';

export default function App() {
  const { user } = useAuth();
  return (
    <>
      <Navbar />
      <main className="container py-4">
        <Routes>
          <Route path="/" element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute roles={['User']}><UserDashboard /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute roles={['User']}><ReportIncident /></ProtectedRoute>} />
          <Route path="/incidents/:id" element={<ProtectedRoute roles={['User', 'Responder', 'Admin']}><IncidentDetails /></ProtectedRoute>} />
          <Route path="/responder" element={<ProtectedRoute roles={['Responder']}><ResponderDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}

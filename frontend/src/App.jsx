import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import RunsList from './pages/RunsList';
import RunDetail from './pages/RunDetail';
import FlakyTests from './pages/FlakyTests';
import TestCases from './pages/TestCases';
import TestCaseDetail from './pages/TestCaseDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

function DashboardShell() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <div className="app-header">
        <h1>Test Automation Dashboard</h1>
        <nav className="app-nav" style={{ display: 'flex', alignItems: 'baseline' }}>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Overview
          </NavLink>
          <NavLink to="/runs" className={({ isActive }) => (isActive ? 'active' : '')}>
            Runs
          </NavLink>
          <NavLink to="/flaky" className={({ isActive }) => (isActive ? 'active' : '')}>
            Flaky Tests
          </NavLink>
          <NavLink to="/testcases" className={({ isActive }) => (isActive ? 'active' : '')}>
            Test Cases
          </NavLink>
          <span className="user-badge">
            <span className="muted">{user?.name}</span>
            <button type="button" className="btn-link" onClick={logout}>
              Log out
            </button>
          </span>
        </nav>
      </div>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/runs" element={<RunsList />} />
        <Route path="/runs/:id" element={<RunDetail />} />
        <Route path="/flaky" element={<FlakyTests />} />
        <Route path="/testcases" element={<TestCases />} />
        <Route path="/testcases/:id" element={<TestCaseDetail />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardShell />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

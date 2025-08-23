import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  console.log('Dashboard rendered - User:', user);

  const handleLogout = () => {
    console.log('Logout clicked');
    logout();
    navigate('/login');
    console.log('Navigated to login after logout');
  };

  const handleNavigation = (path) => {
    console.log('Navigating to:', path);
    navigate(path);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>HBICS Dismissal System</h1>
          <div className="user-info">
            <span>Welcome, {user?.username}</span>
            <span className="user-role">({user?.role})</span>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <h2>Welcome to the Dismissal System</h2>
          <p>Select an option below to get started:</p>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card" onClick={() => handleNavigation('/teacher')}>
            <h3>Teacher Dashboard</h3>
            <p>Manage student check-ins and check-outs</p>
            <div className="card-icon">📋</div>
          </div>

          {user?.role === 'admin' && (
            <div className="dashboard-card" onClick={() => handleNavigation('/admin')}>
              <h3>Admin Dashboard</h3>
              <p>Manage students, users, and system settings</p>
              <div className="card-icon">⚙️</div>
            </div>
          )}

          <div className="dashboard-card">
            <h3>Quick Stats</h3>
            <p>View today's activity and reports</p>
            <div className="card-stats">
              <div className="stat">
                <span className="stat-number">0</span>
                <span className="stat-label">Active Students</span>
              </div>
              <div className="stat">
                <span className="stat-number">0</span>
                <span className="stat-label">Today's Check-ins</span>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <h3>Help & Support</h3>
            <p>Get help with using the system</p>
            <div className="card-icon">❓</div>
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        <p>HBICS Dismissal System v1.0 | &copy; 2025</p>
      </footer>
    </div>
  );
};

export default Dashboard;

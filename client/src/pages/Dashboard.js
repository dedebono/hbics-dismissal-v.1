import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>HBICS Dismissal System Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user?.email || 'User'}</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>
      
      <main className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card" onClick={() => navigate('/dismissal-log')}>
            <h3>Basic Dismissal Log</h3>
            <p>Simple dismissal tracking system</p>
          </div>
          
          <div className="dashboard-card" onClick={() => navigate('/enhanced-dismissal-log')}>
            <h3>Enhanced Dismissal Log</h3>
            <p>Advanced dismissal tracking with analytics</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

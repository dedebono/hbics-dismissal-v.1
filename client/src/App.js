import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DismissalLog from './pages/DismissalLog';
import EnhancedDismissalLog from './pages/EnhancedDismissalLog';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/dismissal-log" element={
              <PrivateRoute>
                <DismissalLog />
              </PrivateRoute>
            } />
            <Route path="/enhanced-dismissal-log" element={
              <PrivateRoute>
                <EnhancedDismissalLog />
              </PrivateRoute>
            } />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

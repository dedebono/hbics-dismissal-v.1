import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import EducsDashboard from './pages/EducsDashboard'; // Import EducsDashboard
import DismissalLogs from './pages/DismissalLogs';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/student" element={<StudentDashboard />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
            />
            <Route
              path="/admin"
              element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>}
            />
            <Route
              path="/teacher"
              element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherDashboard /></ProtectedRoute>}
            />
            <Route
              path="/educs"
              element={<ProtectedRoute roles={['admin', 'educs']}><EducsDashboard /></ProtectedRoute>}
            />
            <Route
              path="/logs"
              element={<ProtectedRoute roles={['admin']}><DismissalLogs /></ProtectedRoute>}
            />

            {/* Fallback route - redirect to login or dashboard based on auth */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;

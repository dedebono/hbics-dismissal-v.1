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
import DismissalLogs from './pages/DismissalLogs';
import './App.css';

function App() {
  console.log('App component rendered');
  
  return (
    <AuthProvider>
      <SocketProvider>
        <div className="App">
          <Routes>
            {/* Default route for non-logged-in users */}
            <Route path="/" element={<Login />} />
            
            {/* Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Student Dashboard Route */}
            <Route path="/student" element={<StudentDashboard />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/teacher" element={
              <ProtectedRoute>
                <TeacherDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/logs" element={
              <ProtectedRoute requireAdmin={true}>
                <DismissalLogs />
              </ProtectedRoute>
            } />
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;

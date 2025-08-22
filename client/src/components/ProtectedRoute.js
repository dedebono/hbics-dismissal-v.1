import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth();

  console.log('ProtectedRoute - User:', user, 'Loading:', loading, 'RequireAdmin:', requireAdmin);

  if (loading) {
    console.log('ProtectedRoute: Loading state, showing loading indicator');
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    console.log('ProtectedRoute: No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    console.log('ProtectedRoute: Admin required but user is not admin, redirecting to home');
    return <Navigate to="/" replace />;
  }

  console.log('ProtectedRoute: Access granted, rendering children');
  return children;
};

export default ProtectedRoute;

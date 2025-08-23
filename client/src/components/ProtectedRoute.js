import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute - User:', user, 'Loading:', loading, 'RequireAdmin:', requireAdmin, 'Location:', location.pathname);

  if (loading) {
    console.log('ProtectedRoute: Loading state, showing loading indicator');
    return <div className="loading">Loading...</div>;  // Show loading state while determining the user authentication
  }

  // Don't redirect if we're already on the student dashboard (public route)
  if (!user && location.pathname !== '/') {
    console.log('ProtectedRoute: No user found, redirecting to student dashboard');
    return <Navigate to="/" replace />;  // Redirect to StudentDashboard if user is not logged in
  }

  if (requireAdmin && user.role !== 'admin') {
    console.log('ProtectedRoute: Admin required but user is not admin, redirecting to home');
    return <Navigate to="/" replace />;  // Redirect to home if the user is not an admin
  }

  console.log('ProtectedRoute: Access granted, rendering children');
  return children;  // User is logged in and has the required role, render the children components
};

export default ProtectedRoute;

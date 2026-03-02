import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="loading">Loading...</div>; // Show loading state
  }

  if (!user) {
    // If not logged in, redirect to the login page, preserving the intended location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // superadmin can access any route; or check if role is in allowed list
  if (roles && user.role !== 'superadmin' && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // If authenticated and authorized, render the child components
  return children;
};

export default ProtectedRoute;

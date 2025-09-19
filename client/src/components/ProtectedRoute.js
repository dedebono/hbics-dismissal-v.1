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

  if (roles && !roles.includes(user.role)) {
    // If the user's role is not in the allowed list, redirect to a default page
    // For example, a general dashboard or a "not authorized" page
    return <Navigate to="/dashboard" replace />;
  }

  // If authenticated and authorized, render the child components
  return children;
};

export default ProtectedRoute;

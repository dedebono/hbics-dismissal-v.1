import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  console.log('AuthProvider initialized - Token:', token, 'User:', user, 'Loading:', loading);

  useEffect(() => {
    console.log('AuthProvider useEffect triggered - Token:', token);
    if (token) {
      // Verify token and get user info
      const verifyToken = async () => {
        try {
          console.log('Verifying token...');
          // You might want to add a token verification endpoint
          // For now, we'll just decode the token
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('Token payload:', payload);
          setUser({
            id: payload.id,
            username: payload.username,
            role: payload.role
          });
          console.log('User set from token');
        } catch (error) {
          console.error('Token verification failed:', error);
          logout();
        } finally {
          setLoading(false);
          console.log('Loading set to false');
        }
      };
      verifyToken();
    } else {
      console.log('No token found, setting loading to false');
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
    console.log('Login attempt with username:', username);
    try {
      console.log('Calling authAPI.login...');
      const response = await authAPI.login(username, password);
      console.log('Login response:', response.data);
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      console.log('Login successful - Token stored, user set');
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = () => {
    console.log('Logging out user');
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    console.log('User logged out - token removed, state cleared');
  };

  const isAdmin = () => user?.role === 'admin';
  const isTeacher = () => user?.role === 'teacher';

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAdmin,
    isTeacher
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

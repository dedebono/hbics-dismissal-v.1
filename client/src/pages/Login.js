import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  console.log('Login component rendered - Username:', username, 'Loading:', loading);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Login form submitted');
    setLoading(true);
    console.log('Loading set to true');

    try {
      console.log('Attempting to initialize database...');
      // First try to initialize database if needed
      await authAPI.init();
      console.log('Database initialization successful');
    } catch (error) {
      console.log('Database may already be initialized or error:', error.message);
    }

    console.log('Calling login function...');
    const result = await login(username, password);
    console.log('Login result:', result);

    if (result.success) {
      toast.success('Login successful!');
      // Redirect based on role
      const userRole = JSON.parse(atob(localStorage.getItem('token').split('.')[1])).role;
      console.log('User role:', userRole);

      if (userRole === 'admin') {
        console.log('Redirecting to admin dashboard');
        navigate('/admin');
      } else if (userRole === 'teacher') {
        console.log('Redirecting to teacher dashboard');
        navigate('/teacher');
      } else if (userRole === 'student') {
        console.log('Redirecting to student dashboard');
        navigate('/student');
      } else if (userRole === 'educs') {
        console.log('Redirecting to educs dashboard');
        navigate('/educs');
      }
    } else {
      console.log('Login failed:', result.message);
      toast.error(result.message);
    }

    setLoading(false);
    console.log('Loading set to false');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>HBICS DISMISSAL SYSTEM</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="login-btn">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="demo-credentials">
                  </div>

        <div className="logo">
          <img src="/logohbics.png" alt="HBICS Logo" />
          <div className="credits">
            Dismissal App Version 1.0 | &copy;2025
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

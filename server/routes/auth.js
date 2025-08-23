const express = require('express');
const User = require('../models/User');
const { generateToken, authenticateToken, requireAdmin } = require('../middleware/auth');
const { initDatabase } = require('../config/database');

const router = express.Router();

// Initialize database with default admin user
router.post('/init', async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      initDatabase((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check if admin user exists
    User.findByUsername('admin', (err, adminUser) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (!adminUser) {
        // Create default admin user
        User.create({
          username: 'admin',
          password: 'admin123',
          role: 'admin'
        }, (err, user) => {
          if (err) {
            return res.status(500).json({ message: 'Error creating admin user' });
          }
          res.json({ 
            message: 'Database initialized successfully',
            adminUser: { username: user.username, role: user.role }
          });
        });
      } else {
        res.json({ message: 'Database already initialized' });
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Initialization failed' });
  }
});

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  User.findByUsername(username, (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    User.verifyPassword(password, user.password, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ message: 'Authentication error' });
      }

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = generateToken({
        id: user.id,
        username: user.username,
        role: user.role
      });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    });
  });
});

// Get current user profile
router.get('/profile', (req, res) => {
  // This route should be protected by authentication middleware
  // For now, it's just a placeholder
  res.json({ message: 'Profile endpoint - requires authentication' });
});

// Change password
router.post('/change-password', (req, res) => {
  // This would require authentication middleware
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password required' });
  }

  res.json({ message: 'Password change endpoint - requires authentication' });
});

// Create user (protected - admin only)
router.post('/create-user', authenticateToken, requireAdmin, (req, res) => {
  const { username, password, role = 'teacher' } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({ 
      message: 'Username and password are required' 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      message: 'Password must be at least 6 characters long' 
    });
  }

  // Validate role
  const validRoles = ['admin', 'teacher', 'student'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ 
      message: 'Invalid role. Must be either "admin" or "teacher" or "student"' 
    });
  }

  // Check if username already exists
  User.findByUsername(username, (err, existingUser) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (existingUser) {
      return res.status(409).json({ 
        message: 'Username already exists' 
      });
    }

    // Create new user
    User.create({
      username,
      password,
      role
    }, (err, user) => {
      if (err) {
        return res.status(500).json({ 
          message: 'Error creating user',
          error: err.message 
        });
      }

      res.status(201).json({
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} user created successfully`,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          created_at: new Date().toISOString()
        }
      });
    });
  });
});

module.exports = router;

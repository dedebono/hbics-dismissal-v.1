const express = require('express');
const User = require('../models/User');
const School = require('../models/School');
const { generateToken, authenticateToken, requireAdmin, requireSuperAdmin } = require('../middleware/auth');
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
        // Create default admin user for Default School (id=1)
        User.create({
          username: 'admin',
          password: 'admin123',
          role: 'admin',
          school_id: 1
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

      if (user.school_id) {
        School.findById(user.school_id, (err, school) => {
          const schoolName = school?.name || null;
          const token = generateToken({
            id: user.id,
            username: user.username,
            role: user.role,
            school_id: user.school_id || null,
            school_name: schoolName
          });

          res.json({
            message: 'Login successful',
            token,
            user: {
              id: user.id,
              username: user.username,
              role: user.role,
              school_id: user.school_id || null,
              school_name: schoolName
            }
          });
        });
      } else {
        const token = generateToken({
          id: user.id,
          username: user.username,
          role: user.role,
          school_id: user.school_id || null,
          school_name: null
        });

        res.json({
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            school_id: user.school_id || null,
            school_name: null
          }
        });
      }
    });
  });
});

// Get current user profile
router.get('/profile', (req, res) => {
  res.json({ message: 'Profile endpoint - requires authentication' });
});

// Change password
router.post('/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password required' });
  }

  res.json({ message: 'Password change endpoint - requires authentication' });
});

// Create user (admin: can create teachers/students in own school; superadmin: can create admins for any school)
router.post('/create-user', authenticateToken, requireAdmin, (req, res) => {
  const { username, password, role = 'teacher', school_id } = req.body;

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

  // Role validation based on who is creating
  if (req.user.role === 'superadmin') {
    const validRoles = ['admin', 'teacher', 'student', 'educs', 'parents'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
  } else {
    // Regular admin can only create non-admin users in own school
    const validRoles = ['teacher', 'student', 'educs', 'parents'];
    if (!validRoles.includes(role)) {
      return res.status(403).json({
        message: 'Admins can only create teacher, student, educs or parents accounts'
      });
    }
  }

  // Determine school_id to use
  const targetSchoolId = req.user.role === 'superadmin'
    ? (school_id || null)
    : req.user.school_id;

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
      role,
      school_id: targetSchoolId
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
          school_id: user.school_id,
          created_at: new Date().toISOString()
        }
      });
    });
  });
});

module.exports = router;

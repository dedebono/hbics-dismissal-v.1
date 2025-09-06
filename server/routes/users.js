const express = require('express');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  User.getAll((err, users) => {
    if (err) {
      return res.status(500).json({ 
        message: 'Error fetching users',
        error: err.message 
      });
    }

    res.json({
      message: 'Users retrieved successfully',
      users: users,
      count: users.length
    });
  });
});

// Get user by ID (admin only)
router.get('/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  User.findById(userId, (err, user) => {
    if (err) {
      return res.status(500).json({ 
        message: 'Error fetching user',
        error: err.message 
      });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User retrieved successfully',
      user: user
    });
  });
});

// Delete user by ID (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  User.delete(userId, (err, result) => {
    if (err) {
      return res.status(500).json({ 
        message: 'Error deleting user',
        error: err.message 
      });
    }

    if (result.changes === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  });
});

module.exports = router;

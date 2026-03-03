const express = require('express');
const User = require('../models/User');
const { authenticateToken, requireAdmin, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// Get users — superadmin sees all, admin sees own school only
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  if (req.user.role === 'superadmin') {
    User.getAll((err, users) => {
      if (err) {
        return res.status(500).json({ message: 'Error fetching users', error: err.message });
      }
      res.json({ message: 'Users retrieved successfully', users, count: users.length });
    });
  } else {
    User.getAllBySchool(req.user.school_id, (err, users) => {
      if (err) {
        return res.status(500).json({ message: 'Error fetching users', error: err.message });
      }
      res.json({ message: 'Users retrieved successfully', users, count: users.length });
    });
  }
});

// Get user by ID (admin only)
router.get('/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  User.findById(userId, (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching user', error: err.message });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Regular admin cannot see users from other schools
    if (req.user.role === 'admin' && user.school_id !== req.user.school_id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ message: 'User retrieved successfully', user });
  });
});

// Delete user by ID
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  User.findById(userId, (err, targetUser) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching user', error: err.message });
    }

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent self-deletion
    if (targetUser.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Regular admin can only delete users from own school, not other admins
    if (req.user.role === 'admin') {
      if (targetUser.school_id !== req.user.school_id) {
        return res.status(403).json({ message: 'Cannot delete users from other schools' });
      }
      if (targetUser.role === 'admin' || targetUser.role === 'superadmin') {
        return res.status(403).json({ message: 'Cannot delete admin accounts' });
      }
    }

    // SuperAdmin cannot delete other superadmins
    if (req.user.role === 'superadmin' && targetUser.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot delete superadmin accounts' });
    }

    User.delete(userId, (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error deleting user', error: err.message });
      }

      if (result.changes === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User deleted successfully' });
    });
  });
});

// Change own password (admin can only change their own)
router.put('/:id/password', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const { newPassword } = req.body;

  if (isNaN(userId)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  // Admin can only change their own password
  if (req.user.role === 'admin' && userId !== req.user.id) {
    return res.status(403).json({ message: 'You can only change your own password' });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  User.updatePassword(userId, newPassword, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error updating password', error: err.message });
    }
    if (result.changes === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'Password updated successfully' });
  });
});

module.exports = router;

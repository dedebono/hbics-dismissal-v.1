const express = require('express');
const User = require('../models/User');
const School = require('../models/School');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require superadmin
router.use(authenticateToken, requireSuperAdmin);

// ── Schools ──────────────────────────────────────────────────────────────────

// GET /superadmin/schools
router.get('/schools', (req, res) => {
    School.getAll((err, schools) => {
        if (err) return res.status(500).json({ message: 'Error fetching schools' });
        res.json({ schools });
    });
});

// POST /superadmin/schools
router.post('/schools', (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'School name is required' });
    }
    School.create(name.trim(), (err, school) => {
        if (err) {
            if (err.message && err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ message: 'School name already exists' });
            }
            return res.status(500).json({ message: 'Error creating school' });
        }
        res.status(201).json({ message: 'School created successfully', school });
    });
});

// DELETE /superadmin/schools/:id
router.delete('/schools/:id', (req, res) => {
    const schoolId = parseInt(req.params.id);
    if (isNaN(schoolId) || schoolId === 1) {
        return res.status(400).json({ message: 'Cannot delete the Default School' });
    }
    School.delete(schoolId, (err, result) => {
        if (err) return res.status(500).json({ message: 'Error deleting school' });
        if (result.changes === 0) return res.status(404).json({ message: 'School not found' });
        res.json({ message: 'School deleted successfully' });
    });
});

// ── Admins ───────────────────────────────────────────────────────────────────

// GET /superadmin/admins — list all admin accounts
router.get('/admins', (req, res) => {
    const sql = `
    SELECT u.id, u.username, u.role, u.school_id, u.created_at, s.name AS school_name
    FROM users u
    LEFT JOIN schools s ON u.school_id = s.id
    WHERE u.role = 'admin'
    ORDER BY u.created_at DESC
  `;
    const { db } = require('../config/database');
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error fetching admins' });
        res.json({ admins: rows });
    });
});

// POST /superadmin/admins — create an admin for a specific school
router.post('/admins', (req, res) => {
    const { username, password, school_id } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (!school_id) {
        return res.status(400).json({ message: 'school_id is required' });
    }

    User.findByUsername(username, (err, existing) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (existing) return res.status(409).json({ message: 'Username already exists' });

        User.create({ username, password, role: 'admin', school_id }, (err, user) => {
            if (err) return res.status(500).json({ message: 'Error creating admin', error: err.message });
            res.status(201).json({
                message: 'Admin created successfully',
                user: { id: user.id, username: user.username, role: user.role, school_id: user.school_id }
            });
        });
    });
});

// DELETE /superadmin/admins/:id
router.delete('/admins/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ message: 'Invalid user ID' });

    User.findById(userId, (err, user) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role === 'superadmin') {
            return res.status(403).json({ message: 'Cannot delete a superadmin account' });
        }

        User.delete(userId, (err, result) => {
            if (err) return res.status(500).json({ message: 'Error deleting user' });
            res.json({ message: 'Admin deleted successfully' });
        });
    });
});

// PUT /superadmin/admins/:id/reset-password
router.put('/admins/:id/reset-password', (req, res) => {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;

    if (isNaN(userId)) return res.status(400).json({ message: 'Invalid user ID' });
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    User.findById(userId, (err, user) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (!user) return res.status(404).json({ message: 'User not found' });

        User.updatePassword(userId, newPassword, (err) => {
            if (err) return res.status(500).json({ message: 'Error resetting password' });
            res.json({ message: 'Password reset successfully' });
        });
    });
});

module.exports = router;

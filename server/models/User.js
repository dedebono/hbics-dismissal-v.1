const bcrypt = require('bcryptjs');
const { db } = require('../config/database');

class User {
  // Create a new user
  static create(userData, callback) {
    const { username, password, role = 'teacher' } = userData;

    // Validate role
    const validRoles = ['teacher', 'student'];
    if (!validRoles.includes(role)) {
      return callback(new Error('Invalid role'));
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return callback(err);

      const sql = `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`;
      db.run(sql, [username, hashedPassword, role], function(err) {
        if (err) return callback(err);
        callback(null, { id: this.lastID, username, role });
      });
    });
  }

  // Find user by username
  static findByUsername(username, callback) {
    const sql = `SELECT * FROM users WHERE username = ?`;
    db.get(sql, [username], (err, row) => {
      if (err) return callback(err);
      callback(null, row);
    });
  }

  // Find user by ID
  static findById(id, callback) {
    const sql = `SELECT id, username, role, created_at FROM users WHERE id = ?`;
    db.get(sql, [id], (err, row) => {
      if (err) return callback(err);
      callback(null, row);
    });
  }

  // Verify password
  static verifyPassword(plainPassword, hashedPassword, callback) {
    bcrypt.compare(plainPassword, hashedPassword, (err, isMatch) => {
      if (err) return callback(err);
      callback(null, isMatch);
    });
  }

  // Get all users (for admin)
  static getAll(callback) {
    const sql = `SELECT id, username, role, created_at FROM users ORDER BY created_at DESC`;
    db.all(sql, [], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    });
  }

  // Update user role
  static updateRole(userId, newRole, callback) {
    const validRoles = ['teacher', 'student'];
    if (!validRoles.includes(newRole)) {
      return callback(new Error('Invalid role'));
    }

    const sql = `UPDATE users SET role = ? WHERE id = ?`;
    db.run(sql, [newRole, userId], function(err) {
      if (err) return callback(err);
      callback(null, { changes: this.changes });
    });
  }

  // Delete user
  static delete(userId, callback) {
    const sql = `DELETE FROM users WHERE id = ?`;
    db.run(sql, [userId], function(err) {
      if (err) return callback(err);
      callback(null, { changes: this.changes });
    });
  }
}

module.exports = User;

const { db } = require('../config/database');

class Dismissal {
  // Check in a student
  static checkIn(studentId, callback) {
    // First check if student is already checked in
    const checkSql = `SELECT * FROM active_students WHERE student_id = ?`;
    
    db.get(checkSql, [studentId], (err, row) => {
      if (err) return callback(err);
      
      if (row) {
        // Student is already checked in
        return callback(null, { alreadyCheckedIn: true });
      }
      
      // Insert into active_students and log the action
      const insertSql = `INSERT INTO active_students (student_id) VALUES (?)`;
      const logSql = `INSERT INTO dismissal_logs (student_id, action) VALUES (?, 'check_in')`;
      
      db.serialize(() => {
        db.run(insertSql, [studentId]);
        db.run(logSql, [studentId], function(err) {
          if (err) return callback(err);
          callback(null, { 
            checkedIn: true, 
            logId: this.lastID,
            timestamp: new Date().toISOString()
          });
        });
      });
    });
  }

  // Check out a student
  static checkOut(studentId, callback) {
    // First check if student is checked in
    const checkSql = `SELECT * FROM active_students WHERE student_id = ?`;
    
    db.get(checkSql, [studentId], (err, row) => {
      if (err) return callback(err);
      
      if (!row) {
        // Student is not checked in
        return callback(null, { notCheckedIn: true });
      }
      
      // Remove from active_students and log the action
      const deleteSql = `DELETE FROM active_students WHERE student_id = ?`;
      const logSql = `INSERT INTO dismissal_logs (student_id, action) VALUES (?, 'check_out')`;
      
      db.serialize(() => {
        db.run(deleteSql, [studentId]);
        db.run(logSql, [studentId], function(err) {
          if (err) return callback(err);
          callback(null, { 
            checkedOut: true, 
            logId: this.lastID,
            timestamp: new Date().toISOString()
          });
        });
      });
    });
  }

  // Get all active students with details
  static getActiveStudents(callback) {
    const sql = `
      SELECT s.id, s.barcode, s.name, s.class, a.checked_in_at 
      FROM students s 
      INNER JOIN active_students a ON s.id = a.student_id 
      ORDER BY s.class, s.name
    `;
    
    db.all(sql, [], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    });
  }

  // Get dismissal logs with student details
  static getDismissalLogs(limit = 50, callback) {
    const sql = `
      SELECT dl.*, s.name, s.class, s.barcode 
      FROM dismissal_logs dl 
      INNER JOIN students s ON dl.student_id = s.id 
      ORDER BY dl.timestamp DESC 
      LIMIT ?
    `;
    
    db.all(sql, [limit], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    });
  }

  // Get today's dismissal activity
  static getTodayActivity(callback) {
    const sql = `
      SELECT dl.*, s.name, s.class, s.barcode 
      FROM dismissal_logs dl 
      INNER JOIN students s ON dl.student_id = s.id 
      WHERE DATE(dl.timestamp) = DATE('now') 
      ORDER BY dl.timestamp DESC
    `;
    
    db.all(sql, [], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    });
  }

  // Get student dismissal history
  static getStudentHistory(studentId, limit = 20, callback) {
    const sql = `
      SELECT * FROM dismissal_logs 
      WHERE student_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    
    db.all(sql, [studentId, limit], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    });
  }

  // Clear all active students (for end of day)
  static clearAllActive(callback) {
    const sql = `DELETE FROM active_students`;
    db.run(sql, function(err) {
      if (err) return callback(err);
      callback(null, { cleared: this.changes });
    });
  }
}

module.exports = Dismissal;

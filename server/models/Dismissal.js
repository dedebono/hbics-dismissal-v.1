const { db } = require('../config/database');

class Dismissal {
  // Check in a student
  static checkIn(studentId, school_id, callback) {
    const checkSql = `SELECT * FROM active_students WHERE student_id = ?`;

    db.get(checkSql, [studentId], (err, row) => {
      if (err) return callback(err);

      if (row) {
        return callback(null, { alreadyCheckedIn: true });
      }

      const insertSql = `INSERT INTO active_students (student_id, school_id) VALUES (?, ?)`;
      const logSql = `INSERT INTO dismissal_logs (student_id, action, school_id) VALUES (?, 'check_in', ?)`;

      db.serialize(() => {
        db.run(insertSql, [studentId, school_id]);
        db.run(logSql, [studentId, school_id], function (err) {
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
  static checkOut(studentId, school_id, callback) {
    const checkSql = `SELECT * FROM active_students WHERE student_id = ?`;

    db.get(checkSql, [studentId], (err, row) => {
      if (err) return callback(err);

      if (!row) {
        return callback(null, { notCheckedIn: true });
      }

      const deleteSql = `DELETE FROM active_students WHERE student_id = ?`;
      const logSql = `INSERT INTO dismissal_logs (student_id, action, school_id) VALUES (?, 'check_out', ?)`;

      db.serialize(() => {
        db.run(deleteSql, [studentId]);
        db.run(logSql, [studentId, school_id], function (err) {
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

  // Get all active students with details (scoped to school)
  static getActiveStudents(school_id, callback) {
    const sql = `
      SELECT s.id, s.barcode, s.name, s.class, a.checked_in_at
      FROM students s
      INNER JOIN active_students a ON s.id = a.student_id
      WHERE s.school_id = ?
      ORDER BY s.class, s.name
    `;
    db.all(sql, [school_id], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    });
  }

  // Get dismissal logs with student details (scoped to school)
  static getDismissalLogs(school_id, limit, callback) {
    let sql = `
      SELECT dl.*, s.name, s.class, s.barcode
      FROM dismissal_logs dl
      INNER JOIN students s ON dl.student_id = s.id
      WHERE dl.school_id = ?
      ORDER BY dl.timestamp DESC
    `;
    const params = [school_id];

    if (Number.isFinite(limit)) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    db.all(sql, params, (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    });
  }

  // Get today's dismissal activity (scoped to school)
  static getTodayActivity(school_id, callback) {
    const sql = `
      SELECT dl.*, s.name, s.class, s.barcode
      FROM dismissal_logs dl
      INNER JOIN students s ON dl.student_id = s.id
      WHERE dl.school_id = ? AND DATE(dl.timestamp) = DATE('now')
      ORDER BY dl.timestamp DESC
    `;
    db.all(sql, [school_id], (err, rows) => {
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

  // Clear all active students for a school (end of day)
  static clearAllActive(school_id, callback) {
    const sql = `DELETE FROM active_students WHERE school_id = ?`;
    db.run(sql, [school_id], function (err) {
      if (err) return callback(err);
      callback(null, { cleared: this.changes });
    });
  }

  // Clear a single active student
  static clearSingleActive(studentId, callback) {
    const sql = `DELETE FROM active_students WHERE student_id = ?`;
    db.run(sql, [studentId], function (err) {
      if (err) return callback(err);
      callback(null, { cleared: this.changes > 0 });
    });
  }
}

module.exports = Dismissal;

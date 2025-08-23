const { db } = require('../config/database');

class DismissalAnalytics {
  // Get daily statistics
  static getDailyStats(date, callback) {
    const sql = `
      SELECT 
        DATE(timestamp) as date,
        COUNT(CASE WHEN action = 'check_in' THEN 1 END) as check_ins,
        COUNT(CASE WHEN action = 'check_out' THEN 1 END) as check_outs,
        COUNT(DISTINCT student_id) as unique_students,
        MIN(timestamp) as first_activity,
        MAX(timestamp) as last_activity
      FROM dismissal_logs
      WHERE DATE(timestamp) = DATE(?)
      GROUP BY DATE(timestamp)
    `;
    
    db.get(sql, [date], callback);
  }

  // Get weekly statistics
  static getWeeklyStats(startDate, endDate, callback) {
    const sql = `
      SELECT 
        DATE(timestamp) as date,
        COUNT(CASE WHEN action = 'check_in' THEN 1 END) as check_ins,
        COUNT(CASE WHEN action = 'check_out' THEN 1 END) as check_outs,
        COUNT(DISTINCT student_id) as unique_students
      FROM dismissal_logs
      WHERE DATE(timestamp) BETWEEN DATE(?) AND DATE(?)
      GROUP BY DATE(timestamp)
      ORDER BY date
    `;
    
    db.all(sql, [startDate, endDate], callback);
  }

  // Get class-based statistics
  static getClassStats(date, callback) {
    const sql = `
      SELECT 
        s.class,
        COUNT(CASE WHEN dl.action = 'check_in' THEN 1 END) as check_ins,
        COUNT(CASE WHEN dl.action = 'check_out' THEN 1 END) as check_outs,
        COUNT(DISTINCT dl.student_id) as unique_students
      FROM dismissal_logs dl
      INNER JOIN students s ON dl.student_id = s.id
      WHERE DATE(dl.timestamp) = DATE(?)
      GROUP BY s.class
      ORDER BY s.class
    `;
    
    db.all(sql, [date], callback);
  }

  // Get peak hours analysis
  static getPeakHours(date, callback) {
    const sql = `
      SELECT 
        strftime('%H', timestamp) as hour,
        COUNT(*) as activity_count,
        COUNT(CASE WHEN action = 'check_in' THEN 1 END) as check_ins,
        COUNT(CASE WHEN action = 'check_out' THEN 1 END) as check_outs
      FROM dismissal_logs
      WHERE DATE(timestamp) = DATE(?)
      GROUP BY strftime('%H', timestamp)
      ORDER BY hour
    `;
    
    db.all(sql, [date], callback);
  }

  // Get student activity summary
  static getStudentActivitySummary(studentId, startDate, endDate, callback) {
    const sql = `
      SELECT 
        s.name,
        s.class,
        COUNT(CASE WHEN dl.action = 'check_in' THEN 1 END) as total_check_ins,
        COUNT(CASE WHEN dl.action = 'check_out' THEN 1 END) as total_check_outs,
        MIN(dl.timestamp) as first_activity,
        MAX(dl.timestamp) as last_activity
      FROM dismissal_logs dl
      INNER JOIN students s ON dl.student_id = s.id
      WHERE dl.student_id = ? 
        AND DATE(dl.timestamp) BETWEEN DATE(?) AND DATE(?)
      GROUP BY s.id, s.name, s.class
    `;
    
    db.get(sql, [studentId, startDate, endDate], callback);
  }

  // Get filtered logs with pagination
  static getFilteredLogs(filters, callback) {
    let sql = `
      SELECT dl.*, s.name, s.class, s.barcode, u.username as performed_by
      FROM dismissal_logs dl 
      INNER JOIN students s ON dl.student_id = s.id
      LEFT JOIN users u ON dl.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.startDate) {
      sql += ` AND DATE(dl.timestamp) >= DATE(?)`;
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      sql += ` AND DATE(dl.timestamp) <= DATE(?)`;
      params.push(filters.endDate);
    }
    
    if (filters.action) {
      sql += ` AND dl.action = ?`;
      params.push(filters.action);
    }
    
    if (filters.class) {
      sql += ` AND s.class = ?`;
      params.push(filters.class);
    }
    
    if (filters.studentId) {
      sql += ` AND dl.student_id = ?`;
      params.push(filters.studentId);
    }
    
    sql += ` ORDER BY dl.timestamp DESC`;
    
    if (filters.limit) {
      sql += ` LIMIT ?`;
      params.push(filters.limit);
    }
    
    if (filters.offset) {
      sql += ` OFFSET ?`;
      params.push(filters.offset);
    }
    
    db.all(sql, params, callback);
  }

  // Export logs to CSV format
  static exportLogs(filters, callback) {
    let sql = `
      SELECT 
        s.barcode as "Barcode",
        s.name as "Student Name", 
        s.class as "Class",
        dl.action as "Action",
        datetime(dl.timestamp) as "Timestamp",
        u.username as "Performed By"
      FROM dismissal_logs dl 
      INNER JOIN students s ON dl.student_id = s.id
      LEFT JOIN users u ON dl.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.startDate) {
      sql += ` AND DATE(dl.timestamp) >= DATE(?)`;
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      sql += ` AND DATE(dl.timestamp) <= DATE(?)`;
      params.push(filters.endDate);
    }
    
    if (filters.action) {
      sql += ` AND dl.action = ?`;
      params.push(filters.action);
    }
    
    if (filters.class) {
      sql += ` AND s.class = ?`;
      params.push(filters.class);
    }
    
    sql += ` ORDER BY dl.timestamp DESC`;
    
    db.all(sql, params, callback);
  }
}

module.exports = DismissalAnalytics;

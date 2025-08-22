const { db } = require('../config/database');

class Student {
  // Create a new student
  static create(studentData, callback) {
    const { barcode, name, class: className, photo_url } = studentData;
    const sql = `INSERT INTO students (barcode, name, class, photo_url) VALUES (?, ?, ?, ?)`;
    
    db.run(sql, [barcode, name, className, photo_url || null], function(err) {
      if (err) return callback(err);
      callback(null, { id: this.lastID, barcode, name, class: className, photo_url: photo_url || null });
    });
  }

  // Find student by barcode
  static findByBarcode(barcode, callback) {
    const sql = `SELECT * FROM students WHERE barcode = ?`;
    db.get(sql, [barcode], (err, row) => {
      if (err) return callback(err);
      callback(null, row);
    });
  }

  // Find student by ID
  static findById(id, callback) {
    const sql = `SELECT * FROM students WHERE id = ?`;
    db.get(sql, [id], (err, row) => {
      if (err) return callback(err);
      callback(null, row);
    });
  }

  // Get all students
  static getAll(callback) {
    const sql = `SELECT * FROM students ORDER BY class, name`;
    db.all(sql, [], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    });
  }

  // Get students by class
  static getByClass(className, callback) {
    const sql = `SELECT * FROM students WHERE class = ? ORDER BY name`;
    db.all(sql, [className], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    });
  }

  // Update student information
  static update(id, studentData, callback) {
    const { barcode, name, class: className, photo_url } = studentData;
    const sql = `UPDATE students SET barcode = ?, name = ?, class = ?, photo_url = ? WHERE id = ?`;
    
    db.run(sql, [barcode, name, className, photo_url || null, id], function(err) {
      if (err) return callback(err);
      callback(null, { changes: this.changes });
    });
  }

  // Update only photo URL
  static updatePhoto(id, photo_url, callback) {
    const sql = `UPDATE students SET photo_url = ? WHERE id = ?`;
    
    db.run(sql, [photo_url || null, id], function(err) {
      if (err) return callback(err);
      callback(null, { changes: this.changes });
    });
  }

  // Delete student
  static delete(id, callback) {
    const sql = `DELETE FROM students WHERE id = ?`;
    db.run(sql, [id], function(err) {
      if (err) return callback(err);
      callback(null, { changes: this.changes });
    });
  }

  // Get available classes
  static getAvailableClasses(callback) {
    const sql = `SELECT DISTINCT class FROM students ORDER BY class`;
    db.all(sql, [], (err, rows) => {
      if (err) return callback(err);
      const classes = rows.map(row => row.class);
      callback(null, classes);
    });
  }

  // Search students by name
  static searchByName(searchTerm, callback) {
    const sql = `SELECT * FROM students WHERE name LIKE ? ORDER BY class, name`;
    db.all(sql, [`%${searchTerm}%`], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    });
  }
}

module.exports = Student;

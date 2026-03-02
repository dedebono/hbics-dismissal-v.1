const { db } = require('../config/database');

class Student {
  // Create a new student
  static create(studentData, callback) {
    const { barcode, name, class: className, photo_url, sound_url, school_id } = studentData;
    const sql = `INSERT INTO students (barcode, name, class, photo_url, sound_url, school_id) VALUES (?, ?, ?, ?, ?, ?)`;

    db.run(sql, [barcode, name, className, photo_url || null, sound_url || null, school_id || null], function (err) {
      if (err) return callback(err);
      callback(null, { id: this.lastID, barcode, name, class: className, photo_url: photo_url || null, sound_url: sound_url || null, school_id });
    });
  }

  // Find student by barcode (scoped to school)
  static findByBarcode(barcode, school_id, callback) {
    const sql = `SELECT * FROM students WHERE barcode = ? AND school_id = ?`;
    db.get(sql, [barcode, school_id], (err, row) => {
      if (err) return callback(err);
      callback(null, row);
    });
  }

  // Find student by ID (scoped to school)
  static findById(id, callback) {
    const sql = `SELECT * FROM students WHERE id = ?`;
    db.get(sql, [id], (err, row) => {
      if (err) return callback(err);
      callback(null, row);
    });
  }

  // Get all students (scoped to school)
  static getAll(school_id, callback) {
    const sql = `SELECT * FROM students WHERE school_id = ? ORDER BY class, name`;
    db.all(sql, [school_id], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    });
  }

  // Get students by class (scoped to school)
  static getByClass(className, school_id, callback) {
    const sql = `SELECT * FROM students WHERE class = ? AND school_id = ? ORDER BY name`;
    db.all(sql, [className, school_id], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    });
  }

  // Update student information
  static update(id, studentData, callback) {
    const { barcode, name, class: className, photo_url, sound_url } = studentData;
    const sql = `UPDATE students SET barcode = ?, name = ?, class = ?, photo_url = ?, sound_url = ? WHERE id = ?`;

    db.run(sql, [barcode, name, className, photo_url || null, sound_url || null, id], function (err) {
      if (err) return callback(err);
      callback(null, { changes: this.changes });
    });
  }

  // Update only photo URL
  static updatePhoto(id, photo_url, callback) {
    const sql = `UPDATE students SET photo_url = ? WHERE id = ?`;
    db.run(sql, [photo_url || null, id], function (err) {
      if (err) return callback(err);
      callback(null, { changes: this.changes });
    });
  }

  // Update only sound URL
  static updateSound(id, sound_url, callback) {
    const sql = `UPDATE students SET sound_url = ? WHERE id = ?`;
    db.run(sql, [sound_url || null, id], function (err) {
      if (err) return callback(err);
      callback(null, { changes: this.changes });
    });
  }

  // Delete student
  static delete(id, callback) {
    const sql = `DELETE FROM students WHERE id = ?`;
    db.run(sql, [id], function (err) {
      if (err) return callback(err);
      callback(null, { changes: this.changes });
    });
  }

  // Get available classes (scoped to school)
  static getAvailableClasses(school_id, callback) {
    const sql = `SELECT DISTINCT class FROM students WHERE school_id = ? ORDER BY class`;
    db.all(sql, [school_id], (err, rows) => {
      if (err) return callback(err);
      const classes = rows.map(row => row.class);
      callback(null, classes);
    });
  }

  // Search students by name (scoped to school)
  static searchByName(searchTerm, school_id, callback) {
    const sql = `SELECT * FROM students WHERE name LIKE ? AND school_id = ? ORDER BY class, name`;
    db.all(sql, [`%${searchTerm}%`, school_id], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    });
  }
}

module.exports = Student;

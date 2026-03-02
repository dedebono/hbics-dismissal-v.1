const { db } = require('../config/database');

class School {
    // Get all schools
    static getAll(callback) {
        const sql = `SELECT * FROM schools ORDER BY name ASC`;
        db.all(sql, [], (err, rows) => {
            if (err) return callback(err);
            callback(null, rows);
        });
    }

    // Find school by ID
    static findById(id, callback) {
        const sql = `SELECT * FROM schools WHERE id = ?`;
        db.get(sql, [id], (err, row) => {
            if (err) return callback(err);
            callback(null, row);
        });
    }

    // Create a school
    static create(name, callback) {
        const sql = `INSERT INTO schools (name) VALUES (?)`;
        db.run(sql, [name], function (err) {
            if (err) return callback(err);
            callback(null, { id: this.lastID, name });
        });
    }

    // Delete a school
    static delete(id, callback) {
        const sql = `DELETE FROM schools WHERE id = ?`;
        db.run(sql, [id], function (err) {
            if (err) return callback(err);
            callback(null, { changes: this.changes });
        });
    }
}

module.exports = School;

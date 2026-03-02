const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../dismissal.db');
console.log('Database path:', dbPath);

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Helper: add a column only if it does not already exist
function addColumnIfNotExists(table, column, definition, cb) {
  db.all(`PRAGMA table_info(${table})`, [], (err, rows) => {
    if (err) return cb(err);
    const exists = rows.some((r) => r.name === column);
    if (exists) return cb(null);
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, cb);
  });
}

// Initialize database tables
const initDatabase = (callback) => {
  db.serialize(() => {
    // ── Schools table ──────────────────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS schools (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => { if (err) return callback(err); });

    // ── Users table ────────────────────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'teacher',
      school_id  INTEGER REFERENCES schools(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => { if (err) return callback(err); });

    // ── Students table ─────────────────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS students (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode   TEXT NOT NULL,
      name      TEXT NOT NULL,
      class     TEXT NOT NULL,
      photo_url TEXT,
      sound_url TEXT,
      school_id INTEGER REFERENCES schools(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => { if (err) return callback(err); });

    // ── Dismissal logs table ───────────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS dismissal_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      action     TEXT NOT NULL,
      timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP,
      school_id  INTEGER REFERENCES schools(id),
      FOREIGN KEY (student_id) REFERENCES students (id)
    )`, (err) => { if (err) return callback(err); });

    // ── Active students table ──────────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS active_students (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id     INTEGER UNIQUE NOT NULL,
      school_id      INTEGER REFERENCES schools(id),
      checked_in_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students (id)
    )`, (err) => { if (err) return callback(err); });

    // ── Migration: add school_id columns to existing tables (safe no-op if already there)
    const migrations = [
      () => addColumnIfNotExists('users', 'school_id', 'INTEGER REFERENCES schools(id)', next),
      () => addColumnIfNotExists('students', 'school_id', 'INTEGER REFERENCES schools(id)', next),
      () => addColumnIfNotExists('dismissal_logs', 'school_id', 'INTEGER REFERENCES schools(id)', next),
      () => addColumnIfNotExists('active_students', 'school_id', 'INTEGER REFERENCES schools(id)', next),
      () => ensureDefaultSchoolAndMigrateData(next),
      () => ensureUniqueBarcodePerSchool(next),
      () => ensureSuperAdmin(callback),    // final step calls the real callback
    ];

    let idx = 0;
    function next(err) {
      if (err) return callback(err);
      if (idx < migrations.length) migrations[idx++]();
    }
    next(); // kick off
  });
};

// ── Ensure a "Default School" exists and assign orphaned rows to it ────────────
function ensureDefaultSchoolAndMigrateData(cb) {
  db.run(
    `INSERT OR IGNORE INTO schools (id, name) VALUES (1, 'Default School')`,
    (err) => {
      if (err) return cb(err);
      // Assign rows with NULL school_id to Default School
      db.run(`UPDATE users           SET school_id = 1 WHERE school_id IS NULL AND role != 'superadmin'`, (err) => {
        if (err) return cb(err);
        db.run(`UPDATE students        SET school_id = 1 WHERE school_id IS NULL`, (err) => {
          if (err) return cb(err);
          db.run(`UPDATE dismissal_logs  SET school_id = 1 WHERE school_id IS NULL`, (err) => {
            if (err) return cb(err);
            db.run(`UPDATE active_students SET school_id = 1 WHERE school_id IS NULL`, cb);
          });
        });
      });
    }
  );
}

// ── Drop the old UNIQUE(barcode) constraint if still on students (SQLite workaround) ──
// SQLite doesn't support DROP CONSTRAINT; we rely on the new table def above (no UNIQUE on barcode)
// For existing DBs we silently ignore; barcode uniqueness is now enforced per-school in the app
function ensureUniqueBarcodePerSchool(cb) {
  // Nothing destructive needed — just call back.
  cb(null);
}

// ── Auto-create superadmin if not exists ───────────────────────────────────────
function ensureSuperAdmin(cb) {
  const bcrypt = require('bcryptjs');
  db.get(`SELECT id FROM users WHERE role = 'superadmin' LIMIT 1`, [], (err, row) => {
    if (err) return cb(err);
    if (row) return cb(null); // already exists
    bcrypt.hash('superadmin123', 10, (err, hash) => {
      if (err) return cb(err);
      db.run(
        `INSERT OR IGNORE INTO users (username, password, role, school_id) VALUES (?, ?, 'superadmin', NULL)`,
        ['superadmin', hash],
        (err) => {
          if (err) return cb(err);
          console.log('✅ SuperAdmin account auto-created (username: superadmin / password: superadmin123)');
          cb(null);
        }
      );
    });
  });
}

module.exports = { db, initDatabase };

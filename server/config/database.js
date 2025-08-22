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

// Initialize database tables
const initDatabase = (callback) => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'teacher',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) return callback(err);
    
    // Students table
    db.run(`CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      class TEXT NOT NULL,
      photo_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) return callback(err);
      
      // Dismissal logs table
      db.run(`CREATE TABLE IF NOT EXISTS dismissal_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        action TEXT NOT NULL, -- 'check_in' or 'check_out'
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students (id)
      )`, (err) => {
        if (err) return callback(err);
        
        // Active students table (for real-time tracking)
        db.run(`CREATE TABLE IF NOT EXISTS active_students (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER UNIQUE NOT NULL,
          checked_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES students (id)
        )`, (err) => {
          if (err) console.error('Error creating active_students table:', err);
          callback(null); // Success
        });
      });
    });
  });
};

module.exports = { db, initDatabase };

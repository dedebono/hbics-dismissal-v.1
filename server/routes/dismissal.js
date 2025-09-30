const express = require('express');
const Dismissal = require('../models/Dismissal');
const Student = require('../models/Student');
const { authenticateToken, requireTeacherOrAdmin } = require('../middleware/auth');
const { broadcast } = require('../websocket');

const router = express.Router();

// Check in student by barcode
router.post('/check-in', authenticateToken, (req, res) => {
  const { barcode } = req.body;

  if (!barcode) {
    return res.status(400).json({ message: 'Barcode is required' });
  }

  // First find the student by barcode
  Student.findByBarcode(barcode, (err, student) => {
    if (err) {
      return res.status(500).json({ message: 'Error finding student' });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check in the student
    Dismissal.checkIn(student.id, (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error checking in student' });
      }

      if (result.alreadyCheckedIn) {
        return res.status(400).json({ message: 'Student is already checked in' });
      }

      // Broadcast the new active students list
      Dismissal.getActiveStudents((err, activeStudents) => {
        if (!err) {
          broadcast({ type: 'active_students', payload: activeStudents });
        }
      });

      res.json({
        message: 'Student checked in successfully',
        student: {
          id: student.id,
          name: student.name,
          class: student.class,
          barcode: student.barcode
        },
        timestamp: result.timestamp
      });
    });
  });
});

// Check out student by barcode
router.post('/check-out', authenticateToken, (req, res) => {
  const { barcode } = req.body;

  if (!barcode) {
    return res.status(400).json({ message: 'Barcode is required' });
  }

  // First find the student by barcode
  Student.findByBarcode(barcode, (err, student) => {
    if (err) {
      return res.status(500).json({ message: 'Error finding student' });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check out the student
    Dismissal.checkOut(student.id, (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error checking out student' });
      }

      if (result.notCheckedIn) {
        return res.status(400).json({ message: 'Student is not checked in' });
      }

      // Broadcast the new active students list
      Dismissal.getActiveStudents((err, activeStudents) => {
        if (!err) {
          broadcast({ type: 'active_students', payload: activeStudents });
        }
      });

      res.json({
        message: 'Student checked out successfully',
        student: {
          id: student.id,
          name: student.name,
          class: student.class,
          barcode: student.barcode
        },
        timestamp: result.timestamp
      });
    });
  });
});

// Get all active students
router.get('/active', authenticateToken, (req, res) => {
  Dismissal.getActiveStudents((err, activeStudents) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching active students' });
    }
    res.json(activeStudents);
  });
});

// Get dismissal logs
router.get('/logs', authenticateToken, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  
  Dismissal.getDismissalLogs(limit, (err, logs) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching dismissal logs' });
    }
    res.json(logs);
  });
});

// Get today\'s activity
router.get('/today', authenticateToken,requireTeacherOrAdmin, (req, res) => {
  Dismissal.getTodayActivity((err, activity) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching today\'s activity' });
    }
    res.json(activity);
  });
});

// Get student dismissal history
router.get('/history/:studentId', authenticateToken, (req, res) => {
  const { studentId } = req.params;
  const limit = parseInt(req.query.limit) || 20;

  Dismissal.getStudentHistory(studentId, limit, (err, history) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching student history' });
    }
    res.json(history);
  });
});

// Clear all active students (admin only)
router.delete('/active/clear', authenticateToken, (req, res) => {
  Dismissal.clearAllActive((err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error clearing active students' });
    }

    // Broadcast the empty active students list
    broadcast({ type: 'active_students', payload: [] });

    res.json({
      message: `Cleared ${result.cleared} active students`,
      cleared: result.cleared
    });
  });
});

// Clear a single active student
router.delete('/active/:studentId', authenticateToken, (req, res) => {
  const { studentId } = req.params;

  Dismissal.clearSingleActive(studentId, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error clearing active student' });
    }

    if (!result.cleared) {
      return res.status(404).json({ message: 'Student not found in active list' });
    }

    // Broadcast the updated active students list
    Dismissal.getActiveStudents((err, activeStudents) => {
      if (!err) {
        broadcast({ type: 'active_students', payload: activeStudents });
      }
    });

    res.json({
      message: 'Student removed from active list',
      studentId: studentId
    });
  });
});

// Check student status by barcode
router.get('/status/:barcode', authenticateToken, (req, res) => {
  const { barcode } = req.params;

  Student.findByBarcode(barcode, (err, student) => {
    if (err) {
      return res.status(500).json({ message: 'Error finding student' });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if student is active
    const checkActiveSql = `SELECT * FROM active_students WHERE student_id = ?`;
    const db = require('../config/database').db;
    
    db.get(checkActiveSql, [student.id], (err, activeRow) => {
      if (err) {
        return res.status(500).json({ message: 'Error checking student status' });
      }

      res.json({
        student: {
          id: student.id,
          name: student.name,
          class: student.class,
          barcode: student.barcode
        },
        isActive: !!activeRow,
        checkedInAt: activeRow ? activeRow.checked_in_at : null
      });
    });
  });
});

module.exports = router;

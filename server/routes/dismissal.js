const express = require('express');
const Dismissal = require('../models/Dismissal');
const Student = require('../models/Student');
const { authenticateToken, requireTeacherOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Check in student by barcode
router.post('/check-in', authenticateToken, requireTeacherOrAdmin, (req, res) => {
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
router.post('/check-out', authenticateToken, requireTeacherOrAdmin, (req, res) => {
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
router.get('/active', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  Dismissal.getActiveStudents((err, activeStudents) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching active students' });
    }
    res.json(activeStudents);
  });
});

// Get dismissal logs
router.get('/logs', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  
  Dismissal.getDismissalLogs(limit, (err, logs) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching dismissal logs' });
    }
    res.json(logs);
  });
});

// Get today's activity
router.get('/today', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  Dismissal.getTodayActivity((err, activity) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching today\'s activity' });
    }
    res.json(activity);
  });
});

// Get student dismissal history
router.get('/history/:studentId', authenticateToken, requireTeacherOrAdmin, (req, res) => {
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
router.delete('/active/clear', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  Dismissal.clearAllActive((err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error clearing active students' });
    }
    res.json({ 
      message: `Cleared ${result.cleared} active students`,
      cleared: result.cleared
    });
  });
});

// Check student status by barcode
router.get('/status/:barcode', authenticateToken, requireTeacherOrAdmin, (req, res) => {
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

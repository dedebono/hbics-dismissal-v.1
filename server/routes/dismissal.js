const express = require('express');
const Dismissal = require('../models/Dismissal');
const Student = require('../models/Student');
const { authenticateToken, requireTeacherOrAdmin } = require('../middleware/auth');
const { broadcastToTenant } = require('../websocket');

const router = express.Router();

// Check in student by barcode (scoped to school)
router.post('/check-in', authenticateToken, (req, res) => {
  const { barcode } = req.body;
  const school_id = req.user.school_id;

  if (!barcode) {
    return res.status(400).json({ message: 'Barcode is required' });
  }

  Student.findByBarcode(barcode, school_id, (err, student) => {
    if (err) {
      return res.status(500).json({ message: 'Error finding student' });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    Dismissal.checkIn(student.id, school_id, (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error checking in student' });
      }

      if (result.alreadyCheckedIn) {
        return res.status(400).json({ message: 'Student is already checked in' });
      }

      // Broadcast the new active students list (scoped)
      Dismissal.getActiveStudents(school_id, (err, activeStudents) => {
        if (!err) {
          broadcastToTenant(school_id, 'active_students', { type: 'active_students', payload: activeStudents });
        }
      });
      broadcastToTenant(school_id, 'student_checked_in', {
        id: student.id,
        name: student.name,
        class: student.class,
        barcode: student.barcode,
        checked_in_at: result.timestamp
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

// Check out student by barcode (scoped to school)
router.post('/check-out', authenticateToken, (req, res) => {
  const { barcode } = req.body;
  const school_id = req.user.school_id;

  if (!barcode) {
    return res.status(400).json({ message: 'Barcode is required' });
  }

  Student.findByBarcode(barcode, school_id, (err, student) => {
    if (err) {
      return res.status(500).json({ message: 'Error finding student' });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    Dismissal.checkOut(student.id, school_id, (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error checking out student' });
      }

      if (result.notCheckedIn) {
        return res.status(400).json({ message: 'Student is not checked in' });
      }

      // Broadcast the updated active students list (scoped)
      Dismissal.getActiveStudents(school_id, (err, activeStudents) => {
        if (!err) {
          broadcastToTenant(school_id, 'active_students', { type: 'active_students', payload: activeStudents });
        }
      });
      // Emit individual event for real-time checkouts
      broadcastToTenant(school_id, 'student_checked_out', { barcode: student.barcode });

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

// Get all active students (scoped to school)
router.get('/active', authenticateToken, (req, res) => {
  const school_id = req.user.school_id;
  Dismissal.getActiveStudents(school_id, (err, activeStudents) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching active students' });
    }
    res.json(activeStudents);
  });
});

// Get dismissal logs (scoped to school)
router.get('/logs', authenticateToken, (req, res) => {
  const school_id = req.user.school_id;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;

  Dismissal.getDismissalLogs(school_id, limit, (err, logs) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching dismissal logs' });
    }
    res.json(logs);
  });
});

// Get today's activity (scoped to school)
router.get('/today', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  const school_id = req.user.school_id;
  Dismissal.getTodayActivity(school_id, (err, activity) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching today's activity" });
    }
    res.json(activity);
  });
});

// Get today's arrivals (scoped to school)
router.get('/today-arrivals', authenticateToken, (req, res) => {
  const school_id = req.user.school_id;
  Dismissal.getTodayArrivals(school_id, (err, arrivals) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching today's arrivals" });
    }
    res.json(arrivals);
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

// Clear all active students for this school
router.delete('/active/clear', authenticateToken, (req, res) => {
  const school_id = req.user.school_id;
  Dismissal.clearAllActive(school_id, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error clearing active students' });
    }

    broadcastToTenant(school_id, 'active_students', { type: 'active_students', payload: [] });

    res.json({
      message: `Cleared ${result.cleared} active students`,
      cleared: result.cleared
    });
  });
});

// Clear a single active student
router.delete('/active/:studentId', authenticateToken, (req, res) => {
  const { studentId } = req.params;
  const school_id = req.user.school_id;

  Dismissal.clearSingleActive(studentId, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error clearing active student' });
    }

    if (!result.cleared) {
      return res.status(404).json({ message: 'Student not found in active list' });
    }

    Dismissal.getActiveStudents(school_id, (err, activeStudents) => {
      if (!err) {
        broadcastToTenant(school_id, 'active_students', { type: 'active_students', payload: activeStudents });
      }
    });

    res.json({
      message: 'Student removed from active list',
      studentId: studentId
    });
  });
});

// Check student status by barcode (scoped to school)
router.get('/status/:barcode', authenticateToken, (req, res) => {
  const { barcode } = req.params;
  const school_id = req.user.school_id;

  Student.findByBarcode(barcode, school_id, (err, student) => {
    if (err) {
      return res.status(500).json({ message: 'Error finding student' });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

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

// Record student arrival (scoped to school) — for parents role
router.post('/arrival', authenticateToken, (req, res) => {
  const { barcode } = req.body;
  const school_id = req.user.school_id;

  if (!barcode) {
    return res.status(400).json({ message: 'Barcode is required' });
  }

  Student.findByBarcode(barcode, school_id, (err, student) => {
    if (err) {
      return res.status(500).json({ message: 'Error finding student' });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    Dismissal.recordArrival(student.id, school_id, (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error recording arrival' });
      }

      if (result.alreadyArrived) {
        return res.status(409).json({ message: 'Student arrival already recorded today' });
      }

      Dismissal.getTodayArrivals(school_id, (err, arrivals) => {
        if (!err) {
          broadcastToTenant(school_id, 'today_arrivals', { type: 'today_arrivals', payload: arrivals });
        }
      });

      res.json({
        message: 'Arrival recorded successfully',
        timestamp: result.timestamp
      });
    });
  });
});

module.exports = router;

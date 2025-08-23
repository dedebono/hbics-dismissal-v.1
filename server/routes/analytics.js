const express = require('express');
const DismissalAnalytics = require('../models/DismissalAnalytics');
const { authenticateToken, requireTeacherOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get daily statistics
router.get('/daily-stats/:date', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  const { date } = req.params;
  
  DismissalAnalytics.getDailyStats(date, (err, stats) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching daily statistics' });
    }
    res.json(stats || { date, check_ins: 0, check_outs: 0, unique_students: 0 });
  });
});

// Get weekly statistics
router.get('/weekly-stats', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'startDate and endDate are required' });
  }

  DismissalAnalytics.getWeeklyStats(startDate, endDate, (err, stats) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching weekly statistics' });
    }
    res.json(stats);
  });
});

// Get class-based statistics
router.get('/class-stats/:date', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  const { date } = req.params;
  
  DismissalAnalytics.getClassStats(date, (err, stats) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching class statistics' });
    }
    res.json(stats);
  });
});

// Get peak hours analysis
router.get('/peak-hours/:date', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  const { date } = req.params;
  
  DismissalAnalytics.getPeakHours(date, (err, stats) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching peak hours data' });
    }
    res.json(stats);
  });
});

// Get student activity summary
router.get('/student-summary/:studentId', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  const { studentId } = req.params;
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'startDate and endDate are required' });
  }

  DismissalAnalytics.getStudentActivitySummary(studentId, startDate, endDate, (err, summary) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching student summary' });
    }
    res.json(summary || { total_check_ins: 0, total_check_outs: 0 });
  });
});

// Get filtered logs
router.get('/filtered-logs', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  const filters = {
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    action: req.query.action,
    class: req.query.class,
    studentId: req.query.studentId,
    limit: parseInt(req.query.limit) || 50,
    offset: parseInt(req.query.offset) || 0
  };

  DismissalAnalytics.getFilteredLogs(filters, (err, logs) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching filtered logs' });
    }
    res.json(logs);
  });
});

// Export logs to CSV
router.get('/export-logs', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  const filters = {
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    action: req.query.action,
    class: req.query.class
  };

  DismissalAnalytics.exportLogs(filters, (err, logs) => {
    if (err) {
      return res.status(500).json({ message: 'Error exporting logs' });
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="dismissal_logs.csv"');
    res.send(logs);
  });
});

// Get logs by period (month and/or year)
router.get('/logs-by-period', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  const filters = {
    year: req.query.year ? parseInt(req.query.year) : null,
    month: req.query.month ? parseInt(req.query.month) : null,
    limit: parseInt(req.query.limit) || 100,
    offset: parseInt(req.query.offset) || 0
  };

  // Validate year if provided
  if (filters.year && (filters.year < 2000 || filters.year > 2100)) {
    return res.status(400).json({ message: 'Invalid year. Must be between 2000 and 2100' });
  }

  // Validate month if provided
  if (filters.month && (filters.month < 1 || filters.month > 12)) {
    return res.status(400).json({ message: 'Invalid month. Must be between 1 and 12' });
  }

  DismissalAnalytics.getLogsByPeriod(filters, (err, logs) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching logs by period' });
    }
    res.json(logs);
  });
});

module.exports = router;
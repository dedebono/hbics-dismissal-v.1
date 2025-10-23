const DismissalAnalytics = require('../models/DismissalAnalytics');
const { db } = require('../config/database');

// Mock the database
jest.mock('../config/database', () => ({
  db: {
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn(),
  },
}));

describe('DismissalAnalytics', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getDailyStats', () => {
    it('should return daily statistics for a given date', (done) => {
      const mockDate = '2023-10-01';
      const mockResult = {
        date: '2023-10-01',
        check_ins: 10,
        check_outs: 8,
        unique_students: 12,
        first_activity: '2023-10-01 08:00:00',
        last_activity: '2023-10-01 15:30:00',
      };

      db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockResult);
      });

      DismissalAnalytics.getDailyStats(mockDate, (err, result) => {
        expect(err).toBeNull();
        expect(result).toEqual(mockResult);
        expect(db.get).toHaveBeenCalledWith(
          expect.stringContaining('COUNT(CASE WHEN action = \'check_in\' THEN 1 END) as check_ins'),
          [mockDate],
          expect.any(Function)
        );
        done();
      });
    });

    it('should handle database errors', (done) => {
      const mockDate = '2023-10-01';
      const mockError = new Error('Database error');

      db.get.mockImplementation((sql, params, callback) => {
        callback(mockError, null);
      });

      DismissalAnalytics.getDailyStats(mockDate, (err, result) => {
        expect(err).toEqual(mockError);
        expect(result).toBeNull();
        done();
      });
    });
  });

  describe('getWeeklyStats', () => {
    it('should return weekly statistics for a date range', (done) => {
      const startDate = '2023-10-01';
      const endDate = '2023-10-07';
      const mockResults = [
        { date: '2023-10-01', check_ins: 10, check_outs: 8, unique_students: 12 },
        { date: '2023-10-02', check_ins: 15, check_outs: 12, unique_students: 16 },
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResults);
      });

      DismissalAnalytics.getWeeklyStats(startDate, endDate, (err, results) => {
        expect(err).toBeNull();
        expect(results).toEqual(mockResults);
        expect(db.all).toHaveBeenCalledWith(
          expect.stringContaining('COUNT(CASE WHEN action = \'check_in\' THEN 1 END) as check_ins'),
          [startDate, endDate],
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe('getClassStats', () => {
    it('should return class-based statistics for a given date', (done) => {
      const mockDate = '2023-10-01';
      const mockResults = [
        { class: 'Grade 1', check_ins: 5, check_outs: 4, unique_students: 6 },
        { class: 'Grade 2', check_ins: 8, check_outs: 7, unique_students: 9 },
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResults);
      });

      DismissalAnalytics.getClassStats(mockDate, (err, results) => {
        expect(err).toBeNull();
        expect(results).toEqual(mockResults);
        expect(db.all).toHaveBeenCalledWith(
          expect.stringContaining('INNER JOIN students s ON dl.student_id = s.id'),
          [mockDate],
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe('getPeakHours', () => {
    it('should return peak hours analysis for a given date', (done) => {
      const mockDate = '2023-10-01';
      const mockResults = [
        { hour: '08', activity_count: 20, check_ins: 15, check_outs: 5 },
        { hour: '15', activity_count: 25, check_ins: 5, check_outs: 20 },
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResults);
      });

      DismissalAnalytics.getPeakHours(mockDate, (err, results) => {
        expect(err).toBeNull();
        expect(results).toEqual(mockResults);
        expect(db.all).toHaveBeenCalledWith(
          expect.stringContaining("strftime('%H', timestamp) as hour"),
          [mockDate],
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe('getStudentActivitySummary', () => {
    it('should return student activity summary for a date range', (done) => {
      const studentId = 1;
      const startDate = '2023-10-01';
      const endDate = '2023-10-07';
      const mockResult = {
        name: 'John Doe',
        class: 'Grade 1',
        total_check_ins: 10,
        total_check_outs: 8,
        first_activity: '2023-10-01 08:00:00',
        last_activity: '2023-10-07 15:30:00',
      };

      db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockResult);
      });

      DismissalAnalytics.getStudentActivitySummary(studentId, startDate, endDate, (err, result) => {
        expect(err).toBeNull();
        expect(result).toEqual(mockResult);
        expect(db.get).toHaveBeenCalledWith(
          expect.stringContaining('INNER JOIN students s ON dl.student_id = s.id'),
          [studentId, startDate, endDate],
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe('getFilteredLogs', () => {
    it('should return filtered logs with all filters applied', (done) => {
      const filters = {
        startDate: '2023-10-01',
        endDate: '2023-10-07',
        action: 'check_in',
        class: 'Grade 1',
        studentId: 1,
        limit: 10,
        offset: 0,
      };
      const mockResults = [
        {
          id: 1,
          student_id: 1,
          action: 'check_in',
          timestamp: '2023-10-01 08:00:00',
          name: 'John Doe',
          class: 'Grade 1',
          barcode: '123456',
          performed_by: 'teacher1',
        },
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResults);
      });

      DismissalAnalytics.getFilteredLogs(filters, (err, results) => {
        expect(err).toBeNull();
        expect(results).toEqual(mockResults);
        expect(db.all).toHaveBeenCalledWith(
          expect.stringContaining('INNER JOIN students s ON dl.student_id = s.id'),
          [
            filters.startDate,
            filters.endDate,
            filters.action,
            filters.class,
            filters.studentId,
            filters.limit,
          ],
          expect.any(Function)
        );
        done();
      });
    });

    it('should return filtered logs with no filters applied', (done) => {
      const filters = {};
      const mockResults = [];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResults);
      });

      DismissalAnalytics.getFilteredLogs(filters, (err, results) => {
        expect(err).toBeNull();
        expect(results).toEqual(mockResults);
        expect(db.all).toHaveBeenCalledWith(
          expect.stringContaining('INNER JOIN students s ON dl.student_id = s.id'),
          [],
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe('exportLogs', () => {
    it('should return logs in CSV format with filters', (done) => {
      const filters = {
        startDate: '2023-10-01',
        endDate: '2023-10-07',
        action: 'check_out',
        class: 'Grade 2',
      };
      const mockResults = [
        {
          'Barcode': '123456',
          'Student Name': 'Jane Doe',
          'Class': 'Grade 2',
          'Action': 'check_out',
          'Timestamp': '2023-10-01 15:00:00',
          'Performed By': 'teacher2',
        },
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResults);
      });

      DismissalAnalytics.exportLogs(filters, (err, results) => {
        expect(err).toBeNull();
        expect(results).toEqual(mockResults);
        expect(db.all).toHaveBeenCalledWith(
          expect.stringContaining('s.barcode as "Barcode"'),
          [
            filters.startDate,
            filters.endDate,
            filters.action,
            filters.class,
          ],
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe('getLogsByPeriod', () => {
    it('should return logs filtered by year and month', (done) => {
      const filters = {
        year: 2023,
        month: 10,
        limit: 20,
        offset: 10,
      };
      const mockResults = [
        {
          id: 1,
          student_id: 1,
          action: 'check_in',
          timestamp: '2023-10-01 08:00:00',
          name: 'John Doe',
          class: 'Grade 1',
          barcode: '123456',
          performed_by: 'teacher1',
        },
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResults);
      });

      DismissalAnalytics.getLogsByPeriod(filters, (err, results) => {
        expect(err).toBeNull();
        expect(results).toEqual(mockResults);
        expect(db.all).toHaveBeenCalledWith(
          expect.stringContaining("strftime('%Y', dl.timestamp) = ?"),
          [
            filters.year.toString(),
            filters.month.toString().padStart(2, '0'),
            filters.limit,
            filters.offset,
          ],
          expect.any(Function)
        );
        done();
      });
    });

    it('should return logs filtered by year only', (done) => {
      const filters = {
        year: 2023,
      };
      const mockResults = [];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResults);
      });

      DismissalAnalytics.getLogsByPeriod(filters, (err, results) => {
        expect(err).toBeNull();
        expect(results).toEqual(mockResults);
        expect(db.all).toHaveBeenCalledWith(
          expect.stringContaining("strftime('%Y', dl.timestamp) = ?"),
          [filters.year.toString()],
          expect.any(Function)
        );
        done();
      });
    });
  });
});

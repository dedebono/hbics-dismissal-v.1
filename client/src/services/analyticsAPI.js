import api from './api';

const analyticsAPI = {
  // Get daily statistics
  getDailyStats: (date) => api.get(`/analytics/daily-stats/${date}`),
  
  // Get weekly statistics
  getWeeklyStats: (startDate, endDate) => 
    api.get(`/analytics/weekly-stats?startDate=${startDate}&endDate=${endDate}`),
  
  // Get class-based statistics
  getClassStats: (date) => api.get(`/analytics/class-stats/${date}`),
  
  // Get peak hours analysis
  getPeakHours: (date) => api.get(`/analytics/peak-hours/${date}`),
  
  // Get student activity summary
  getStudentActivitySummary: (studentId, startDate, endDate) => 
    api.get(`/analytics/student-summary/${studentId}?startDate=${startDate}&endDate=${endDate}`),
  
  // Get filtered logs
  getFilteredLogs: (params) => api.get(`/analytics/filtered-logs?${params}`),
  
  // Export logs to CSV
  exportLogs: (params) => api.get(`/analytics/export-logs?${params}`, {
    responseType: 'blob'
  })
};

export default analyticsAPI;

import React, { useState, useEffect } from 'react';
import { dismissalAPI } from '../services/api';
import { CSVLink } from 'react-csv';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const EnhancedDismissalLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
    endDate: new Date(),
    action: '',
    class: '',
    studentName: ''
  });
  const [classes, setClasses] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [classStats, setClassStats] = useState([]);
  const [peakHours, setPeakHours] = useState([]);

  useEffect(() => {
    fetchLogs();
    fetchClasses();
    fetchStatistics();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: filters.startDate.toISOString().split('T')[0],
        endDate: filters.endDate.toISOString().split('T')[0],
        limit: 1000
      });
      
      if (filters.action) params.append('action', filters.action);
      if (filters.class) params.append('class', filters.class);
      
      const response = await dismissalAPI.getFilteredLogs(params.toString());
      setLogs(response.data);
    } catch (error) {
      toast.error('Error fetching dismissal logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await dismissalAPI.getClasses();
      setClasses(response.data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const startDate = filters.startDate.toISOString().split('T')[0];
      const endDate = filters.endDate.toISOString().split('T')[0];
      
      // Fetch weekly stats
      const weeklyResponse = await dismissalAPI.getWeeklyStats(startDate, endDate);
      setWeeklyStats(weeklyResponse.data);
      
      // Fetch class stats for the last date
      const classResponse = await dismissalAPI.getClassStats(endDate);
      setClassStats(classResponse.data);
      
      // Fetch peak hours
      const peakResponse = await dismissalAPI.getPeakHours(endDate);
      setPeakHours(peakResponse.data);
      
      // Fetch daily stats
      const statsResponse = await dismissalAPI.getDailyStats(endDate);
      setStatistics(statsResponse.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filters.studentName && !log.name.toLowerCase().includes(filters.studentName.toLowerCase())) {
      return false;
    }
    return true;
  });

  const exportData = filteredLogs.map(log => ({
    'Student Name': log.name,
    'Class': log.class,
    'Barcode': log.barcode,
    'Action': log.action,
    'Timestamp': new Date(log.timestamp).toLocaleString(),
    'Performed By': log.performed_by || 'System'
  }));

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="enhanced-dismissal-log">
      <h2>Enhanced Dismissal Logs</h2>
      
      {/* Statistics Dashboard */}
      {statistics && (
        <div className="stats-dashboard">
          <h3>Today's Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Check-ins</h4>
              <p>{statistics.check_ins || 0}</p>
            </div>
            <div className="stat-card">
              <h4>Check-outs</h4>
              <p>{statistics.check_outs || 0}</p>
            </div>
            <div className="stat-card">
              <h4>Unique Students</h4>
              <p>{statistics.unique_students || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filter-grid">
          <div className="filter-item">
            <label>Start Date:</label>
            <DatePicker
              selected={filters.startDate}
              onChange={(date) => handleFilterChange('startDate', date)}
              dateFormat="yyyy-MM-dd"
            />
          </div>
          <div className="filter-item">
            <label>End Date:</label>
            <DatePicker
              selected={filters.endDate}
              onChange={(date) => handleFilterChange('endDate', date)}
              dateFormat="yyyy-MM-dd"
            />
          </div>
          <div className="filter-item">
            <label>Action:</label>
            <select 
              value={filters.action} 
              onChange={(e) => handleFilterChange('action', e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="check_in">Check In</option>
              <option value="check_out">Check Out</option>
            </select>
          </div>
          <div className="filter-item">
            <label>Class:</label>
            <select 
              value={filters.class} 
              onChange={(e) => handleFilterChange('class', e.target.value)}
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label>Student Name:</label>
            <input
              type="text"
              placeholder="Search by name"
              value={filters.studentName}
              onChange={(e) => handleFilterChange('studentName', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-section">
        <div className="chart-container">
          <h3>Weekly Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="check_ins" stroke="#8884d8" name="Check-ins" />
              <Line type="monotone" dataKey="check_outs" stroke="#82ca9d" name="Check-outs" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Class Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={classStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="class" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="check_ins" fill="#8884d8" name="Check-ins" />
              <Bar dataKey="check_outs" fill="#82ca9d" name="Check-outs" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Peak Hours</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="activity_count" fill="#ffc658" name="Total Activity" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Logs Table */}
      <div className="logs-section">
        <h3>Activity Logs</h3>
        <div className="export-section">
          <CSVLink 
            data={exportData} 
            filename={`dismissal_logs_${new Date().toISOString().split('T')[0]}.csv`}
            className="btn btn-primary"
          >
            Export to CSV
          </CSVLink>
        </div>
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Barcode</th>
                  <th>Action</th>
                  <th>Timestamp</th>
                  <th>Performed By</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td>{log.name}</td>
                    <td>{log.class}</td>
                    <td>{log.barcode}</td>
                    <td>
                      <span className={`action-badge ${log.action}`}>
                        {log.action === 'check_in' ? 'Check In' : 'Check Out'}
                      </span>
                    </td>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>{log.performed_by || 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedDismissalLog;

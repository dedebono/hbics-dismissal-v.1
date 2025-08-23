import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DismissalLogs.css';
import moment from 'moment-timezone';

const DismissalLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    filterAndSortLogs();
  }, [logs, searchTerm, filterAction, startDate, endDate, selectedMonth, selectedClass, sortBy, sortOrder]);

  useEffect(() => {
    // Extract unique classes from logs
    const classes = [...new Set(logs.map(log => log.class))].sort();
    setAvailableClasses(classes);
  }, [logs]);

const fetchLogs = async () => {
  try {
    const token = localStorage.getItem('token'); // Ensure token is being retrieved
    console.log("Token being sent:", token);
    const response = await axios.get('http://localhost:5000/api/dismissal/logs', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    setLogs(response.data);
    setLoading(false);
  } catch (err) {
    setError('Failed to fetch dismissal logs');
    setLoading(false);
  }
};
  const filterAndSortLogs = () => {
    let filtered = [...logs];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.barcode.includes(searchTerm)
      );
    }

    // Filter by action
    if (filterAction !== 'all') {
      filtered = filtered.filter(log => log.action === filterAction);
    }

    // Filter by class
    if (selectedClass !== 'all') {
      filtered = filtered.filter(log => log.class === selectedClass);
    }

    // Filter by date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end day
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= start && logDate <= end;
      });
    }

    // Filter by month
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate.getMonth() === month - 1;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'timestamp') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchLogs();
  };

    const getActionColor = (action) => {
    switch (action) {
      case 'check_in':
        return 'action-checkin';
      case 'check_out':
        return 'action-checkout';
      default:
        return 'action-default';
    }
  };

const exportToCSV = () => {
  if (filteredLogs.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = ['ID', 'Student Name', 'Class', 'Barcode', 'Action', 'Timestamp'];
  const csvContent = [
    headers.join(','),
    ...filteredLogs.map(log => [
      log.id,
      `"${log.name}"`,
      `"${log.class}"`,
      log.barcode,
      log.action,
      `"${moment.utc(log.timestamp).tz('Asia/Singapore').format('YYYY-MM-DD HH:mm:ss')}"` // Convert to Singapore Time
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `dismissal-logs-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const exportToJSON = () => {
  if (filteredLogs.length === 0) {
    alert('No data to export');
    return;
  }

  const updatedLogs = filteredLogs.map(log => ({
    ...log,
    timestamp: moment.utc(log.timestamp).tz('Asia/Singapore').format('YYYY-MM-DD HH:mm:ss') // Convert to Singapore Time
  }));

  const jsonContent = JSON.stringify(updatedLogs, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `dismissal-logs-${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

  const getActionLabel = (action) => {
    switch (action) {
      case 'check_in':
        return 'Check In';
      case 'check_out':
        return 'Check Out';
      default:
        return action;
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) {
    return <div className="loading">Loading dismissal logs...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="dismissal-logs-container">
      <div className="logs-header">
        <h1>Dismissal Logs</h1>
        <div className="header-actions">
          <button onClick={handleRefresh} className="refresh-btn">
            Refresh
          </button>
          <button onClick={exportToCSV} className="export-btn">
            Export CSV
          </button>
          <button onClick={exportToJSON} className="refresh-btn">
            Export JSON
          </button>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>Search:</label>
          <input
            type="text"
            placeholder="Search by name, class, or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>Action:</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Actions</option>
            <option value="check_in">Check In</option>
            <option value="check_out">Check Out</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Class:</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Classes</option>
            {availableClasses.map(className => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="filter-select"
          >
            <option value="">All Months</option>
            <option value="2024-01">January</option>
            <option value="2024-02">February</option>
            <option value="2024-03">March</option>
            <option value="2024-04">April</option>
            <option value="2024-05">May</option>
            <option value="2024-06">June</option>
            <option value="2024-07">July</option>
            <option value="2024-08">August</option>
            <option value="2024-09">September</option>
            <option value="2024-10">October</option>
            <option value="2024-11">November</option>
            <option value="2024-12">December</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Start Date:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="filter-select"
          />
        </div>

        <div className="filter-group">
          <label>End Date:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="filter-select"
          />
        </div>

        <div className="filter-group">
          <label>Sort By:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="timestamp">Time</option>
            <option value="name">Name</option>
            <option value="class">Class</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Order:</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="filter-select"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      <div className="logs-summary">
        <p>Total Records: {filteredLogs.length}</p>
      </div>

      <div className="logs-table-container">
        <table className="logs-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Student Name</th>
              <th>Class</th>
              <th>Barcode</th>
              <th>Action</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((log) => (
              <tr key={log.id}>
                <td>{log.id}</td>
                <td>{log.name}</td>
                <td>{log.class}</td>
                <td>{log.barcode}</td>
                <td>
                  <span className={`action-badge ${getActionColor(log.action)}`}>
                    {getActionLabel(log.action)}
                  </span>
                </td>
                <td>{new Date(log.timestamp).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            Previous
          </button>
          
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index + 1}
              onClick={() => paginate(index + 1)}
              className={`pagination-btn ${currentPage === index + 1 ? 'active' : ''}`}
            >
              {index + 1}
            </button>
          ))}
          
          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default DismissalLogs;

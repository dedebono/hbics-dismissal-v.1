import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { studentsAPI, dismissalAPI } from '../services/api';
import toast from 'react-hot-toast';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const [barcode, setBarcode] = useState('');
  const [activeStudents, setActiveStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterClass, setFilterClass] = useState('');
  const [filterName, setFilterName] = useState('');
  const [sortField, setSortField] = useState('checked_in_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const barcodeInputRef = useRef(null);

  console.log('TeacherDashboard rendered - User:', user, 'Barcode:', barcode, 'Active students count:', activeStudents.length);

  useEffect(() => {
    console.log('TeacherDashboard useEffect - setting up active students polling');
    fetchActiveStudents();
    const interval = setInterval(fetchActiveStudents, 5000);
    return () => {
      console.log('TeacherDashboard cleanup - clearing interval');
      clearInterval(interval);
    };
  }, []);

  const fetchActiveStudents = async () => {
    console.log('Fetching active students...');
    try {
      const [activeResponse, studentsResponse] = await Promise.all([
        dismissalAPI.getActive(),
        studentsAPI.getAll()
      ]);
      
      console.log('Active students response:', activeResponse.data);
      
      // Enrich active students data with photo URLs from students data
      const enrichedActiveStudents = activeResponse.data.map(activeStudent => {
        const fullStudentData = studentsResponse.data.find(student => 
          student.barcode === activeStudent.barcode || 
          student.name === activeStudent.name
        );
        return {
          ...activeStudent,
          photo_url: fullStudentData?.photo_url || null
        };
      });
      setActiveStudents(enrichedActiveStudents);
    } catch (error) {
      console.error('Error fetching active students:', error);
    }
  };

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    console.log('Barcode submitted:', barcode);
    if (!barcode.trim()) {
      console.log('Empty barcode, returning');
      return;
    }

    setLoading(true);
    try {
      const response = await dismissalAPI.checkIn(barcode);
      toast.success(`Checked in: ${response.data.student.name}`);
      setBarcode('');
      fetchActiveStudents();
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message === 'Student is already checked in') {
        // Try to check out instead
        try {
          const response = await dismissalAPI.checkOut(barcode);
          toast.success(`Checked out: ${response.data.student.name}`);
          setBarcode('');
          fetchActiveStudents();
        } catch (checkOutError) {
          toast.error(checkOutError.response?.data?.message || 'Error processing barcode');
        }
      } else {
        toast.error(error.response?.data?.message || 'Error processing barcode');
      }
    } finally {
      setLoading(false);
      barcodeInputRef.current?.focus();
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all active students?')) {
      try {
        await dismissalAPI.clearActive();
        toast.success('All active students cleared');
        setActiveStudents([]);
      } catch (error) {
        toast.error('Error clearing active students');
      }
    }
  };

  // Get unique class names from active students
  const uniqueClasses = useMemo(() => {
    const classes = [...new Set(activeStudents.map(student => student.class))];
    return classes.sort();
  }, [activeStudents]);

  // Filter and sort students
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = activeStudents;

    // Apply class filter
    if (filterClass) {
      filtered = filtered.filter(student => 
        student.class.toLowerCase().includes(filterClass.toLowerCase())
      );
    }

    // Apply name filter
    if (filterName) {
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(filterName.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      if (sortField === 'checked_in_at') {
        aValue = new Date(a.checked_in_at);
        bValue = new Date(b.checked_in_at);
      } else {
        aValue = a[sortField]?.toString().toLowerCase() || '';
        bValue = b[sortField]?.toString().toLowerCase() || '';
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [activeStudents, filterClass, filterName, sortField, sortDirection]);

  const handleClearFilters = () => {
    setFilterClass('');
    setFilterName('');
    setSortField('checked_in_at');
    setSortDirection('desc');
  };

  const hasActiveFilters = filterClass || filterName || sortField !== 'checked_in_at' || sortDirection !== 'desc';

  return (
    <div className="teacher-dashboard">
      <header className="teacher-header">
        <div className="header-content">
          <h1>Teacher Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {user?.username}</span>
            <button onClick={logout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="teacher-main">
        {/* Barcode Scanner Section */}
        <div className="scanner-section">
          <h2>Student Check-in/Check-out</h2>
          <form onSubmit={handleBarcodeSubmit} className="scanner-form">
            <div className="form-group">
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or enter barcode"
                disabled={loading}
                autoFocus
                className="barcode-input"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || !barcode.trim()} 
              className="btn btn-primary scanner-btn"
            >
              {loading ? 'Processing...' : 'Submit'}
            </button>
          </form>
        </div>

        {/* Filter Section */}
        <div className="filter-section">
          <h2>Filter & Sort Students</h2>
          <div className="filter-controls">
            <div className="filter-group">
              <label htmlFor="class-filter">Filter by Class:</label>
              <select
                id="class-filter"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="filter-select"
              >
                <option value="">All Classes</option>
                {uniqueClasses.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="name-filter">Filter by Name:</label>
              <input
                id="name-filter"
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Search student name..."
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label htmlFor="sort-field">Sort by:</label>
              <select
                id="sort-field"
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="filter-select"
              >
                <option value="name">Name</option>
                <option value="class">Class</option>
                <option value="checked_in_at">Check-in Time</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="sort-direction">Order:</label>
              <select
                id="sort-direction"
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value)}
                className="filter-select"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button onClick={handleClearFilters} className="btn btn-secondary clear-filters-btn">
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Active Students Section */}
        <div className="active-students-section">
          <div className="section-header">
            <h2>
              Active Students ({filteredAndSortedStudents.length})
              {hasActiveFilters && (
                <span className="filter-indicator">
                  (Filtered from {activeStudents.length})
                </span>
              )}
            </h2>
            {activeStudents.length > 0 && (
              <button onClick={handleClearAll} className="btn btn-danger">
                Clear All
              </button>
            )}
          </div>

          {filteredAndSortedStudents.length === 0 ? (
            <div className="empty-state">
              <p>
                {activeStudents.length === 0 
                  ? 'No active students' 
                  : 'No students match your filters'
                }
              </p>
              {hasActiveFilters && (
                <button onClick={handleClearFilters} className="btn btn-primary">
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="students-grid">
              {filteredAndSortedStudents.map((student, index) => (
                <div key={index} className="student-card">
                  {student.photo_url && (
                    <div className="student-photo-container">
                      <img 
                        src={student.photo_url} 
                        alt={student.name}
                        className="student-photo"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="student-info">
                    <h3>{student.name}</h3>
                    <p className="student-class">{student.class}</p>
                    <p className="student-time">
                      Checked in: {new Date(student.checked_in_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="stats-section">
          <h2>Today's Activity</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>{activeStudents.length}</h3>
              <p>Active Students</p>
            </div>
            <div className="stat-card">
              <h3>0</h3>
              <p>Total Check-ins</p>
            </div>
            <div className="stat-card">
              <h3>0</h3>
              <p>Total Check-outs</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="teacher-footer">
        <p>HBICS Dismissal System v1.0 | &copy; 2025</p>
      </footer>
    </div>
  );
};

export default TeacherDashboard;

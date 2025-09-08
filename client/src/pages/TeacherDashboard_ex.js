import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';// Import useSocket
import { studentsAPI, dismissalAPI } from '../services/api';
import toast from 'react-hot-toast';
import './TeacherDashboard.css';
import moment from 'moment-timezone';

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const { socket, isConnected } = useSocket(); 
  const [barcode, setBarcode] = useState('');
  const [activeStudents, setActiveStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterClass, setFilterClass] = useState('');
  const [filterName, setFilterName] = useState('');
  const [sortField, setSortField] = useState('checked_in_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const barcodeInputRef = useRef(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null); // Track playing student barcode
  const audioRef = useRef(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false); // WebSocket connection status

  console.log('TeacherDashboard rendered - User:', user, 'Barcode:', barcode, 'Active students count:', activeStudents.length);

  useEffect(() => {
    // Real-time updates using WebSocket
    const socket = new WebSocket('ws://localhost:5000'); // Example WebSocket server URL
    socket.onopen = () => {
      console.log('WebSocket connection established');
      setIsWebSocketConnected(true); // Set WebSocket status to connected
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
      setIsWebSocketConnected(false); // Set WebSocket status to disconnected
    };

    socket.onmessage = (event) => {
      const student = JSON.parse(event.data);
      console.log('Socket message received:', student);
      if (student.event === 'student_checked_in') {
        handleStudentCheckedIn(student);
      } else if (student.event === 'student_checked_out') {
        handleStudentCheckedOut(student.barcode);
      }
    };

    const fetchActiveStudents = async () => {
      try {
        const [activeResponse, studentsResponse] = await Promise.all([
          dismissalAPI.getActive(),
          studentsAPI.getAll(),
        ]);
        console.log('Active students response:', activeResponse.data);

        // Enrich active students data with photo URLs from students data
        const enrichedActiveStudents = activeResponse.data.map((activeStudent) => {
          const fullStudentData = studentsResponse.data.find(
            (student) =>
              student.barcode === activeStudent.barcode || student.name === activeStudent.name
          );
          return {
            ...activeStudent,
            photo_url: fullStudentData?.photo_url || null,
          };
        });
        setActiveStudents(enrichedActiveStudents);
      } catch (error) {
        console.error('Error fetching active students:', error);
      }
    };

    fetchActiveStudents(); // Fetch once when component mounts

    const interval = setInterval(fetchActiveStudents, 5000); // Poll every 5 seconds for updates

    // Cleanup WebSocket and interval on component unmount
    return () => {
      socket.close();
      clearInterval(interval);
    };
  }, []);

  // 3) Force autofocus effect — fokus saat mount & setiap selesai loading / koneksi WS berubah
useEffect(() => {
  barcodeInputRef.current?.focus();
}, [loading, isWebSocketConnect

  const handleStudentCheckedIn = (student) => {
    setActiveStudents((prevStudents) => {
      const newActiveStudents = [student, ...prevStudents];
      if (student.sound_url && currentlyPlaying === student.barcode) {
        handlePlayPause(student.barcode);
      }
      return newActiveStudents;
    });
  };

  const handleStudentCheckedOut = (barcode) => {
    setActiveStudents((prevStudents) => {
      const updatedStudents = prevStudents.filter((student) => student.barcode !== barcode);
      if (currentlyPlaying === barcode && audioRef.current) {
        audioRef.current.pause();
        setCurrentlyPlaying(null);
      }
      return updatedStudents;
    });
  };

  const handlePlayPause = (studentBarcode) => {
    const student = activeStudents.find((s) => s.barcode === studentBarcode);
    if (!student || !student.sound_url) {
      toast.error('No sound available for this student.');
      return;
    }

    if (currentlyPlaying === studentBarcode) {
      audioRef.current?.pause();
      setCurrentlyPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = student.sound_url;
        const p = audioRef.current.play();
        if (p !== undefined) {
          p.then(() => setCurrentlyPlaying(studentBarcode))
           .catch((err) => {
             console.error('Audio playback failed:', err);
             toast.error('Could not play audio.');
             setCurrentlyPlaying(null);
           });
        }
      }
    }
  };

  const handleAudioEnded = () => {
    setCurrentlyPlaying(null);
  };

  // Get unique class names from active students
  const uniqueClasses = useMemo(() => {
    const classes = [...new Set(activeStudents.map((student) => student.class))];
    return classes.sort();
  }, [activeStudents]);

  // Filter and sort students
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = activeStudents;

    if (filterClass) {
      filtered = filtered.filter((student) =>
        student.class.toLowerCase().includes(filterClass.toLowerCase())
      );
    }

    if (filterName) {
      filtered = filtered.filter((student) =>
        student.name.toLowerCase().includes(filterName.toLowerCase())
      );
    }

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
      {/* WebSocket Status Indicator */}
      <div className={`websocket-status ${isWebSocketConnected ? 'connected' : 'disconnected'}`} />

      <header className="teacher-header">
        <div className="header-content">
          <h1>Teacher Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {user?.username}</span>
            <button onClick={logout} className="btn btn-secondary">Logout</button>
          </div>
        </div>
      </header>

      <main className="teacher-main">
        {/* Barcode Scanner Section */}
        <div className="scanner-section">
          <h2>Student Check-out</h2>
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
            <button type="submit" disabled={loading || !barcode.trim()} className="btn btn-primary scanner-btn">
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
          <h2>Active Students ({filteredAndSortedStudents.length})</h2>
          {filteredAndSortedStudents.length === 0 ? (
            <div className="empty-state">
              <p>No active students</p>
            </div>
          ) : (
            <div className="students-grid">
              {filteredAndSortedStudents.map((student) => (
                <div key={student.barcode} className={`student-card ${currentlyPlaying === student.barcode ? 'playing' : ''}`}>
                  {student.photo_url && (
                    <div className="student-photo-container">
                      <img
                        src={student.photo_url}
                        alt={student.name}
                        className="student-photo"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}
                  <div className="student-info">
                    <h3>{student.name}</h3>
                    <p className="student-class">{student.class}</p>
                    <p className="student-time">
                      Checked in: {moment.utc(student.checked_in_at).tz('Asia/Singapore').format('hh:mm A')}
                    </p>
                    {student.sound_url && (
                      <div className="sound-controls">
                        <button onClick={() => handlePlayPause(student.barcode)} className="btn-sound">
                          {currentlyPlaying === student.barcode ? 'Pause' : 'Play Sound'}
                        </button>
                      </div>
                    )}
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
      <audio ref={audioRef} onEnded={handleAudioEnded} />
    </div>
  );
};

export default TeacherDashboard;

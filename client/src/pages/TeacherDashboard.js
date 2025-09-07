import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { studentsAPI, dismissalAPI } from '../services/api';
import toast from 'react-hot-toast';
import './TeacherDashboard.css';
import moment from 'moment-timezone';

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const { socket, isConnected } = useSocket();

  // Barcode and student check-in/out state
  const [barcode, setBarcode] = useState('');
  const [activeStudents, setActiveStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filter and sort state
  const [filterClass, setFilterClass] = useState('');
  const [filterName, setFilterName] = useState('');
  const [sortField, setSortField] = useState('checked_in_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Playback state
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [playbackState, setPlaybackState] = useState('stopped');
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(null);
  const [isLooping, setIsLooping] = useState(false);

  const barcodeInputRef = useRef(null);
  const audioRef = useRef(null);
  const [userHasInteracted, setUserHasInteracted] = useState(false);

  // Handle user interaction to enable sound
  useEffect(() => {
    const handleInteraction = () => {
      setUserHasInteracted(true);
      window.removeEventListener('click', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    return () => window.removeEventListener('click', handleInteraction);
  }, []);

  // WebSocket events
  useEffect(() => {
    if (socket) {
      socket.on('student_checked_in', handleStudentCheckedIn);
      socket.on('student_checked_out', handleStudentCheckedOut);
    }

    return () => {
      if (socket) {
        socket.off('student_checked_in', handleStudentCheckedIn);
        socket.off('student_checked_out', handleStudentCheckedOut);
      }
    };
  }, [socket, userHasInteracted, currentlyPlaying, playbackState]);

  // Fetch active students and poll every 5 seconds
  useEffect(() => {
    const fetchActiveStudents = async () => {
      try {
        const [activeResponse, studentsResponse] = await Promise.all([
          dismissalAPI.getActive(),
          studentsAPI.getAll(),
        ]);

        const enrichedActiveStudents = activeResponse.data.map((activeStudent) => {
          const fullStudentData = studentsResponse.data.find(
            (student) =>
              student.barcode === activeStudent.barcode || student.name === activeStudent.name
          );
          return {
            ...activeStudent,
            photo_url: fullStudentData?.photo_url || null,
            sound_url: fullStudentData?.sound_url || null,
          };
        });
        setActiveStudents(enrichedActiveStudents);
      } catch (error) {
        console.error('Error fetching active students:', error);
      }
    };

    fetchActiveStudents(); // Initial fetch

    const interval = setInterval(fetchActiveStudents, 5000); // Poll every 5 seconds

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, []);

  // Real-time student check-in handler
  const handleStudentCheckedIn = (student) => {
    setActiveStudents((prevStudents) => {
      const newActiveStudents = [student, ...prevStudents];
      if (playbackState === 'playing' && userHasInteracted && student.sound_url) {
        handlePlayPause(student.barcode);
      } else if (student.sound_url && !userHasInteracted) {
        toast('Click anywhere to enable automatic sound.', { duration: 5000, icon: '🔊' });
      }
      return newActiveStudents;
    });
  };

  // Real-time student check-out handler
  const handleStudentCheckedOut = (barcode) => {
    setActiveStudents((prevStudents) => {
      const updatedStudents = prevStudents.filter((student) => student.barcode !== barcode);
      if (currentlyPlaying === barcode && audioRef.current) {
        audioRef.current.pause(); // Stop audio if currently playing
        setCurrentlyPlaying(null);
        if (playbackState === 'playing' || playbackState === 'paused') {
          const newIndex = updatedStudents.findIndex(s => s.barcode === currentlyPlaying);
          if (newIndex === -1) {
            stopAllSounds();
          } else {
            setCurrentPlayingIndex(newIndex);
          }
        }
      }
      return updatedStudents;
    });
  };

  // Barcode submission for check-out
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setLoading(true);
    try {
      const activeStudent = activeStudents.find((student) => student.barcode === barcode);
      if (activeStudent) {
        const response = await dismissalAPI.checkOut(barcode);
        toast.success(`Checked out: ${response.data.student.name}`);
        setBarcode('');
      } else {
        toast.error('Student not checked in yet.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error processing checkout');
    } finally {
      setLoading(false);
      barcodeInputRef.current?.focus();
    }
  };

  // Handle play/pause for a single student
  const handlePlayPause = (studentBarcode) => {
    if (!userHasInteracted) {
      toast.error('Click anywhere on the page to enable sound.');
      return;
    }
    const student = activeStudents.find((s) => s.barcode === studentBarcode);
    if (!student || !student.sound_url) {
      toast.error('No sound available for this student.');
      return;
    }

    if (currentlyPlaying === studentBarcode) {
      audioRef.current?.pause();
      setCurrentlyPlaying(null);
      setPlaybackState('paused');
    } else {
      if (audioRef.current) {
        audioRef.current.src = student.sound_url;
        const p = audioRef.current.play();
        if (p !== undefined) {
          p.then(() => {
            setCurrentlyPlaying(studentBarcode);
            setPlaybackState('playing');
            setCurrentPlayingIndex(filteredAndSortedStudents.findIndex(s => s.barcode === studentBarcode));
          })
          .catch((err) => {
            console.error('Audio playback failed:', err);
            toast.error('Could not play audio.');
            setCurrentlyPlaying(null);
            setPlaybackState('stopped');
          });
        }
      }
    }
  };

  // Handle play all sounds globally
  const playAllSounds = () => {
    if (!userHasInteracted) {
      toast.error('Click anywhere on the page to enable sound.');
      return;
    }
    if (filteredAndSortedStudents.length === 0) {
      toast.error('No active students to play sounds for.');
      return;
    }

    let startIndex = currentPlayingIndex !== null ? currentPlayingIndex : 0;
    if (playbackState === 'paused' && currentlyPlaying) {
      const student = filteredAndSortedStudents.find(s => s.barcode === currentlyPlaying);
      if (student) {
        audioRef.current.play();
        setPlaybackState('playing');
        return;
      }
    }

    let studentToPlay = null;
    for (let i = startIndex; i < filteredAndSortedStudents.length; i++) {
      if (filteredAndSortedStudents[i].sound_url) {
        studentToPlay = filteredAndSortedStudents[i];
        setCurrentPlayingIndex(i);
        break;
      }
    }

    if (studentToPlay) {
      handlePlayPause(studentToPlay.barcode);
    } else {
      toast.error('No students with sound files found.');
      setPlaybackState('stopped');
      setCurrentPlayingIndex(null);
    }
  };

  // Pause all sounds
  const pauseAllSounds = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlaybackState('paused');
    }
  };

  // Stop all sounds
  const stopAllSounds = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setCurrentlyPlaying(null);
    setPlaybackState('stopped');
    setCurrentPlayingIndex(null);
  };

  // Restart all sounds
  const restartAllSounds = () => {
    stopAllSounds();
    setCurrentPlayingIndex(0);
    setTimeout(() => {
      playAllSounds();
    }, 100);
  };

  // Toggle loop playback
  const toggleLoopPlayback = () => {
    if (isLooping) {
      setIsLooping(false);
      toast('Looping stopped.');
    } else {
      setIsLooping(true);
      toast.success('Looping enabled. The list will now loop continuously.');
      if (playbackState === 'stopped') {
        restartAllSounds();
      }
    }
  };

  // Handle audio ended and manage loop
  const handleAudioEnded = () => {
    setCurrentlyPlaying(null);
    if (playbackState === 'playing') {
      let nextIndex = currentPlayingIndex !== null ? currentPlayingIndex + 1 : 0;
      let studentToPlay = null;

      for (let i = nextIndex; i < filteredAndSortedStudents.length; i++) {
        if (filteredAndSortedStudents[i].sound_url) {
          studentToPlay = filteredAndSortedStudents[i];
          nextIndex = i;
          break;
        }
      }

      if (studentToPlay) {
        setCurrentPlayingIndex(nextIndex);
        handlePlayPause(studentToPlay.barcode);
      } else if (isLooping) {
        setCurrentPlayingIndex(0);
        const firstStudentWithSound = filteredAndSortedStudents.find(s => s.sound_url);
        if (firstStudentWithSound) {
          handlePlayPause(firstStudentWithSound.barcode);
        } else {
          stopAllSounds();
          toast.success('No students with sound files found to loop.');
        }
      } else {
        stopAllSounds();
        toast.success('All student sounds played.');
      }
    }
  };

  // Get unique class names for filtering
  const uniqueClasses = useMemo(() => {
    const classes = [...new Set(activeStudents.map((student) => student.class))];
    return classes.sort();
  }, [activeStudents]);

  // Filter and sort active students
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = activeStudents;
    if (filterClass) {
      filtered = filtered.filter((student) => student.class.toLowerCase().includes(filterClass.toLowerCase()));
    }

    if (filterName) {
      filtered = filtered.filter((student) => student.name.toLowerCase().includes(filterName.toLowerCase()));
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

  // Handle clear filters
  const handleClearFilters = () => {
    setFilterClass('');
    setFilterName('');
    setSortField('checked_in_at');
    setSortDirection('desc');
  };

  // Check if filters are active
  const hasActiveFilters = filterClass || filterName || sortField !== 'checked_in_at' || sortDirection !== 'desc';

  return (
    <div className="teacher-dashboard">
      <div className={`websocket-status ${isConnected ? 'connected' : 'disconnected'}`} />
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

        {/* Global Playback Controls */}
        <div className="playback-controls">
          <h2>Audio Playback</h2>
          <button onClick={playAllSounds} disabled={playbackState === 'playing'} className="btn btn-primary">
            Play All
          </button>
          <button onClick={pauseAllSounds} disabled={playbackState !== 'playing'} className="btn btn-secondary">
            Pause
          </button>
          <button onClick={stopAllSounds} disabled={playbackState === 'stopped' && !currentlyPlaying} className="btn btn-danger">
            Stop
          </button>
          <button onClick={restartAllSounds} disabled={!filteredAndSortedStudents.some(s => s.sound_url)} className="btn btn-info">
            Restart
          </button>
          <button onClick={toggleLoopPlayback} className={`btn ${isLooping ? 'btn-danger' : 'btn-success'}`}>
            {isLooping ? 'Stop Loop' : 'Start Loop'}
          </button>
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
                  <option key={className} value={className}>{className}</option>
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

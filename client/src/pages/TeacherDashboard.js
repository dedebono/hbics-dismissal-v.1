import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null); // barcode
  const [playbackState, setPlaybackState] = useState('stopped'); // 'playing' | 'paused' | 'stopped'
  const [isLooping, setIsLooping] = useState(false);

  const barcodeInputRef = useRef(null);
  const audioRef = useRef(null);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const playbackQueueRef = useRef([]); // array of students (filtered with sound)
  const currentPlayingIndexRef = useRef(-1);

  // Enable audio after user interaction (autoplay policy)
  useEffect(() => {
    const handleInteraction = () => {
      setUserHasInteracted(true);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  // Fetch active students and poll every 5 seconds (fallback to realtime)
  useEffect(() => {
    let isMounted = true;
    const fetchActiveStudents = async () => {
      try {
        const [activeResponse, studentsResponse] = await Promise.all([
          dismissalAPI.getActive(),
          studentsAPI.getAll(),
        ]);

        const enriched = activeResponse?.data?.map((activeStudent) => {
          const full = studentsResponse?.data?.find(
            (s) => s.barcode === activeStudent.barcode || s.name === activeStudent.name
          );
          return {
            ...activeStudent,
            photo_url: full?.photo_url || null,
            sound_url: full?.sound_url || null,
          };
        }) || [];

        if (isMounted) setActiveStudents(enriched);
      } catch (error) {
        console.error('Error fetching active students:', error);
      }
    };

    fetchActiveStudents();
    const interval = setInterval(fetchActiveStudents, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Helpers: stop a single sound (no queue changes)
  const stopSingleSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentlyPlaying(null);
  }, []);

  // Filter & sort
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = [...activeStudents]; // avoid mutating state
    if (filterClass) {
      filtered = filtered.filter(
        (s) => (s.class || '').toLowerCase().includes(filterClass.toLowerCase())
      );
    }
    if (filterName) {
      filtered = filtered.filter(
        (s) => (s.name || '').toLowerCase().includes(filterName.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      let aValue, bValue;
      if (sortField === 'checked_in_at') {
        aValue = new Date(a.checked_in_at || 0).getTime();
        bValue = new Date(b.checked_in_at || 0).getTime();
      } else {
        aValue = (a[sortField] ?? '').toString().toLowerCase();
        bValue = (b[sortField] ?? '').toString().toLowerCase();
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [activeStudents, filterClass, filterName, sortField, sortDirection]);

  // Unique classes for the dropdown
  const uniqueClasses = useMemo(() => {
    const set = new Set((activeStudents || []).map((s) => s.class).filter(Boolean));
    return Array.from(set).sort();
  }, [activeStudents]);

  // Socket handlers (stable via useCallback)
  const handleStudentCheckedIn = useCallback((student) => {
    setActiveStudents((prev) => {
      // enrich minimally to keep real-time snappy; full enrichment comes from poll
      return [student, ...prev];
    });
  }, []);

  const handleStudentCheckedOut = useCallback((barcodeToOut) => {
    setActiveStudents((prev) => {
      const updated = prev.filter((s) => s.barcode !== barcodeToOut);
      if (currentlyPlaying === barcodeToOut) {
        // stop current and let ended-handler decide next
        stopSingleSound();
      }
      return updated;
    });
  }, [currentlyPlaying, stopSingleSound]);

  // Attach WebSocket events
  useEffect(() => {
    if (!socket) return;
    socket.on('student_checked_in', handleStudentCheckedIn);
    socket.on('student_checked_out', handleStudentCheckedOut);
    return () => {
      socket.off('student_checked_in', handleStudentCheckedIn);
      socket.off('student_checked_out', handleStudentCheckedOut);
    };
  }, [socket, handleStudentCheckedIn, handleStudentCheckedOut]);

  // Barcode submission for check-out
  const handleBarcodeSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setLoading(true);
    try {
      const activeStudent = activeStudents.find((s) => s.barcode === barcode);
      if (activeStudent) {
        const response = await dismissalAPI.checkOut(barcode);
        toast.success(`Checked out: ${response?.data?.student?.name ?? activeStudent.name ?? 'Student'}`);
      } else {
        toast.error('Student not checked in yet.');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Error processing checkout');
    } finally {
      setBarcode('');
      setLoading(false);
      barcodeInputRef.current?.focus();
    }
  }, [barcode, activeStudents]);

  // Keep focus on input after loading changes
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [loading]);

  // Play/pause single student
  const handlePlayPause = useCallback((studentBarcode) => {
    if (!userHasInteracted) {
      toast.error('Klik di mana saja pada halaman untuk mengaktifkan suara.');
      return;
    }
    const student = activeStudents.find((s) => s.barcode === studentBarcode);
    if (!student || !student.sound_url) {
      toast.error('Tidak ada suara untuk siswa ini.');
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (currentlyPlaying === studentBarcode) {
      // pause/stop current
      stopSingleSound();
      setPlaybackState('paused');
      return;
    }

    // start new
    stopSingleSound();
    audio.src = student.sound_url;
    const p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        setCurrentlyPlaying(studentBarcode);
        setPlaybackState('playing');
        // align index with current filtered queue
        const idx = filteredAndSortedStudents.findIndex((s) => s.barcode === studentBarcode);
        currentPlayingIndexRef.current = idx;
      }).catch((err) => {
        console.error('Audio playback failed:', err);
        toast.error('Gagal memutar audio.');
        setCurrentlyPlaying(null);
        setPlaybackState('stopped');
      });
    }
  }, [userHasInteracted, activeStudents, currentlyPlaying, stopSingleSound, filteredAndSortedStudents]);

  // Global controls
  const playAllSounds = useCallback(() => {
    if (!userHasInteracted) {
      toast.error('Klik di mana saja pada halaman untuk mengaktifkan suara.');
      return;
    }
    const studentsWithSound = filteredAndSortedStudents.filter((s) => s.sound_url);
    if (studentsWithSound.length === 0) {
      toast.error('Tidak ada siswa aktif dengan file suara.');
      setPlaybackState('stopped');
      return;
    }

    // If resuming from pause and we still have something playing, just resume
    if (playbackState === 'paused' && currentlyPlaying && audioRef.current) {
      audioRef.current.play().catch(() => {});
      setPlaybackState('playing');
      return;
    }

    playbackQueueRef.current = studentsWithSound;

    // start at current index if valid, else at 0
    let startIndex = currentPlayingIndexRef.current;
    if (startIndex < 0 || startIndex >= playbackQueueRef.current.length) {
      startIndex = 0;
      currentPlayingIndexRef.current = 0;
    }

    const toPlay = playbackQueueRef.current[startIndex];
    if (toPlay) {
      handlePlayPause(toPlay.barcode);
    } else {
      // if somehow missing, move to next
      handleAudioEnded();
    }
  }, [userHasInteracted, filteredAndSortedStudents, playbackState, currentlyPlaying, handlePlayPause]);

  const pauseAllSounds = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlaybackState('paused');
    }
  }, []);

  const stopAllSounds = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      // avoid lingering network requests
      audio.removeAttribute('src');
      audio.load();
    }
    setCurrentlyPlaying(null);
    setPlaybackState('stopped');
    currentPlayingIndexRef.current = -1;
    playbackQueueRef.current = [];
  }, []);

  const restartAllSounds = useCallback(() => {
    stopAllSounds();
    // short timeout to ensure audio element settled
    setTimeout(() => playAllSounds(), 100);
  }, [stopAllSounds, playAllSounds]);

  const toggleLoopPlayback = useCallback(() => {
    setIsLooping((prev) => {
      const next = !prev;
      if (next) {
        toast.success('Loop aktif. Daftar akan berulang terus.');
        if (playbackState === 'stopped') {
          restartAllSounds();
        }
      } else {
        toast('Loop dimatikan.');
      }
      return next;
    });
  }, [playbackState, restartAllSounds]);

  // Audio ended handler (advance queue / loop)
  const handleAudioEnded = useCallback(() => {
    setCurrentlyPlaying(null);

    if (playbackState !== 'playing') return;

    const queue = playbackQueueRef.current;
    let nextIndex = (currentPlayingIndexRef.current ?? -1) + 1;
    let nextStudent = null;

    // find next with sound
    for (let i = nextIndex; i < queue.length; i += 1) {
      if (queue[i]?.sound_url) {
        nextStudent = queue[i];
        currentPlayingIndexRef.current = i;
        break;
      }
    }

    if (nextStudent) {
      handlePlayPause(nextStudent.barcode);
      return;
    }

    // end of list
    if (isLooping) {
      // wrap to first with sound
      const firstWithSound = queue.find((s) => s.sound_url);
      if (firstWithSound) {
        currentPlayingIndexRef.current = queue.findIndex((s) => s.barcode === firstWithSound.barcode);
        handlePlayPause(firstWithSound.barcode);
      } else {
        stopAllSounds();
        toast.success('Tidak ada siswa dengan file suara untuk di-loop.');
      }
    } else {
      stopAllSounds();
      toast.success('Semua suara siswa telah diputar.');
    }
  }, [playbackState, isLooping, handlePlayPause, stopAllSounds]);

  // Keep queue in sync with current filtered list
  useEffect(() => {
    if (playbackState === 'playing' || playbackState === 'paused') {
      const newQueue = filteredAndSortedStudents.filter((s) => s.sound_url);
      const playingIndex = currentlyPlaying
        ? newQueue.findIndex((s) => s.barcode === currentlyPlaying)
        : -1;

      if (currentlyPlaying && playingIndex === -1) {
        // currently playing student removed (e.g., checked out)
        stopAllSounds();
        toast.success('Siswa yang sedang diputar sudah checkout. Pemutaran dihentikan.');
        return;
      }

      playbackQueueRef.current = newQueue;
      currentPlayingIndexRef.current = playingIndex;
    }
  }, [filteredAndSortedStudents, playbackState, currentlyPlaying, stopAllSounds]);

  // Clear filters
  const handleClearFilters = useCallback(() => {
    setFilterClass('');
    setFilterName('');
    setSortField('checked_in_at');
    setSortDirection('desc');
  }, []);

  const hasActiveFilters =
    !!filterClass || !!filterName || sortField !== 'checked_in_at' || sortDirection !== 'desc';

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
                aria-label="Barcode input"
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

        {/* Global Playback Controls */}
        <div className="playback-controls">
          <h2>Audio Playback</h2>
          <button onClick={playAllSounds} disabled={playbackState === 'playing'} className="btn btn-primary">
            Play All
          </button>
          <button onClick={pauseAllSounds} disabled={playbackState !== 'playing'} className="btn btn-secondary">
            Pause
          </button>
          <button
            onClick={stopAllSounds}
            disabled={playbackState === 'stopped' && !currentlyPlaying}
            className="btn btn-danger"
          >
            Stop
          </button>
          <button
            onClick={restartAllSounds}
            disabled={!filteredAndSortedStudents.some((s) => s.sound_url)}
            className="btn btn-info"
          >
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
                <div
                  key={student.barcode}
                  className={`student-card ${currentlyPlaying === student.barcode ? 'playing' : ''}`}
                >
                  {student.photo_url && (
                    <div className="student-photo-container">
                      <img
                        src={student.photo_url}
                        alt={student.name}
                        className="student-photo"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  )}

                  <div className="student-info">
                    <h3>{student.name}</h3>
                    <p className="student-class">{student.class}</p>
                    <p className="student-time">
                      Checked in:{' '}
                      {moment
                        .utc(student.checked_in_at)
                        .tz('Asia/Jakarta')
                        .format('HH:mm')}
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

        {/* Quick Stats (placeholder) */}
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

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { studentsAPI, dismissalAPI } from '../services/api';
import toast from 'react-hot-toast';
import './StudentDashboard.css';
import moment from 'moment-timezone';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  const [barcode, setBarcode] = useState('');
  const [activeStudents, setActiveStudents] = useState([]);
  const [allStudentsMap, setAllStudentsMap] = useState({}); // barcode -> student master
  const [loading, setLoading] = useState(false);
  const barcodeInputRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(moment().format('HH:mm:ss'));

  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const audioRef = useRef(null);
  const [userHasInteracted, setUserHasInteracted] = useState(false);

  useEffect(() => {
    const handleInteraction = () => {
      setUserHasInteracted(true);
      window.removeEventListener('click', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    return () => window.removeEventListener('click', handleInteraction);
  }, []);

  // initial load: master students + active students
  useEffect(() => {
    let isMounted = true;

    const loadAll = async () => {
      try {
        const [studentsResp, activeResp] = await Promise.all([
          studentsAPI.getAll(),
          dismissalAPI.getActive(),
        ]);

        if (!isMounted) return;

        const map = {};
        (studentsResp.data || []).forEach(s => {
          if (s.barcode) map[s.barcode] = s;
        });
        setAllStudentsMap(map);

        const enriched = (activeResp.data || []).map(as => {
          const master = map[as.barcode] || {};
          return {
            ...as,
            photo_url: master.photo_url || null,
            sound_url: master.sound_url || null,
            name: as.name ?? master.name ?? '',
            class: as.class ?? master.class ?? '',
          };
        });
        setActiveStudents(enriched);
      } catch (e) {
        console.error('Initial load failed:', e);
      }
    };

    const tick = setInterval(() => setCurrentTime(moment().format('HH:mm:ss')), 1000);
    loadAll(); // Initial fetch
    const interval = setInterval(loadAll, 5000); // Poll every 5 seconds

    return () => {
      isMounted = false;
      clearInterval(tick);
      clearInterval(interval); // Cleanup interval on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // socket handlers
  useEffect(() => {
    if (!socket) return;

    const onFullSync = (data) => {
      if (data?.type !== 'active_students') return;
      const list = data.payload || [];
      const enriched = list.map(as => {
        const master = allStudentsMap[as.barcode] || {};
        return {
          ...as,
          photo_url: as.photo_url ?? master.photo_url ?? null,
          sound_url: as.sound_url ?? master.sound_url ?? null,
          name: as.name ?? master.name ?? '',
          class: as.class ?? master.class ?? '',
        };
      });

      setActiveStudents(prev => {
        // detect additions for optional auto-play
        const previousBarcodes = new Set(prev.map(p => p.barcode));
        const newOnes = enriched.filter(s => !previousBarcodes.has(s.barcode));
        if (newOnes.length > 0) {
          const withSound = newOnes.find(s => s.sound_url);
          if (withSound) {
            if (userHasInteracted) handlePlayPause(withSound.barcode, enriched);
            else {
              toast('Click anywhere to enable automatic sound.', { duration: 5000, icon: '🔊' });
            }
          }
        }

        // stop if currently playing got removed
        const stillExists = enriched.some(s => s.barcode === currentlyPlaying);
        if (!stillExists && currentlyPlaying && audioRef.current) {
          audioRef.current.pause();
          setCurrentlyPlaying(null);
        }
        return enriched;
      });
    };

    const onCheckedIn = (payload) => {
      // payload: { barcode, name?, class?, checked_in_at? }
      setActiveStudents(prev => {
        const exists = prev.some(s => s.barcode === payload.barcode);
        if (exists) return prev;

        const master = allStudentsMap[payload.barcode] || {};
        const newStudent = {
          ...payload,
          photo_url: master.photo_url || null,
          sound_url: master.sound_url || null,
          name: payload.name ?? master.name ?? '',
          class: payload.class ?? master.class ?? '',
          checked_in_at: payload.checked_in_at ?? new Date().toISOString(),
        };
        const next = [newStudent, ...prev];

        if (newStudent.sound_url) {
          if (userHasInteracted) handlePlayPause(newStudent.barcode, next);
          else toast('Click anywhere to enable automatic sound.', { duration: 5000, icon: '🔊' });
        }
        return next;
      });
    };

    const onCheckedOut = ({ barcode }) => {
      setActiveStudents(prev => {
        const next = prev.filter(s => s.barcode !== barcode);
        if (currentlyPlaying === barcode && audioRef.current) {
          audioRef.current.pause();
          setCurrentlyPlaying(null);
        }
        return next;
      });
    };

    socket.on('active_students', onFullSync);
    socket.on('student_checked_in', onCheckedIn);
    socket.on('student_checked_out', onCheckedOut);

    // optionally ask for a fresh snapshot
    socket.emit?.('request_active_students');

    return () => {
      socket.off('active_students', onFullSync);
      socket.off('student_checked_in', onCheckedIn);
      socket.off('student_checked_out', onCheckedOut);
    };
  }, [socket, allStudentsMap, userHasInteracted, currentlyPlaying]);

  // keep input focused
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [barcode]);

  const handlePlayPause = (studentBarcode, list = activeStudents) => {
    if (!userHasInteracted) {
      toast.error('Click anywhere on the page to enable sound.');
      return;
    }
    const student = list.find(s => s.barcode === studentBarcode);
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
           .catch(err => {
             console.error('Audio playback failed:', err);
             toast.error('Could not play audio.');
             setCurrentlyPlaying(null);
           });
        }
      }
    }
  };

  const handleAudioEnded = () => setCurrentlyPlaying(null);

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    setLoading(true);
    try {
      const alreadyActive = activeStudents.find(s => s.barcode === barcode);
      if (alreadyActive) {
        toast.error(`${alreadyActive.name} is already checked in.`);
      } else {
        const localTime = new Date().toLocaleString();
        const resp = await dismissalAPI.checkIn(barcode, { localTime });
        toast.success(`Checked in: ${resp.data.student.name}`);
        // realtime update will arrive via socket
      }
      setBarcode('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error processing barcode');
      setBarcode('');
    } finally {
      setLoading(false);
      barcodeInputRef.current?.focus();
    }
  };

  return (
    <div className="student-dashboard">
      <div className={`socket-status ${isConnected ? 'connected' : 'disconnected'}`} />
      <main className="student-main">
        <div className="scanner-section">
          <h2>Student Check-in ({currentTime})</h2>
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

        <div className="active-students-section">
          <div className="section-header">
            <h2>Active Students ({activeStudents.length})</h2>
          </div>

          {activeStudents.length === 0 ? (
            <div className="empty-state"><p>No active students</p></div>
          ) : (
            <div className="students-grid">
              {activeStudents.map((student) => (
                <div
                  key={student.barcode || student.name}
                  className={`student-card ${currentlyPlaying === student.barcode ? 'playing' : ''}`}
                >
                  {student.photo_url && (
                    <div className="student-photo-container">
                      <img
                        src={student.photo_url}
                        alt={student.name}
                        className="student-photo"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <div className="student-info">
                    <h3>{student.name}</h3>
                    <p className="student-class">{student.class}</p>
                    <p className="student-time">
                      Checked in: {moment.utc(student.checked_in_at).tz('Asia/Makassar').format('hh:mm A')}
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
      </main>

      <footer className="student-footer">
        <p>HBICS Dismissal System v1.0 | &copy; 2025</p>
      </footer>
      <audio ref={audioRef} onEnded={handleAudioEnded} />
    </div>
  );
};

export default StudentDashboard;

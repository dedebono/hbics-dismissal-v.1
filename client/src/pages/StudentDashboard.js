import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { studentsAPI, dismissalAPI } from '../services/api';
import { Toaster, toast } from 'react-hot-toast';
import './StudentDashboard.css';
import moment from 'moment-timezone';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  const [barcode, setBarcode] = useState('');
  const [activeStudents, setActiveStudents] = useState([]);
  const [allStudentsMap, setAllStudentsMap] = useState({}); // barcode -> master student
  const [loading, setLoading] = useState(false);
  const barcodeInputRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(moment().format('HH:mm:ss'));

  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const audioRef = useRef(null);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const lastShownRef = useRef({}); // barcode -> timestamp (ms)

  const truncateName = (name = '', maxWords = 2, ellipsis = '....') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length <= maxWords) return name;
    return `${parts.slice(0, maxWords).join(' ')}${ellipsis}`;
  };

  useEffect(() => {
    const handleInteraction = () => {
      setUserHasInteracted(true);
      window.removeEventListener('click', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    return () => window.removeEventListener('click', handleInteraction);
  }, []);

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
        (studentsResp.data || []).forEach((s) => {
          if (s.barcode) map[s.barcode] = s;
        });
        setAllStudentsMap(map);

        const enriched = (activeResp.data || []).map((as) => {
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
    loadAll();
    const interval = setInterval(loadAll, 5000);

    return () => {
      isMounted = false;
      clearInterval(tick);
      clearInterval(interval);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '👤';
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
  return (first + last).toUpperCase();
};

const colorFromString = (s = '') => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h} 70% 45%)`;
};


const showBigCheckin = useCallback((student) => {
  const now = Date.now();
  const last = lastShownRef.current[student.barcode] || 0;
  if (now - last < 2500) return;
  lastShownRef.current[student.barcode] = now;

  const time = moment
    .utc(student.checked_in_at || new Date().toISOString())
    .tz('Asia/Makassar')
    .format('hh:mm A');

  // (Optional) warm the cache to reduce flicker
  if (student.photo_url) {
    const preload = new Image();
    preload.src = student.photo_url;
  }

  toast.custom(
    (t) => (
      <div className={`checkin-overlay ${t.visible ? 'show' : 'hide'}`}>
        <div className="checkin-card">
          <div
            className="checkin-photo-wrap"
            style={{ background: colorFromString(student.name || student.class || '') }}
          >
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt={student.name}
                onError={(e) => {
                  // Hide broken image and reveal initials fallback
                  e.currentTarget.style.display = 'none';
                  const wrap = e.currentTarget.parentElement;
                  if (wrap) wrap.classList.add('no-photo');
                }}
              />
            ) : (
              <div className="checkin-initials">{getInitials(student.name)}</div>
            )}
            {/* Fallback initials element that becomes visible if .no-photo is applied */}
            <div className="checkin-initials hidden">{getInitials(student.name)}</div>
          </div>

          <div className="checkin-info">
            <div className="checkin-title">Checked in</div>
            <div className="checkin-name" title={student.name}>
              {student.name || '—'}
            </div>
            <div className="checkin-class">{student.class || '—'}</div>
            <div className="checkin-time">{time} WITA</div>
          </div>
        </div>
      </div>
    ),
    {
      duration: 3000,
      position: 'top-center',
      id: `checkin-${student.barcode}-${now}`,
    }
  );

  barcodeInputRef.current?.focus();
}, []);

  useEffect(() => {
    if (!socket) return;

    const onFullSync = (data) => {
      if (data?.type !== 'active_students') return;
      const list = data.payload || [];
      const enriched = list.map((as) => {
        const master = allStudentsMap[as.barcode] || {};
        return {
          ...as,
          photo_url: as.photo_url ?? master.photo_url ?? null,
          sound_url: as.sound_url ?? master.sound_url ?? null,
          name: as.name ?? master.name ?? '',
          class: as.class ?? master.class ?? '',
        };
      });

      setActiveStudents((prev) => {
        const prevSet = new Set(prev.map((p) => p.barcode));
        const newOnes = enriched.filter((s) => !prevSet.has(s.barcode));
        newOnes.forEach((s) => showBigCheckin(s));
        const withSound = newOnes.find((s) => s.sound_url);
        if (withSound) {
          if (userHasInteracted) handlePlayPause(withSound.barcode, enriched);
          else toast('Click anywhere to enable automatic sound.', { duration: 5000, icon: '🔊' });
        }
        const stillExists = enriched.some((s) => s.barcode === currentlyPlaying);
        if (!stillExists && currentlyPlaying && audioRef.current) {
          audioRef.current.pause();
          setCurrentlyPlaying(null);
        }
        return enriched;
      });
    };

    const onCheckedIn = (payload) => {
      setActiveStudents((prev) => {
        const exists = prev.some((s) => s.barcode === payload.barcode);
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

        showBigCheckin(newStudent);
        if (newStudent.sound_url) {
          if (userHasInteracted) handlePlayPause(newStudent.barcode, next);
          else toast('Click anywhere to enable automatic sound.', { duration: 5000, icon: '🔊' });
        }
        return next;
      });
    };

    const onCheckedOut = ({ barcode }) => {
      setActiveStudents((prev) => {
        const next = prev.filter((s) => s.barcode !== barcode);
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
    socket.emit?.('request_active_students');

    return () => {
      socket.off('active_students', onFullSync);
      socket.off('student_checked_in', onCheckedIn);
      socket.off('student_checked_out', onCheckedOut);
    };
  }, [socket, allStudentsMap, userHasInteracted, currentlyPlaying, showBigCheckin]);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [barcode]);

  const handlePlayPause = (studentBarcode, list = activeStudents) => {
    if (!userHasInteracted) {
      toast.error('Click anywhere on the page to enable sound.');
      return;
    }
    const student = list.find((s) => s.barcode === studentBarcode);
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
          p
            .then(() => setCurrentlyPlaying(studentBarcode))
            .catch((err) => {
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
      const alreadyActive = activeStudents.find((s) => s.barcode === barcode);
      if (alreadyActive) {
        toast.error(`${alreadyActive.name} is already checked in.`);
      } else {
        const localTime = new Date().toLocaleString();
        const resp = await dismissalAPI.checkIn(barcode, { localTime });
        const apiStudent = resp.data?.student || {};
        const master = allStudentsMap[barcode] || {};

        const studentForPopup = {
          barcode,
          name: apiStudent.name ?? master.name ?? '',
          class: apiStudent.class ?? master.class ?? '',
          photo_url: master.photo_url ?? null,
          checked_in_at: apiStudent.checked_in_at ?? new Date().toISOString(),
        };
        showBigCheckin(studentForPopup);

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
      <header className="student-header">
        <div className="header-content">
          <div>
            <h2>Student Dismissal ({currentTime} WITA)</h2>
            <h3>Active Students ({activeStudents.length})</h3>
          </div>
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
      </header>
      <div className={`socket-status ${isConnected ? 'connected' : 'disconnected'}`} />

      <main className="student-main">
        <div className="active-students-section">
          {activeStudents.length === 0 ? (
            <div className="empty-state">
              <p>No active students</p>
            </div>
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
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="student-info">
                    <h3 title={student.name}>{truncateName(student.name, 3, '....')}</h3>
                    <div className="info-row">
                      <p className="student-class">{student.class}</p>
                      <p className="student-time">
                        {moment.utc(student.checked_in_at).tz('Asia/Makassar').format('hh:mm A')}
                      </p>
                    </div>
                    {student.sound_url && (
                      <div className="sound-controls">
                        <button
                          onClick={() => handlePlayPause(student.barcode)}
                          className="btn-sound"
                        >
                          {currentlyPlaying === student.barcode ? '⏸️' : '▶️'}
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

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { studentsAPI, dismissalAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';
import './StudentDashboard.css';
import moment from 'moment-timezone';

const ParentDashboard = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { socket, isConnected } = useSocket();

    const [barcode, setBarcode] = useState('');
    const [activeStudents, setActiveStudents] = useState([]); // These are today's arrivals
    const [allStudentsMap, setAllStudentsMap] = useState({}); // barcode -> master student
    const [loading, setLoading] = useState(false);
    const barcodeInputRef = useRef(null);
    const [currentTime, setCurrentTime] = useState(moment().format('HH:mm:ss'));

    const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
    const audioRef = useRef(null);
    const [userHasInteracted, setUserHasInteracted] = useState(false);
    const lastShownRef = useRef({}); // barcode -> timestamp (ms)

    // === NEW: filter state ===
    const [selectedClass, setSelectedClass] = useState('ALL');
    const [isFiltering, setIsFiltering] = useState(false);

    const truncateName = (name = '', maxWords = 2, ellipsis = '') => {
        const parts = String(name).trim().split(/\s+/).filter(Boolean);
        if (parts.length <= maxWords) return name;
        return `${parts.slice(0, maxWords).join(' ')}${ellipsis}`;
    };

    // === helpers for avatar fallback ===
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

    // === sort newest first by checked_in_at/updated_at/created_at ===
    const sortByNewest = (list = []) =>
        [...list].sort((a, b) => {
            const tA = Date.parse(a.checked_in_at || a.updated_at || a.created_at || 0) || 0;
            const tB = Date.parse(b.checked_in_at || b.updated_at || b.created_at || 0) || 0;
            if (tB !== tA) return tB - tA;
            return String(a.barcode).localeCompare(String(b.barcode));
        });

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
                    dismissalAPI.getTodayArrivals(),
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
                        class: (as.class ?? master.class ?? '').trim(),
                    };
                });
                setActiveStudents(sortByNewest(enriched));
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

    const showBigCheckin = useCallback((student) => {
        const now = Date.now();
        const last = lastShownRef.current[student.barcode] || 0;
        if (now - last < 2500) return;
        lastShownRef.current[student.barcode] = now;

        const time = moment
            .utc(student.checked_in_at || new Date().toISOString())
            .tz('Asia/Makassar')
            .format('hh:mm A');

        // warm image cache to reduce flicker
        if (student.photo_url) {
            const preload = new Image();
            preload.src = student.photo_url;
        }

        Swal.fire({
            title: '✅ Arrival Recorded',
            html: `
        <div class="checkin-wrap">
          <div class="checkin-avatar" style="background:${colorFromString(student.name || student.class || '')}">
            ${student.photo_url
                    ? `<img src="${student.photo_url}" alt="${student.name}" />`
                    : `<span class="checkin-initials">${getInitials(student.name)}</span>`
                }
          </div>

          <div class="checkin-info">
            <div class="checkin-name" title="${student.name || '—'}">${student.name || '—'}</div>
            <div class="checkin-class">${student.class || '—'}</div>
            <div class="checkin-time">${time} WITA</div>
          </div>
        </div>
      `,
            position: 'center',
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true,
            backdrop: `
        rgba(0,0,0,0.45)
        left top
        no-repeat
      `,
            customClass: {
                popup: 'swal-checkin-popup',
                title: 'swal-checkin-title',
                htmlContainer: 'swal-checkin-html',
            },
            showClass: {
                popup: 'swal-checkin-animate-in'
            },
            hideClass: {
                popup: 'swal-checkin-animate-out'
            }
        });

        barcodeInputRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!socket) return;

        const onFullSync = (data) => {
            if (data?.type !== 'today_arrivals') return;
            const list = data.payload || [];
            const enriched = list.map((as) => {
                const master = allStudentsMap[as.barcode] || {};
                return {
                    ...as,
                    photo_url: as.photo_url ?? master.photo_url ?? null,
                    sound_url: as.sound_url ?? master.sound_url ?? null,
                    name: as.name ?? master.name ?? '',
                    class: (as.class ?? master.class ?? '').trim(),
                };
            });

            const enrichedSorted = sortByNewest(enriched);

            setActiveStudents((prev) => {
                const prevSet = new Set(prev.map((p) => p.barcode));
                const newOnes = enrichedSorted.filter((s) => !prevSet.has(s.barcode));
                newOnes.forEach((s) => showBigCheckin(s));

                const withSound = newOnes.find((s) => s.sound_url);
                if (withSound) {
                    if (userHasInteracted) handlePlayPause(withSound.barcode, enrichedSorted);
                    else Swal.fire({
                        title: 'Sound Notification',
                        text: 'Click anywhere to enable automatic sound.',
                        icon: 'info',
                        timer: 5000,
                        showConfirmButton: false,
                        position: 'top'
                    });
                }

                const stillExists = enrichedSorted.some((s) => s.barcode === currentlyPlaying);
                if (!stillExists && currentlyPlaying && audioRef.current) {
                    audioRef.current.pause();
                    setCurrentlyPlaying(null);
                }
                return enrichedSorted; // keep newest first
            });
        };

        socket.on('today_arrivals', onFullSync);

        return () => {
            socket.off('today_arrivals', onFullSync);
        };
    }, [socket, allStudentsMap, userHasInteracted, currentlyPlaying, showBigCheckin]);

    useEffect(() => {
        barcodeInputRef.current?.focus();
    }, [barcode]);

    const handlePlayPause = (studentBarcode, list = activeStudents) => {
        if (!userHasInteracted) {
            Swal.fire({
                title: 'Sound Disabled',
                text: 'Click anywhere on the page to enable sound.',
                icon: 'warning',
                timer: 3000,
                showConfirmButton: false
            });
            return;
        }
        const student = list.find((s) => s.barcode === studentBarcode);
        if (!student || !student.sound_url) {
            Swal.fire({
                title: 'No Sound',
                text: 'No sound available for this student.',
                icon: 'info',
                timer: 3000,
                showConfirmButton: false
            });
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
                            Swal.fire({
                                title: 'Audio Error',
                                text: 'Could not play audio.',
                                icon: 'error',
                                timer: 3000,
                                showConfirmButton: false
                            });
                            setCurrentlyPlaying(null);
                        });
                }
            }
        }
    };

    const handleAudioEnded = () => setCurrentlyPlaying(null);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleBarcodeSubmit = async (e) => {
        e.preventDefault();
        if (!barcode.trim()) return;
        setLoading(true);
        try {
            const resp = await dismissalAPI.recordArrival(barcode.trim());
            const master = allStudentsMap[barcode.trim()] || {};

            showBigCheckin({
                barcode: barcode.trim(),
                name: master.name || '',
                class: master.class || '',
                photo_url: master.photo_url || null,
                checked_in_at: resp.data?.timestamp || new Date().toISOString()
            });

            // The list will also be updated via the socket fullSync
            setBarcode('');
        } catch (err) {
            const status = err.response?.status;
            const message = err.response?.data?.message || 'Error processing barcode';

            if (status === 409) {
                Swal.fire({
                    title: '⚠️ Already Recorded',
                    text: "This student's arrival has already been recorded today.",
                    icon: 'warning',
                    timer: 4000,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    customClass: { popup: 'swal-checkin-popup' },
                });
            } else {
                Swal.fire({
                    title: 'Error',
                    text: message,
                    icon: 'error',
                    timer: 3000,
                    showConfirmButton: false,
                });
            }
            setBarcode('');
        } finally {
            setLoading(false);
            barcodeInputRef.current?.focus();
        }
    };

    // === NEW: derive class options from either activeStudents or allStudentsMap
    const classOptions = useMemo(() => {
        const set = new Set();
        // prefer classes in active list for relevance
        activeStudents.forEach(s => s.class && set.add(s.class));
        // fallback add from all students master if needed
        if (set.size === 0) {
            Object.values(allStudentsMap).forEach(s => s.class && set.add(String(s.class).trim()));
        }
        return ['ALL', ...Array.from(set).sort((a, b) => String(a).localeCompare(String(b)))];
    }, [activeStudents, allStudentsMap]);

    // === NEW: memoized filtered list
    const visibleStudents = useMemo(() => {
        if (selectedClass === 'ALL') return activeStudents;
        return activeStudents.filter(s => (s.class || '').trim() === selectedClass);
    }, [activeStudents, selectedClass]);

    // === NEW: small visual smoothing flag when changing filter
    useEffect(() => {
        setIsFiltering(true);
        const t = setTimeout(() => setIsFiltering(false), 150);
        return () => clearTimeout(t);
    }, [selectedClass]);

    return (
        <div className="student-dashboard">
            <header className="student-header">
                <div className="header-content">
                    <div>
                        <h2>Arrival Scanner ({currentTime} WITA)</h2>
                        <h3>Arrived Students ({visibleStudents.length}{selectedClass !== 'ALL' ? ` / ${activeStudents.length}` : ''})</h3>
                    </div>

                    {/* Class filter (seamless) */}
                    <div className="filter-bar">
                        <label htmlFor="classFilter" style={{ color: 'white', padding: '10px', fontSize: '1.2rem' }}>Filter by class: </label>
                        <select
                            id="classFilter"
                            className="filter-select"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                        >
                            {classOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <form onSubmit={handleBarcodeSubmit} className="scanner-form" style={{ gap: '1rem', margin: 0 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <input
                                    ref={barcodeInputRef}
                                    type="text"
                                    value={barcode}
                                    onChange={(e) => setBarcode(e.target.value)}
                                    placeholder="Scan or enter barcode"
                                    disabled={loading}
                                    autoFocus
                                    className="barcode-input"
                                    style={{ margin: 0, height: '3rem', width: '250px', minWidth: 'auto' }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !barcode.trim()}
                                className="btn btn-primary scanner-btn"
                                style={{ height: '3rem', padding: '0 24px', minWidth: 'auto', fontSize: '1.1rem', margin: 0 }}
                            >
                                {loading ? 'Processing...' : 'Submit'}
                            </button>
                        </form>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="btn btn-secondary"
                            style={{ height: '3rem', padding: '0 24px', fontSize: '1.1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', margin: 0 }}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>
            <div className={`socket-status ${isConnected ? 'connected' : 'disconnected'}`} />

            <main className="student-main">
                <div className="active-students-section">
                    {visibleStudents.length === 0 ? (
                        <div className="empty-state">
                            <p style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏫</p>
                            <p>No students arrived today</p>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                Scan a student barcode to record their arrival time.
                            </p>
                        </div>
                    ) : (
                        <div className={`students-grid ${isFiltering ? 'is-filtering' : ''}`}>
                            {visibleStudents.map((student) => (
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
                                        <h3 title={student.name}>{truncateName(student.name, 2, '')}</h3>
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
                <p>HBICS Dismissal System v1.0 | &copy; 2025 </p>
            </footer>

            <audio ref={audioRef} onEnded={handleAudioEnded} />
        </div>
    );
};

export default ParentDashboard;

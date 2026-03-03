import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dismissalAPI, studentsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';
import './StudentDashboard.css';
import moment from 'moment-timezone';

const ParentDashboard = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [barcode, setBarcode] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(moment().format('HH:mm:ss'));
    const [allStudentsMap, setAllStudentsMap] = useState({}); // barcode -> student
    const barcodeInputRef = useRef(null);
    const lastShownRef = useRef({});

    // ── helpers ──────────────────────────────────────────────────────────────
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

    // ── load student master data on mount ────────────────────────────────────
    useEffect(() => {
        let isMounted = true;
        const tick = setInterval(() => setCurrentTime(moment().format('HH:mm:ss')), 1000);

        const loadStudents = async () => {
            try {
                const resp = await studentsAPI.getAll();
                if (!isMounted) return;
                const map = {};
                (resp.data || []).forEach((s) => {
                    if (s.barcode) map[s.barcode] = s;
                });
                setAllStudentsMap(map);
            } catch (e) {
                console.error('Failed to load students:', e);
            }
        };

        loadStudents();
        return () => {
            isMounted = false;
            clearInterval(tick);
        };
    }, []);

    useEffect(() => {
        barcodeInputRef.current?.focus();
    }, [barcode]);

    // ── SweetAlert popup (photo + time, no name) ──────────────────────────
    const showArrivalAlert = useCallback((student, timestamp) => {
        const now = Date.now();
        const last = lastShownRef.current[student.barcode] || 0;
        if (now - last < 2500) return;
        lastShownRef.current[student.barcode] = now;

        const time = moment
            .utc(timestamp || new Date().toISOString())
            .tz('Asia/Makassar')
            .format('hh:mm A');

        // Pre-warm image cache
        if (student.photo_url) {
            const img = new Image();
            img.src = student.photo_url;
        }

        Swal.fire({
            title: '✅ Arrival Recorded',
            html: `
        <div class="checkin-wrap">
          <div class="checkin-avatar" style="background:${colorFromString(student.name || student.class || student.barcode || '')}">
            ${student.photo_url
                    ? `<img src="${student.photo_url}" alt="student" />`
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
            customClass: {
                popup: 'swal-checkin-popup',
                title: 'swal-checkin-title',
                htmlContainer: 'swal-checkin-html',
            },
            showClass: { popup: 'swal-checkin-animate-in' },
            hideClass: { popup: 'swal-checkin-animate-out' },
        });
    }, []);

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
            showArrivalAlert(
                {
                    barcode: barcode.trim(),
                    name: master.name || '',
                    class: master.class || '',
                    photo_url: master.photo_url || null,
                },
                resp.data?.timestamp
            );
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
        } finally {
            setLoading(false);
            setBarcode('');
            barcodeInputRef.current?.focus();
        }
    };

    return (
        <div className="student-dashboard">
            <header className="student-header">
                <div className="header-content">
                    <div>
                        <h2>Parent Arrival Scanner ({currentTime} WITA)</h2>
                        <h3>Scan student barcode to record arrival</h3>
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

                    <button onClick={handleLogout} className="btn btn-secondary" style={{ marginLeft: '1rem' }}>
                        Logout
                    </button>
                </div>
            </header>

            <main className="student-main">
                <div className="active-students-section">
                    <div className="empty-state">
                        <p style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏫</p>
                        <p>Scan a student barcode to record their arrival time.</p>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                            Each student can only be recorded once per day.
                        </p>
                    </div>
                </div>
            </main>

            <footer className="student-footer">
                <p>HBICS Dismissal System v1.0 | &copy; 2025 </p>
            </footer>
        </div>
    );
};

export default ParentDashboard;

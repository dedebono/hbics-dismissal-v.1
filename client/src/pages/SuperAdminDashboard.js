import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { superadminAPI } from '../services/api';
import toast from 'react-hot-toast';
import moment from 'moment';

const SuperAdminDashboard = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('schools');

    // Schools state
    const [schools, setSchools] = useState([]);
    const [loadingSchools, setLoadingSchools] = useState(false);
    const [newSchoolName, setNewSchoolName] = useState('');
    const [addingSchool, setAddingSchool] = useState(false);

    // Admins state
    const [admins, setAdmins] = useState([]);
    const [loadingAdmins, setLoadingAdmins] = useState(false);
    const [showAddAdminModal, setShowAddAdminModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [adminForm, setAdminForm] = useState({ username: '', password: '', school_id: '' });
    const [newPassword, setNewPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (activeTab === 'schools') fetchSchools();
        else if (activeTab === 'admins') { fetchSchools(); fetchAdmins(); }
    }, [activeTab]);

    const fetchSchools = async () => {
        setLoadingSchools(true);
        try {
            const res = await superadminAPI.getSchools();
            setSchools(res.data.schools || []);
        } catch { toast.error('Error fetching schools'); }
        finally { setLoadingSchools(false); }
    };

    const fetchAdmins = async () => {
        setLoadingAdmins(true);
        try {
            const res = await superadminAPI.getAdmins();
            setAdmins(res.data.admins || []);
        } catch { toast.error('Error fetching admins'); }
        finally { setLoadingAdmins(false); }
    };

    const handleAddSchool = async (e) => {
        e.preventDefault();
        if (!newSchoolName.trim()) { toast.error('School name is required'); return; }
        setAddingSchool(true);
        try {
            await superadminAPI.createSchool(newSchoolName.trim());
            toast.success('School created!');
            setNewSchoolName('');
            fetchSchools();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error creating school');
        } finally { setAddingSchool(false); }
    };

    const handleDeleteSchool = async (school) => {
        if (school.id === 1) { toast.error('Cannot delete the Default School'); return; }
        if (!window.confirm(`Delete "${school.name}"? Admins and data in this school will lose their school assignment.`)) return;
        try {
            await superadminAPI.deleteSchool(school.id);
            toast.success('School deleted');
            fetchSchools();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error deleting school');
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        if (!adminForm.username || !adminForm.password || !adminForm.school_id) {
            toast.error('All fields are required'); return;
        }
        setSubmitting(true);
        try {
            await superadminAPI.createAdmin({ ...adminForm, school_id: parseInt(adminForm.school_id) });
            toast.success('Admin created!');
            setShowAddAdminModal(false);
            setAdminForm({ username: '', password: '', school_id: '' });
            fetchAdmins();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error creating admin');
        } finally { setSubmitting(false); }
    };

    const handleDeleteAdmin = async (admin) => {
        if (!window.confirm(`Delete admin "${admin.username}"?`)) return;
        try {
            await superadminAPI.deleteAdmin(admin.id);
            toast.success('Admin deleted');
            fetchAdmins();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error deleting admin');
        }
    };

    const openResetModal = (admin) => {
        setSelectedAdmin(admin);
        setNewPassword('');
        setShowResetModal(true);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        setSubmitting(true);
        try {
            await superadminAPI.resetPassword(selectedAdmin.id, newPassword);
            toast.success(`Password reset for ${selectedAdmin.username}`);
            setShowResetModal(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error resetting password');
        } finally { setSubmitting(false); }
    };

    return (
        <div style={styles.page}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerContent}>
                    <div style={styles.headerLeft}>
                        <div style={styles.superBadge}>SUPERADMIN</div>
                        <h1 style={styles.headerTitle}>System Management</h1>
                    </div>
                    <div style={styles.headerRight}>
                        <span style={styles.welcomeText}>👤 {user?.username}</span>
                        <button onClick={logout} style={styles.logoutBtn}>Logout</button>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <nav style={styles.nav}>
                {['schools', 'admins'].map(tab => (
                    <button
                        key={tab}
                        style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'schools' ? '🏫 Schools' : '👥 Admins'}
                    </button>
                ))}
            </nav>

            <main style={styles.main}>
                {/* ── Schools Tab ─────────────────────────────────────── */}
                {activeTab === 'schools' && (
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h2 style={styles.sectionTitle}>Schools</h2>
                            <form onSubmit={handleAddSchool} style={styles.inlineForm}>
                                <input
                                    type="text"
                                    placeholder="New school name…"
                                    value={newSchoolName}
                                    onChange={e => setNewSchoolName(e.target.value)}
                                    style={styles.input}
                                />
                                <button type="submit" style={styles.primaryBtn} disabled={addingSchool}>
                                    {addingSchool ? 'Adding…' : '+ Add School'}
                                </button>
                            </form>
                        </div>
                        {loadingSchools ? (
                            <p style={styles.loading}>Loading…</p>
                        ) : (
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        {['ID', 'Name', 'Created', 'Actions'].map(h => (
                                            <th key={h} style={styles.th}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {schools.map(school => (
                                        <tr key={school.id} style={styles.tr}>
                                            <td style={styles.td}>{school.id}</td>
                                            <td style={styles.td}>
                                                <strong>{school.name}</strong>
                                                {school.id === 1 && <span style={styles.defaultBadge}> Default</span>}
                                            </td>
                                            <td style={styles.td}>{moment(school.created_at).format('YYYY-MM-DD')}</td>
                                            <td style={styles.td}>
                                                {school.id !== 1 && (
                                                    <button onClick={() => handleDeleteSchool(school)} style={styles.dangerBtn}>Delete</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* ── Admins Tab ──────────────────────────────────────── */}
                {activeTab === 'admins' && (
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h2 style={styles.sectionTitle}>Admin Accounts</h2>
                            <button style={styles.primaryBtn} onClick={() => { setAdminForm({ username: '', password: '', school_id: '' }); setShowAddAdminModal(true); }}>
                                + Add Admin
                            </button>
                        </div>
                        {loadingAdmins ? (
                            <p style={styles.loading}>Loading…</p>
                        ) : (
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        {['Username', 'School', 'Created', 'Actions'].map(h => (
                                            <th key={h} style={styles.th}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {admins.map(admin => (
                                        <tr key={admin.id} style={styles.tr}>
                                            <td style={styles.td}><strong>{admin.username}</strong></td>
                                            <td style={styles.td}>{admin.school_name || '—'}</td>
                                            <td style={styles.td}>{moment(admin.created_at).format('YYYY-MM-DD')}</td>
                                            <td style={styles.td}>
                                                <button onClick={() => openResetModal(admin)} style={styles.secondaryBtn}>Reset PW</button>
                                                <button onClick={() => handleDeleteAdmin(admin)} style={{ ...styles.dangerBtn, marginLeft: 6 }}>Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </main>

            {/* Add Admin Modal */}
            {showAddAdminModal && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Create Admin Account</h3>
                            <button onClick={() => setShowAddAdminModal(false)} style={styles.closeBtn}>✕</button>
                        </div>
                        <form onSubmit={handleCreateAdmin} style={styles.modalForm}>
                            <label style={styles.label}>Username</label>
                            <input style={styles.input} value={adminForm.username} onChange={e => setAdminForm(p => ({ ...p, username: e.target.value }))} required />
                            <label style={styles.label}>Password</label>
                            <input type="password" style={styles.input} value={adminForm.password} onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))} minLength={6} required />
                            <label style={styles.label}>School</label>
                            <select style={styles.input} value={adminForm.school_id} onChange={e => setAdminForm(p => ({ ...p, school_id: e.target.value }))} required>
                                <option value="">— Select school —</option>
                                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <div style={styles.modalFooter}>
                                <button type="button" onClick={() => setShowAddAdminModal(false)} style={styles.secondaryBtn}>Cancel</button>
                                <button type="submit" style={styles.primaryBtn} disabled={submitting}>{submitting ? 'Creating…' : 'Create Admin'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetModal && selectedAdmin && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Reset Password — {selectedAdmin.username}</h3>
                            <button onClick={() => setShowResetModal(false)} style={styles.closeBtn}>✕</button>
                        </div>
                        <form onSubmit={handleResetPassword} style={styles.modalForm}>
                            <label style={styles.label}>New Password</label>
                            <input type="password" style={styles.input} value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} required />
                            <div style={styles.modalFooter}>
                                <button type="button" onClick={() => setShowResetModal(false)} style={styles.secondaryBtn}>Cancel</button>
                                <button type="submit" style={styles.primaryBtn} disabled={submitting}>{submitting ? 'Saving…' : 'Reset Password'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <footer style={styles.footer}>
                <p>HBICS Dismissal System v1.0 | SuperAdmin Panel | © 2025</p>
            </footer>
        </div>
    );
};

// ── Inline styles ──────────────────────────────────────────────────────────────
const styles = {
    page: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', fontFamily: "'Inter', 'Segoe UI', sans-serif", color: '#fff' },
    header: { background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.12)', padding: '0 24px' },
    headerContent: { maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
    superBadge: { background: 'linear-gradient(135deg, #f7971e, #ffd200)', color: '#1a1a2e', fontWeight: 700, fontSize: 11, padding: '4px 10px', borderRadius: 20, letterSpacing: 1 },
    headerTitle: { margin: 0, fontSize: 22, fontWeight: 700 },
    headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
    welcomeText: { fontSize: 14, opacity: 0.8 },
    logoutBtn: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
    nav: { display: 'flex', gap: 4, padding: '16px 24px', maxWidth: 1200, margin: '0 auto' },
    tab: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', padding: '10px 22px', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 500, transition: 'all .2s' },
    tabActive: { background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: '1px solid transparent', boxShadow: '0 4px 14px rgba(102,126,234,.5)' },
    main: { maxWidth: 1200, margin: '0 auto', padding: '0 24px 40px' },
    card: { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, marginTop: 16 },
    cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
    sectionTitle: { margin: 0, fontSize: 20, fontWeight: 700 },
    inlineForm: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
    input: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '9px 14px', color: '#fff', fontSize: 14, outline: 'none', minWidth: 200 },
    primaryBtn: { background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', color: '#fff', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    secondaryBtn: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
    dangerBtn: { background: 'linear-gradient(135deg, #ff416c, #ff4b2b)', border: 'none', color: '#fff', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '10px 14px', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', textTransform: 'uppercase', letterSpacing: .6 },
    tr: { borderBottom: '1px solid rgba(255,255,255,0.06)' },
    td: { padding: '13px 14px', fontSize: 14, verticalAlign: 'middle' },
    defaultBadge: { background: 'rgba(102,126,234,.3)', color: '#a5b4fc', fontSize: 11, padding: '2px 8px', borderRadius: 10, marginLeft: 6 },
    loading: { textAlign: 'center', opacity: .6, padding: 20 },
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: 'linear-gradient(135deg, #1a1a3e, #2d2b55)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440 },
    modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { margin: 0, fontSize: 18, fontWeight: 700 },
    closeBtn: { background: 'transparent', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', opacity: .7 },
    modalForm: { display: 'flex', flexDirection: 'column', gap: 12 },
    label: { fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: -4 },
    modalFooter: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
    footer: { textAlign: 'center', padding: '20px', fontSize: 13, opacity: .4 },
};

export default SuperAdminDashboard;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { studentsAPI, dismissalAPI, usersAPI } from '../services/api';
import toast from 'react-hot-toast';
import DismissalLogs from './DismissalLogs'; // Import DismissalLogs component
import './AdminDashboard.css';
import moment from 'moment-timezone';

// Import the new tab components
import StudentManagementTab from '../components/admin/StudentManagementTab';
import ActiveStudentsTab from '../components/admin/ActiveStudentsTab';
import StatisticsTab from '../components/admin/StatisticsTab';
import UserManagementTab from '../components/admin/UserManagementTab';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [activeStudents, setActiveStudents] = useState([]);
  const [dismissalLogs, setDismissalLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    class: '',
  });

  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [soundFile, setSoundFile] = useState(null);
  const [uploadingSound, setUploadingSound] = useState(false);

  // User management state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userFormData, setUserFormData] = useState({
    username: '',
    password: '',
    role: 'teacher',
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // Track which student is being check-in’d to disable the button
  const [checkingInId, setCheckingInId] = useState(null);

  useEffect(() => {
    if (activeTab === 'students') {
      // Fetch both lists so we can show "Active" status/disable Check-in
      fetchStudents();
      fetchActiveStudents();
    } else if (activeTab === 'active') {
      fetchActiveStudents();
    } else if (activeTab === 'dismissalLogs') {
      fetchDismissalLogs();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchStudents = async () => {
    try {
      const response = await studentsAPI.getAll();
      setStudents(response.data || []);
    } catch (error) {
      toast.error('Error fetching students');
    }
  };

  const fetchActiveStudents = async () => {
    try {
      const [activeResponse, studentsResponse] = await Promise.all([
        dismissalAPI.getActive(),
        studentsAPI.getAll(),
      ]);
      const enrichedActiveStudents = (activeResponse.data || []).map((activeStudent) => {
        const fullStudentData = (studentsResponse.data || []).find(
          (student) =>
            student.barcode === activeStudent.barcode ||
            student.name === activeStudent.name
        );
        return {
          ...activeStudent,
          photo_url: fullStudentData?.photo_url || null,
        };
      });
      setActiveStudents(enrichedActiveStudents);
    } catch (error) {
      toast.error('Error fetching active students');
    }
  };

  const fetchDismissalLogs = async () => {
    try {
      const response = await dismissalAPI.getLogs();
      setDismissalLogs(response.data || []);
    } catch (error) {
      toast.error('Error fetching dismissal logs');
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data.users || []);
    } catch (error) {
      toast.error('Error fetching users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleClearAllActive = async () => {
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

  const handleDeleteActiveStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to remove this student from active list?')) {
      try {
        await dismissalAPI.clearSingleActive(studentId);
        toast.success('Student removed from active list');
        fetchActiveStudents(); // Refresh the list
      } catch (error) {
        toast.error('Error removing student from active list');
      }
    }
  };

  // Student management functions
  const handleAddStudent = () => {
    setFormData({ barcode: '', name: '', class: '' });
    setShowAddModal(true);
  };

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setFormData({
      barcode: student.barcode,
      name: student.name,
      class: student.class,
    });
    setPhotoFile(null);
    setShowEditModal(true);
  };

  const handleDeleteStudent = async (student) => {
    if (window.confirm(`Are you sure you want to delete ${student.name}?`)) {
      try {
        await studentsAPI.delete(student.id);
        toast.success('Student deleted successfully');
        fetchStudents();
        // Optionally refresh active list in case the student was active
        fetchActiveStudents();
      } catch (error) {
        toast.error('Error deleting student');
      }
    }
  };

  const handleDeletePhoto = async (student) => {
    if (window.confirm(`Are you sure you want to delete ${student.name}'s photo?`)) {
      try {
        await studentsAPI.deletePhoto(student.id);
        toast.success('Photo deleted successfully');
        fetchStudents();
      } catch (error) {
        toast.error('Error deleting photo');
      }
    }
  };

  // ✅ NEW: Admin can trigger a check-in for a student
  const handleAdminCheckIn = async (student) => {
    if (!student?.barcode) {
      toast.error('Student barcode not found');
      return;
    }
    setCheckingInId(student.id);
    try {
      const localTime = new Date().toLocaleString();
      // Backend expects { barcode } in body; your API helper can handle this:
      await dismissalAPI.checkIn(student.barcode, { localTime });

      toast.success(`Checked in: ${student.name}`);
      // refresh active students so the button disables / counts update
      await fetchActiveStudents();
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        'Error checking in student';
      toast.error(msg);
    } finally {
      setCheckingInId(null);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.barcode || !formData.name || !formData.class) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      if (showAddModal) {
        await studentsAPI.create(formData);
        toast.success('Student added successfully');
      } else if (showEditModal) {
        await studentsAPI.update(selectedStudent.id, formData);
        toast.success('Student updated successfully');
      }

      setShowAddModal(false);
      setShowEditModal(false);
      fetchStudents();
      // keep active list up to date
      fetchActiveStudents();
    } catch (error) {
      if (error.response?.data?.message === 'Barcode already exists') {
        toast.error('Barcode already exists');
      } else {
        toast.error(showAddModal ? 'Error adding student' : 'Error updating student');
      }
    }
  };

  const handlePhotoUpload = async (e) => {
    e.preventDefault();
    if (!photoFile) {
      toast.error('Please select a photo file');
      return;
    }

    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('photo', photoFile);

      await studentsAPI.uploadPhoto(selectedStudent.id, fd);
      toast.success('Photo uploaded successfully');
      setPhotoFile(null);
      fetchStudents();
    } catch (error) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Error uploading photo');
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setPhotoFile(file);
      } else {
        toast.error('Please select a valid image file (JPEG, PNG, GIF)');
      }
    }
  };

  const handleSoundChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        setSoundFile(file);
      } else {
        toast.error('Please select a valid audio file (MP3, WAV)');
      }
    }
  };

  const handleSoundUpload = async (e) => {
    e.preventDefault();
    if (!soundFile) {
      toast.error('Please select a sound file');
      return;
    }

    setUploadingSound(true);
    try {
      const fd = new FormData();
      fd.append('sound', soundFile);

      await studentsAPI.uploadSound(selectedStudent.id, fd);
      toast.success('Sound uploaded successfully');
      setSoundFile(null);
      fetchStudents(); // update sound_url
    } catch (error) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Error uploading sound');
      }
    } finally {
      setUploadingSound(false);
    }
  };

  const handleDeleteSound = async (student) => {
    if (window.confirm(`Are you sure you want to delete ${student.name}'s sound?`)) {
      try {
        await studentsAPI.deleteSound(student.id);
        toast.success('Sound deleted successfully');
        fetchStudents();
      } catch (error) {
        toast.error('Error deleting sound');
      }
    }
  };

  const handleCSVUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('csvFile', csvFile);

      const response = await studentsAPI.uploadCSV(fd);
      toast.success(
        `CSV uploaded: ${response.data.created} students created, ${response.data.failed} failed`
      );
      setShowCSVModal(false);
      setCsvFile(null);
      fetchStudents();
    } catch (error) {
      toast.error('Error uploading CSV file');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setCsvFile(file);
      } else {
        toast.error('Please select a valid CSV file');
      }
    }
  };

  // User management
  const handleAddUser = () => {
    setUserFormData({
      username: '',
      password: '',
      role: 'teacher',
    });
    setShowAddUserModal(true);
  };

  const handleUserFormChange = (e) => {
    const { name, value } = e.target;
    setUserFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!userFormData.username || !userFormData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setCreatingUser(true);
    try {
      await usersAPI.create(userFormData);
      toast.success('User created successfully');
      setShowAddUserModal(false);
      fetchUsers();
    } catch (error) {
      if (error.response?.data?.message === 'Username already exists') {
        toast.error('Username already exists');
      } else if (error.response?.data?.message === 'Invalid role') {
        toast.error('Invalid role selected');
      } else {
        toast.error('Error creating user');
      }
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (window.confirm(`Are you sure you want to delete user ${user.username}?`)) {
      try {
        await usersAPI.delete(user.id);
        toast.success('User deleted successfully');
        fetchUsers();
      } catch (error) {
        toast.error('Error deleting user');
      }
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="header-content">
          <h1>Admin Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {user?.username}</span>
            <button onClick={logout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="admin-nav">
        <div className="nav-tabs">
          <button
            className={activeTab === 'students' ? 'nav-tab active' : 'nav-tab'}
            onClick={() => setActiveTab('students')}
          >
            Students
          </button>
          <button
            className={activeTab === 'active' ? 'nav-tab active' : 'nav-tab'}
            onClick={() => setActiveTab('active')}
          >
            Active Students
          </button>
          <button
            className={activeTab === 'dismissalLogs' ? 'nav-tab active' : 'nav-tab'}
            onClick={() => setActiveTab('dismissalLogs')}
          >
            Dismissal Logs
          </button>
          <button
            className={activeTab === 'stats' ? 'nav-tab active' : 'nav-tab'}
            onClick={() => setActiveTab('stats')}
          >
            Statistics
          </button>
          <button
            className={activeTab === 'users' ? 'nav-tab active' : 'nav-tab'}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
        </div>
      </nav>

      <main className="admin-main">
        {activeTab === 'students' && (
          <StudentManagementTab
            students={students}
            activeStudents={activeStudents}
            searchTerm={searchTerm}
            handleSearchChange={handleSearchChange}
            handleAddStudent={handleAddStudent}
            setShowCSVModal={setShowCSVModal}
            handleEditStudent={handleEditStudent}
            handleDeleteStudent={handleDeleteStudent}
            handleAdminCheckIn={handleAdminCheckIn}
            checkingInId={checkingInId}
          />
        )}
        {activeTab === 'active' && (
          <ActiveStudentsTab
            activeStudents={activeStudents}
            handleClearAllActive={handleClearAllActive}
            handleDeleteStudent={handleDeleteActiveStudent}
          />
        )}
        {activeTab === 'stats' && (
          <StatisticsTab students={students} activeStudents={activeStudents} />
        )}
        {activeTab === 'users' && (
          <UserManagementTab
            users={users}
            loadingUsers={loadingUsers}
            handleAddUser={handleAddUser}
            handleDeleteUser={handleDeleteUser}
          />
        )}
        {activeTab === 'dismissalLogs' && <DismissalLogs />}
      </main>

      <footer className="admin-footer">
        <p>HBICS Dismissal System v1.0 | &copy; 2025</p>
      </footer>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New Student</h3>
              <button onClick={() => setShowAddModal(false)} className="modal-close">
                &times;
              </button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Barcode:</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Name:</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Class:</label>
                  <input
                    type="text"
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal with Photo & Sound sections */}
      {showEditModal && selectedStudent && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h3>Edit Student - {selectedStudent.name}</h3>
              <button onClick={() => setShowEditModal(false)} className="modal-close">
                &times;
              </button>
            </div>

            <div className="modal-body">
              {/* Student Info Form */}
              <form onSubmit={handleFormSubmit}>
                <div className="form-group">
                  <label>Barcode:</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Name:</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Class:</label>
                  <input
                    type="text"
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    required
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update Student
                  </button>
                </div>
              </form>

              {/* Photo Upload Section */}
              <div className="photo-section">
                <h4>Student Photo</h4>
                {selectedStudent.photo_url ? (
                  <div className="photo-preview">
                    <img
                      src={selectedStudent.photo_url}
                      alt={selectedStudent.name}
                      className="current-photo"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <button
                      onClick={() => handleDeletePhoto(selectedStudent)}
                      className="btn btn-warning btn-sm"
                    >
                      Delete Photo
                    </button>
                  </div>
                ) : (
                  <p className="no-photo-text">No photo uploaded</p>
                )}

                <form onSubmit={handlePhotoUpload} className="photo-upload-form">
                  <div className="form-group">
                    <label>Upload New Photo:</label>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} />
                    <small>Supported formats: JPEG, PNG, GIF (Max 5MB)</small>
                  </div>
                  {photoFile && (
                    <div className="file-info">
                      <p>Selected file: {photoFile.name}</p>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={uploadingPhoto || !photoFile}
                  >
                    {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                  </button>
                </form>
              </div>

              {/* Sound Upload Section */}
              <div className="sound-section">
                <h4>Student Sound</h4>
                {selectedStudent.sound_url ? (
                  <div className="sound-preview">
                    <audio controls src={selectedStudent.sound_url} />
                    <button
                      onClick={() => handleDeleteSound(selectedStudent)}
                      className="btn btn-warning btn-sm"
                    >
                      Delete Sound
                    </button>
                  </div>
                ) : (
                  <p className="no-sound-text">No sound uploaded</p>
                )}

                <form onSubmit={handleSoundUpload} className="sound-upload-form">
                  <div className="form-group">
                    <label>Upload New Sound:</label>
                    <input type="file" accept="audio/*" onChange={handleSoundChange} />
                    <small>Supported formats: MP3, WAV (Max 5MB)</small>
                  </div>
                  {soundFile && (
                    <div className="file-info">
                      <p>Selected file: {soundFile.name}</p>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={uploadingSound || !soundFile}
                  >
                    {uploadingSound ? 'Uploading...' : 'Upload Sound'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCSVModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Upload Students CSV</h3>
              <button onClick={() => setShowCSVModal(false)} className="modal-close">
                &times;
              </button>
            </div>
            <form onSubmit={handleCSVUpload}>
              <div className="modal-body">
                <div className="form-group">
                  <label>CSV File:</label>
                  <input type="file" accept=".csv" onChange={handleFileChange} required />
                  <small>CSV format: barcode,name,class</small>
                </div>
                {csvFile && (
                  <div className="file-info">
                    <p>Selected file: {csvFile.name}</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowCSVModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploading || !csvFile}>
                  {uploading ? 'Uploading...' : 'Upload CSV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New User</h3>
              <button onClick={() => setShowAddUserModal(false)} className="modal-close">
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Username:</label>
                  <input
                    type="text"
                    name="username"
                    value={userFormData.username}
                    onChange={handleUserFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password:</label>
                  <input
                    type="password"
                    name="password"
                    value={userFormData.password}
                    onChange={handleUserFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Role:</label>
                  <select name="role" value={userFormData.role} onChange={handleUserFormChange} required>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddUserModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creatingUser}>
                  {creatingUser ? 'Creating...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

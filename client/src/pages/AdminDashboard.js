import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { studentsAPI, dismissalAPI } from '../services/api';
import toast from 'react-hot-toast';
import DismissalLogs from './DismissalLogs'; // Import DismissalLogs component
import './AdminDashboard.css';

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
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    class: ''
  });
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

 useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents();
    } else if (activeTab === 'active') {
      fetchActiveStudents();
    } else if (activeTab === 'dismissalLogs') {
      fetchDismissalLogs();
    }
  }, [activeTab]);

  const fetchStudents = async () => {
    try {
      const response = await studentsAPI.getAll();
      setStudents(response.data);
    } catch (error) {
      toast.error('Error fetching students');
    }
  };
  
  const fetchActiveStudents = async () => {
    try {
      const [activeResponse, studentsResponse] = await Promise.all([
        dismissalAPI.getActive(),
        studentsAPI.getAll()
      ]);
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
      toast.error('Error fetching active students');
    }
  };

 const fetchDismissalLogs = async () => {
    try {
      const response = await dismissalAPI.getLogs();
      setDismissalLogs(response.data);
    } catch (error) {
      toast.error('Error fetching dismissal logs');
    }
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
      class: student.class
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
      const formData = new FormData();
      formData.append('photo', photoFile);
      
      const response = await studentsAPI.uploadPhoto(selectedStudent.id, formData);
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
      // Check if file is an image
      if (file.type.startsWith('image/')) {
        setPhotoFile(file);
      } else {
        toast.error('Please select a valid image file (JPEG, PNG, GIF)');
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
      const formData = new FormData();
      formData.append('csvFile', csvFile);
      
      const response = await studentsAPI.uploadCSV(formData);
      toast.success(`CSV uploaded: ${response.data.created} students created, ${response.data.failed} failed`);
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

 const renderStudentsTab = () => (
    <div className="tab-content">
      <div className="tab-header">
        <h2>Student Management</h2>
        <div className="action-buttons">
          <button onClick={handleAddStudent} className="btn btn-primary">
            Add Student
          </button>
          <button onClick={() => setShowCSVModal(true)} className="btn btn-secondary">
            Upload CSV
          </button>
        </div>
      </div>
      <div className="students-table">
        <table>
          <thead>
            <tr>
              <th>Photo</th>
              <th>Barcode</th>
              <th>Name</th>
              <th>Class</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>
                  {student.photo_url ? (
                    <img
                      src={student.photo_url}
                      alt={student.name}
                      className="student-photo"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="no-photo">No Photo</div>
                  )}
                </td>
                <td>{student.barcode}</td>
                <td>{student.name}</td>
                <td>{student.class}</td>
                <td>
                  <button onClick={() => handleEditStudent(student)} className="btn btn-secondary btn-sm">
                    Edit
                  </button>
                  {student.photo_url && (
                    <button onClick={() => handleDeletePhoto(student)} className="btn btn-warning btn-sm">
                      Delete Photo
                    </button>
                  )}
                  <button onClick={() => handleDeleteStudent(student)} className="btn btn-danger btn-sm" style={{ marginLeft: '5px' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

 const renderActiveStudentsTab = () => (
    <div className="tab-content">
      <div className="tab-header">
        <h2>Active Students ({activeStudents.length})</h2>
        {activeStudents.length > 0 && (
          <button onClick={handleClearAllActive} className="btn btn-danger">
            Clear All
          </button>
        )}
      </div>
      {activeStudents.length === 0 ? (
        <div className="empty-state">
          <p>No active students</p>
        </div>
      ) : (
        <div className="active-students-grid">
          {activeStudents.map((student, index) => (
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
                <p className="student-time">Checked in: {new Date(student.checked_in_at).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );



  const renderStatsTab = () => (
    <div className="tab-content">
      <h2>System Statistics</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{students.length}</h3>
          <p>Total Students</p>
        </div>
        <div className="stat-card">
          <h3>{activeStudents.length}</h3>
          <p>Active Students</p>
        </div>
        <div className="stat-card">
          <h3>0</h3>
          <p>Today's Check-ins</p>
        </div>
        <div className="stat-card">
          <h3>0</h3>
          <p>Today's Check-outs</p>
        </div>
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div className="tab-content">
      <h2>User Management</h2>
      <p>User management features coming soon...</p>
    </div>
  );

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
        {activeTab === 'students' && renderStudentsTab()}
        {activeTab === 'active' && renderActiveStudentsTab()}
        {activeTab === 'stats' && renderStatsTab()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'dismissalLogs' && <DismissalLogs />} {/* Render DismissalLogs component */}
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

      {/* Edit Student Modal with Photo Upload */}
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
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                    />
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
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    required
                  />
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
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={uploading || !csvFile}
                >
                  {uploading ? 'Uploading...' : 'Upload CSV'}
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

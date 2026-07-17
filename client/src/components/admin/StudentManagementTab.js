import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const StudentManagementTab = ({
  students,
  activeStudents,
  searchTerm,
  handleSearchChange,
  handleAddStudent,
  setShowCSVModal,
  handleDownloadBarcodes,
  handleDownloadSingleBarcode,
  handleEditStudent,
  handleDeleteStudent,
  handleAdminCheckIn,
  checkingInId,
  handleArrive,
  arrivingId,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const filteredStudents = (students || []).filter((student) => {
    const n = (student.name || '').toLowerCase();
    const c = (student.class || '').toLowerCase();
    const q = (searchTerm || '').toLowerCase();
    return n.includes(q) || c.includes(q);
  });

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>Student Management</h2>
        {isAdmin && (
          <div className="action-buttons">
            <button onClick={handleAddStudent} className="btn btn-primary">
              Add Student
            </button>
            <button onClick={() => setShowCSVModal(true)} className="btn btn-secondary">
              Upload CSV
            </button>
            <button onClick={handleDownloadBarcodes} className="btn btn-info">
              Download Barcodes
            </button>
          </div>
        )}
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by name or class..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
        />
      </div>

      <div className="students-table">
        <table>
          <thead>
            <tr>
              <th>Photo</th>
              <th>Barcode 🆔 </th>
              <th>Name</th>
              <th>Class</th>
              <th style={{ minWidth: 280 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => {
              const isActive = activeStudents.some((a) => a.barcode === student.barcode);
              return (
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
                    <div className="row-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleEditStudent(student)}
                            className="btn btn-secondary btn-sm"
                            title="edit student"
                            style={{fontSize:'1.3rem', padding:'2px 8px'}}
                            disabled={checkingInId === student.id}                            
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student)}
                            className="btn btn-danger btn-sm"
                            title="delete student"
                            style={{fontSize:'1.3rem', padding:'2px 8px'}}
                            disabled={checkingInId === student.id}
                          >
                            🗑️
                          </button>
                          <button
                            onClick={() => handleDownloadSingleBarcode(student)}
                            style={{fontSize:'1.3rem', padding:'2px 8px', backgroundColor:'grey', color:'black', border:'none', borderRadius:'4px'}}
                            className="btn btn-info btn-sm"
                            title="Download Barcode"
                          >
                            🆔
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleAdminCheckIn(student)}
                        className="btn btn-success btn-sm"
                        style={{fontSize:'1.2rem', padding:'2px 8px', fontWeight:'bold'}}
                        disabled={checkingInId === student.id || isActive}
                        title={isActive ? 'Already active' : 'Mark as active (check-in)'}
                      >
                        {isActive ? '✔️' : checkingInId === student.id ? 'Checking in...' : 'Check-in'}
                      </button>
                      {handleArrive && (
                        <button
                          onClick={() => handleArrive(student)}
                          className="btn btn-primary btn-sm"
                          style={{fontSize:'1.2rem', padding:'2px 8px', fontWeight:'bold', backgroundColor: '#3b82f6', color: 'white', border: 'none'}}
                          disabled={arrivingId === student.id}
                          title="Record arrival"
                        >
                          {arrivingId === student.id ? 'Arriving...' : 'Arrive'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentManagementTab;

import React from 'react';

const StudentManagementTab = ({
  students,
  activeStudents,
  searchTerm,
  handleSearchChange,
  handleAddStudent,
  setShowCSVModal,
  handleEditStudent,
  handleDeleteStudent,
  handleAdminCheckIn,
  checkingInId,
}) => {
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
        <div className="action-buttons">
          <button onClick={handleAddStudent} className="btn btn-primary">
            Add Student
          </button>
          <button onClick={() => setShowCSVModal(true)} className="btn btn-secondary">
            Upload CSV
          </button>
        </div>
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
              <th>Barcode</th>
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
                      <button
                        onClick={() => handleEditStudent(student)}
                        className="btn btn-secondary btn-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student)}
                        className="btn btn-danger btn-sm"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleAdminCheckIn(student)}
                        className="btn btn-success btn-sm"
                        disabled={checkingInId === student.id || isActive}
                        title={isActive ? 'Already active' : 'Mark as active (check-in)'}
                      >
                        {isActive ? 'Active' : checkingInId === student.id ? 'Checking in...' : 'Check-in'}
                      </button>
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

import React, { useState } from 'react';

const ActiveStudentsTab = ({ activeStudents, handleClearAllActive, handleDeleteStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = activeStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>Active Students ({filteredStudents.length})</h2>
        <input
          type="text"
          placeholder="Search students by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {activeStudents.length > 0 && (
          <button onClick={handleClearAllActive} className="btn btn-danger">
            Clear All
          </button>
        )}
      </div>
      {filteredStudents.length === 0 ? (
        <div className="empty-state">
          <p>{activeStudents.length === 0 ? 'No active students' : 'No students match your search'}</p>
        </div>
      ) : (
        <div className="active-students-grid">
          {filteredStudents.map((student, index) => (
            <div key={index} className="student-card">
              <div className="student-info">
                <h3>{student.name}</h3>
                <p className="student-class">{student.class}</p>
              </div>
              <button
                onClick={() => handleDeleteStudent(student.id)}
                className="delete-student-btn"
                title="Remove student"
              >
                ❌
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveStudentsTab;

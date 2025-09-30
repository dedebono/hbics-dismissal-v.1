import React from 'react';

const ActiveStudentsTab = ({ activeStudents, handleClearAllActive }) => {
  return (
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
              <div className="student-info">
                <h3>{student.name}</h3>
                <p className="student-class">{student.class}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveStudentsTab;

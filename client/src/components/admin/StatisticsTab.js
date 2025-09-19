
import React from 'react';

const StatisticsTab = ({ students, activeStudents }) => {
  return (
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
};

export default StatisticsTab;

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentsAPI, dismissalAPI } from '../services/api';
import toast from 'react-hot-toast';
import './StudentDashboard.css';
import moment from 'moment-timezone';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [barcode, setBarcode] = useState('');
  const [activeStudents, setActiveStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const barcodeInputRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(moment().format('HH:mm:ss')); // Initial time

  useEffect(() => {
    setInterval(() => {
      setCurrentTime(moment().format('HH:mm:ss'));
    }, 1000);
    console.log('StudentDashboard useEffect - setting up active students polling');
    fetchActiveStudents();
    const interval = setInterval(fetchActiveStudents, 5000);
    return () => {
      console.log('StudentDashboard cleanup - clearing interval');
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
  if (barcodeInputRef.current) {
    barcodeInputRef.current.focus();
  }
  }, [barcode]);  // Only trigger on barcode changes

  const fetchActiveStudents = async () => {
    console.log('Fetching active students...');
    try {
      const [activeResponse, studentsResponse] = await Promise.all([
        dismissalAPI.getActive(),
        studentsAPI.getAll()
      ]);
      
      console.log('Active students response:', activeResponse.data);
      
      // Enrich active students data with photo URLs from students data
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
      console.error('Error fetching active students:', error);
    }
  };

const handleBarcodeSubmit = async (e) => {
  e.preventDefault();
  console.log('Barcode submitted:', barcode);

  if (!barcode.trim()) {
    console.log('Empty barcode, returning');
    return;
  }

  setLoading(true);
  try {
    const activeStudent = activeStudents.find(student => student.barcode === barcode);

    if (activeStudent) {
    toast.error(`${activeStudent.name} is already checked in.`);
    } else {

      const localTime = new Date().toLocaleString();
      const response = await dismissalAPI.checkIn(barcode, { localTime });
      toast.success(`Checked in: ${response.data.student.name}`);
      fetchActiveStudents(); // Update the list of active students after check-in
    }

    setBarcode(''); // Reset the barcode input
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error processing barcode');
    setBarcode(''); 
  } finally {
    setLoading(false);
    barcodeInputRef.current?.focus(); // Focus back on the barcode input
  }
};

  return (
    <div className="student-dashboard">
      <main className="student-main">

        {/* Barcode Scanner Section */}
        <div className="scanner-section">
          <h2>Student Check-in ({currentTime})</h2>
          <form onSubmit={handleBarcodeSubmit} className="scanner-form">
            <div className="form-group">
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or enter barcode"
                disabled={loading}
                autoFocus={true}
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
        </div>

        {/* Active Students Section */}
        <div className="active-students-section">
          <div className="section-header">
            <h2>Active Students ({activeStudents.length})</h2>
          </div>

          {activeStudents.length === 0 ? (
            <div className="empty-state">
              <p>No active students</p>
            </div>
          ) : (
            <div className="students-grid">
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
                    <p className="student-time">
                      Checked in: {moment.utc(student.checked_in_at).tz('Asia/Singapore').format('hh:mm A')}
                    </p>                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="student-footer">
        <p>HBICS Dismissal System v1.0 | &copy; 2025</p>
      </footer>
    </div>
  );
};

export default StudentDashboard;

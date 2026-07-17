import React, { useState, useEffect } from 'react';
import { studentsAPI, dismissalAPI } from '../services/api';
import toast from 'react-hot-toast';
import StudentManagementTab from '../components/admin/StudentManagementTab';
import { useAuth } from '../contexts/AuthContext';
import './AdminDashboard.css';

const EducsDashboard = () => {
  const { user, logout } = useAuth();
  const [students, setStudents] = useState([]);
  const [activeStudents, setActiveStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [checkingInId, setCheckingInId] = useState(null);
  const [arrivingId, setArrivingId] = useState(null);

  useEffect(() => {
    fetchStudents();
    fetchActiveStudents();
  }, []);

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

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleAdminCheckIn = async (student) => {
    if (!student?.barcode) {
      toast.error('Student barcode not found');
      return;
    }
    setCheckingInId(student.id);
    try {
      const localTime = new Date().toLocaleString();
      await dismissalAPI.checkIn(student.barcode, { localTime });
      toast.success(`Checked in: ${student.name}`);
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

  const handleArrive = async (student) => {
    if (!student?.barcode) {
      toast.error('Student barcode not found');
      return;
    }
    setArrivingId(student.id);
    try {
      await dismissalAPI.recordArrival(student.barcode);
      toast.success(`Arrival recorded: ${student.name}`);
      await fetchActiveStudents();
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        'Error recording arrival';
      toast.error(msg);
    } finally {
      setArrivingId(null);
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="header-content">
          <h1>Education Consultan Viewer</h1>
          <div className="user-info">
            <span>Welcome, {user?.username}</span>
            <button onClick={logout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="admin-main">
        <StudentManagementTab
          students={students}
          activeStudents={activeStudents}
          searchTerm={searchTerm}
          handleSearchChange={handleSearchChange}
          handleAddStudent={() => {}}
          setShowCSVModal={() => {}}
          handleEditStudent={() => {}}
          handleDeleteStudent={() => {}}
          handleAdminCheckIn={handleAdminCheckIn}
          checkingInId={checkingInId}
          handleArrive={handleArrive}
          arrivingId={arrivingId}
        />
      </main>
    </div>
  );
};

export default EducsDashboard;

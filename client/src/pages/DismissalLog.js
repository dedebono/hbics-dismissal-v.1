import React, { useState, useEffect } from 'react';
import { dismissalAPI } from '../services/api';
import { CSVLink } from 'react-csv';
import toast from 'react-hot-toast';

const DismissalLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await dismissalAPI.getLogs();
        setLogs(response.data);
      } catch (error) {
        toast.error('Error fetching dismissal logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.name.toLowerCase().includes(filter.toLowerCase()) ||
    log.class.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <h2>Dismissal Logs</h2>
      <input 
        type="text" 
        placeholder="Search by name or class" 
        value={filter} 
        onChange={(e) => setFilter(e.target.value)} 
      />
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Class</th>
                <th>Action</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id}>
                  <td>{log.name}</td>
                  <td>{log.class}</td>
                  <td>{log.action}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <CSVLink data={filteredLogs} filename={"dismissal_logs.csv"}>
            <button>Export to CSV</button>
          </CSVLink>
        </div>
      )}
    </div>
  );
};

export default DismissalLog;

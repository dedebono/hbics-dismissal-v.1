
import React from 'react';
import moment from 'moment';

const UserManagementTab = ({ users, loadingUsers, handleAddUser, handleDeleteUser }) => {
  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>User Management</h2>
        <div className="action-buttons">
          <button onClick={handleAddUser} className="btn btn-primary">
            Add User
          </button>
        </div>
      </div>
      {loadingUsers ? (
        <div className="loading">Loading users...</div>
      ) : (
        <div className="logs-table-container">
          <table className="logs-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.role}</td>
                  <td>{moment(user.created_at).format('YYYY-MM-DD')}</td>
                  <td>
                    <button onClick={() => handleDeleteUser(user)} className="btn btn-danger btn-sm">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserManagementTab;

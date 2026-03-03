import React from 'react';
import moment from 'moment';

const UserManagementTab = ({
  users,
  loadingUsers,
  handleAddUser,
  handleDeleteUser,
  handleChangePassword,
  currentUser,      // the logged-in admin
}) => {
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
              {users.map((u) => {
                const isSelf = currentUser && u.id === currentUser.id;
                return (
                  <tr key={u.id}>
                    <td>
                      {u.username}
                      {isSelf && (
                        <span
                          style={{
                            marginLeft: '8px',
                            fontSize: '0.75rem',
                            background: '#3b82f6',
                            color: 'white',
                            borderRadius: '999px',
                            padding: '2px 8px',
                          }}
                        >
                          You
                        </span>
                      )}
                    </td>
                    <td>{u.role}</td>
                    <td>{moment(u.created_at).format('YYYY-MM-DD')}</td>
                    <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {isSelf ? (
                        /* Own row — only allow password change, no delete */
                        <button
                          onClick={() => handleChangePassword(u)}
                          className="btn btn-secondary btn-sm"
                        >
                          Change Password
                        </button>
                      ) : (
                        /* Other users — allow delete */
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="btn btn-danger btn-sm"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserManagementTab;

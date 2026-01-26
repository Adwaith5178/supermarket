import React, { useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import axios from 'axios';
import './Settings.css';

const Settings = ({ user, onBack }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      return toast.error("New passwords do not match!");
    }

    const toastId = toast.loading("Updating security...");

    try {
      // FIX: Ensure we use 'admin' if the role is admin, otherwise use user.username
      // This bypasses any display name issues (like "System Admin")
      const effectiveUsername = user?.role === 'admin' ? 'admin' : user?.username;

      const res = await axios.post('http://localhost:5000/api/auth/update-password', {
        username: effectiveUsername,
        currentPassword,
        newPassword
      });

      if (res.data.success) {
        toast.success("Password updated! Logging out for security...", { id: toastId });
        
        // Wait 2 seconds then trigger onBack or a logout
        setTimeout(() => {
          onBack();
        }, 2000);
      }
    } catch (err) {
      // If the server returns "User not found", it confirms the username mismatch
      const errorMsg = err.response?.data?.message || "Server Error";
      toast.error(errorMsg, { id: toastId });
    }
  };

  return (
    <div className="settings-container">
      <Toaster position="top-center" />
      
      <button onClick={onBack} className="floating-back-btn">
        ← Back to {user?.role === 'admin' ? 'Dashboard' : 'Shop'}
      </button>

      <div className="settings-glass-card">
        <div className="settings-header">
          <div className="icon-badge">🔒</div>
          <h2>Security Settings</h2>
          {/* Display 'admin' if it's the admin to confirm what is being sent to the DB */}
          <p>Update credentials for <strong>{user?.role === 'admin' ? 'admin' : user?.username}</strong></p>
        </div>

        <form onSubmit={handleUpdatePassword} className="settings-form">
          <div className="input-group">
            <label>Current Password</label>
            <input 
              type={showPasswords ? "text" : "password"} 
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="Enter current password"
            />
          </div>

          <div className="input-group">
            <label>New Password</label>
            <input 
              type={showPasswords ? "text" : "password"} 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Minimum 6 characters"
            />
          </div>

          <div className="input-group">
            <label>Confirm New Password</label>
            <input 
              type={showPasswords ? "text" : "password"} 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Repeat new password"
            />
          </div>

          <div className="show-pwd-container">
            <input 
              type="checkbox" 
              id="show-pwd" 
              checked={showPasswords}
              onChange={() => setShowPasswords(!showPasswords)} 
            />
            <label htmlFor="show-pwd">Show Passwords</label>
          </div>

          <button type="submit" className="update-btn">
            Update Secure Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
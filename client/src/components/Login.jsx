import React, { useState } from 'react';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';

const Login = ({ portalMode, onLoginSuccess, onToggleRegister, onBack }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const toastId = toast.loading("Verifying credentials...");
    try {
      // Endpoint should check username, password, and role
      const res = await axios.post('http://localhost:5000/api/login', {
        ...credentials,
        requiredRole: portalMode // 'admin' or 'customer'
      });

      if (res.data.success) {
        toast.success(`Welcome back, ${res.data.user.username}!`, { id: toastId });
        onLoginSuccess(res.data.user);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid Login", { id: toastId });
    }
  };

  return (
    <div style={styles.container}>
      <Toaster position="top-right" />
      <div style={styles.loginCard}>
        <button onClick={onBack} style={styles.backBtn}>← Back</button>
        
        <div style={styles.icon}>{portalMode === 'admin' ? '👨‍💼' : '🛒'}</div>
        <h2 style={styles.title}>{portalMode === 'admin' ? 'Staff Login' : 'Customer Login'}</h2>
        
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <input 
              type="text" 
              name="username" 
              required 
              onChange={handleChange} 
              style={styles.input} 
              placeholder="Enter username"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input 
              type="password" 
              name="password" 
              required 
              onChange={handleChange} 
              style={styles.input} 
              placeholder="••••••••"
            />
          </div>

          <button type="submit" style={styles.loginBtn}>Login to Portal</button>
        </form>

        {/* REGISTRATION ONLY FOR CUSTOMER PORTAL */}
        {portalMode === 'customer' && (
          <p style={styles.footerText}>
            New here? <span onClick={onToggleRegister} style={styles.link}>Create Customer Account</span>
          </p>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' },
  loginCard: { width: '380px', padding: '40px', background: '#242442', borderRadius: '20px', textAlign: 'center', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  backBtn: { position: 'absolute', top: '20px', left: '20px', background: 'none', border: 'none', color: '#a0a0c0', cursor: 'pointer' },
  icon: { fontSize: '3rem', marginBottom: '10px' },
  title: { color: '#fff', marginBottom: '30px' },
  form: { textAlign: 'left' },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', color: '#8888b0', marginBottom: '8px', fontSize: '0.8rem' },
  input: { width: '100%', padding: '12px', background: '#1a1a2e', border: '1px solid #3d3d5c', borderRadius: '10px', color: '#fff' },
  loginBtn: { width: '100%', padding: '14px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  footerText: { color: '#a0a0c0', marginTop: '20px', fontSize: '0.85rem' },
  link: { color: '#2ed573', cursor: 'pointer', fontWeight: 'bold' }
};

export default Login;
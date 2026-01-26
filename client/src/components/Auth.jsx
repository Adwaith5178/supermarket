import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import './Auth.css';

const Auth = ({ setUser }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedRole = searchParams.get('role') || 'customer';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading(isRegistering ? "Creating your account..." : "Authenticating...");

    // --- 1. ADMIN HARD-CODED CHECK ---
    if (!isRegistering && selectedRole === 'admin') {
      // You can change 'admin' and 'admin123' to whatever you like
      if (username === 'admin' && password === 'admin123') {
        const adminData = { 
          username: 'System Admin', 
          role: 'admin', 
          email: 'admin@market.ai' 
        };
        toast.success("Admin access granted!", { id: toastId });
        setUser(adminData);
        navigate('/dashboard');
        return; // Stop execution here
      } else {
        toast.error("Invalid Admin Credentials", { id: toastId });
        return;
      }
    }

    // --- 2. STANDARD DATABASE LOGIC (For Customers) ---
    try {
      const endpoint = isRegistering ? 'register' : 'login';
      const payload = isRegistering 
        ? { username, email, password, role: 'customer' } 
        : { username, password };

      const res = await axios.post(`http://localhost:5000/api/auth/${endpoint}`, payload);

      if (res.data.success) {
        toast.success(isRegistering ? "Registration successful!" : `Welcome back, ${res.data.user.username}!`, { id: toastId });
        
        if (isRegistering) {
          setIsRegistering(false);
        } else {
          setUser(res.data.user);
          navigate('/dashboard');
        }
      }
    } catch (err) {
      const serverErrorMessage = err.response?.data?.message || err.response?.data?.error || "Connection error";
      toast.error(serverErrorMessage, { id: toastId });
    }
  };

  return (
    <div className="auth-page-container">
      <Toaster position="top-center" />
      <div className="auth-glass-card">
        <Link to="/" className="auth-back-nav">← Back to Home</Link>
        
        <div className="auth-header-section">
          <h2 className="auth-main-title">
            {isRegistering ? 'Create Account' : (selectedRole === 'admin' ? 'Admin Portal' : 'Member Login')}
          </h2>
          <p className="auth-subtitle">
            {isRegistering ? 'Join our marketplace today' : 'Enter your credentials to continue'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-main-form">
          <div className="auth-input-wrapper">
            <label>Username</label>
            <input 
              type="text" 
              placeholder="Your username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          </div>

          {isRegistering && (
            <div className="auth-input-wrapper">
              <label>Email Address</label>
              <input 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
          )}

          <div className="auth-input-wrapper">
            <label>Password</label>
            <div className="password-container">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              <button 
                type="button" 
                className="pwd-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          
          <button type="submit" className="auth-primary-btn">
            {isRegistering ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        {selectedRole === 'customer' && (
          <div className="auth-footer-toggle">
            {isRegistering ? 'Already a member?' : 'New to the platform?'} 
            <button className="auth-link-btn" onClick={() => setIsRegistering(!isRegistering)}>
              {isRegistering ? 'Login' : 'Register now'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
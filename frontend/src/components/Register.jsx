import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

function Register({ onLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    phone_number: '',
    status_message: 'Hey there! I am using WhatsApp Clone.'
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('users/register/', formData);
      const res = await api.post('users/login/', { 
        username: formData.username, 
        password: formData.password 
      });
      onLogin(res.data.access);
    } catch (err) {
      if (err.response && err.response.data) {
        // Extract the first error message from the response object
        const firstError = Object.values(err.response.data)[0];
        const errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
        setError(errorMessage || 'Registration failed. Please try again.');
      } else {
        setError('Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Register</h2>
        {error && <p style={{ color: '#ef5350', marginBottom: '10px' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username</label>
            <input 
              type="text" 
              name="username"
              value={formData.username} 
              onChange={handleChange} 
              pattern="^[\w.@+-]+$"
              title="Usernames can only contain letters, numbers, and @/./+/-/_ characters. No spaces allowed."
              required 
            />
            <small style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Only letters, numbers, and @/./+/-/_ are allowed (no spaces).
            </small>
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              name="password"
              value={formData.password} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="input-group">
            <label>Phone Number</label>
            <input 
              type="text" 
              name="phone_number"
              value={formData.phone_number} 
              onChange={handleChange} 
              required
            />
          </div>
          <button type="submit" className="btn-primary">Sign Up</button>
        </form>
        <div className="auth-links">
          Already have an account? <Link to="/login">Log in here</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;

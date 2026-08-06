import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import ChatLayout from './components/ChatLayout';
import LockScreen from './components/LockScreen';
import AppLockSetupModal from './components/AppLockSetupModal';
import { ContactsProvider } from './contexts/ContactsContext';
import { AlertProvider } from './contexts/AlertContext';
import api from './api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('access_token'));
  const [user, setUser] = useState(null);
  const [isAppLocked, setIsAppLocked] = useState(localStorage.getItem('chatbox_app_lock_enabled') === 'true');
  const [showAppLockSetup, setShowAppLockSetup] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    let intervalId;
    if (isAuthenticated) {
      api.get('users/me/')
        .then(res => {
          setUser(res.data);
          api.post('users/heartbeat/').catch(() => {});
          intervalId = setInterval(() => {
            api.post('users/heartbeat/').catch(() => {});
          }, 10000);
        })
        .catch(() => {
          localStorage.removeItem('access_token');
          setIsAuthenticated(false);
        });
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  const handleLogin = (token) => {
    localStorage.setItem('access_token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('chatbox_app_lock_enabled');
    setIsAuthenticated(false);
    setUser(null);
    setIsAppLocked(false);
  };

  const handleRequestAppLock = () => {
    if (localStorage.getItem('chatbox_app_lock_hash')) {
      localStorage.setItem('chatbox_app_lock_enabled', 'true');
      setIsAppLocked(true);
    } else {
      setShowAppLockSetup(true);
    }
  };

  return (
    <AlertProvider>
      <Router>
        <Routes>
          <Route path="/login" element={
            !isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" />
          } />
          <Route path="/register" element={
            !isAuthenticated ? <Register onLogin={handleLogin} /> : <Navigate to="/" />
          } />
          <Route path="/" element={
            isAuthenticated ? (
              isAppLocked ? (
                <LockScreen onUnlock={() => setIsAppLocked(false)} />
              ) : (
                <ContactsProvider user={user}>
                  <ChatLayout user={user} setUser={setUser} onLogout={handleLogout} onRequestAppLock={handleRequestAppLock} />
                </ContactsProvider>
              )
            ) : <Navigate to="/login" />
          } />
        </Routes>
        {showAppLockSetup && (
          <AppLockSetupModal 
            onClose={() => setShowAppLockSetup(false)} 
            onSetupComplete={() => setIsAppLocked(true)} 
          />
        )}
      </Router>
    </AlertProvider>
  );
}

export default App;

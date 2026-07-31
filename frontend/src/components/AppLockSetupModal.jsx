import { useState } from 'react';

const hashPassword = async (password) => {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

function AppLockSetupModal({ onClose, onSetupComplete }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    const hash = await hashPassword(password);
    localStorage.setItem('chatbox_app_lock_hash', hash);
    onSetupComplete();
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(11,20,26,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--bg-secondary)', width: '400px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 17px 50px 0 rgba(11,20,26,.19), 0 12px 15px 0 rgba(11,20,26,.24)'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>App lock</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19.1 17.2l-5.3-5.3 5.3-5.3-1.8-1.8-5.3 5.3-5.3-5.3-1.8 1.8 5.3 5.3-5.3 5.3 1.8 1.8 5.3-5.3 5.3 5.3z"></path></svg>
          </button>
        </div>
        <div style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
          <h3 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '10px' }}>Lock with a password</h3>
          <p style={{ margin: '0 0 10px 0' }}>You can lock WhatsApp Web instead of logging out. This makes it easier to access again later.</p>
          <p style={{ margin: '0 0 10px 0' }}>When app lock is enabled you can lock WhatsApp Web from the Chats menu.</p>
          <p style={{ margin: '0 0 20px 0' }}>You won't get notifications when WhatsApp Web is locked. App lock will reset if you log out.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="password" 
              placeholder="Enter password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="chat-input"
              style={{ width: '100%', padding: '12px', borderRadius: '8px' }}
            />
            <input 
              type="password" 
              placeholder="Confirm password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="chat-input"
              style={{ width: '100%', padding: '12px', borderRadius: '8px' }}
            />
          </div>
          {error && <p style={{ color: '#f15c6d', marginTop: '10px', marginBottom: 0 }}>{error}</p>}
        </div>
        <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-color)' }}>
          <button 
            style={{ padding: '10px 20px', borderRadius: '24px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '500' }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            style={{ padding: '10px 20px', borderRadius: '24px', border: 'none', background: '#00a884', color: '#111b21', cursor: 'pointer', fontWeight: '500' }}
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default AppLockSetupModal;

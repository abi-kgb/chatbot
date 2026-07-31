import { useState } from 'react';

const hashPassword = async (password) => {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

function LockScreen({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleUnlock = async (e) => {
    e.preventDefault();
    const savedHash = localStorage.getItem('chatbox_app_lock_hash');
    const inputHash = await hashPassword(password);
    
    if (savedHash === inputHash) {
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ 
          width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
        }}>
          <svg viewBox="0 0 24 24" width="40" height="40" fill="var(--text-secondary)">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"></path>
          </svg>
        </div>
        <h1 style={{ color: 'var(--text-primary)', fontSize: '24px', margin: '0 0 10px 0', fontWeight: '300' }}>
          WhatsApp Web is locked
        </h1>
      </div>

      <form onSubmit={handleUnlock} style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="chat-input"
          style={{ 
            width: '100%', padding: '15px', borderRadius: '8px', 
            border: error ? '1px solid #f15c6d' : 'none',
            outline: 'none', textAlign: 'center', fontSize: '16px'
          }}
          autoFocus
        />
        {error && <p style={{ color: '#f15c6d', margin: 0, textAlign: 'center', fontSize: '14px' }}>Incorrect password</p>}
        <button 
          type="submit"
          style={{ 
            padding: '12px', borderRadius: '24px', border: 'none', 
            background: password.length > 0 ? '#00a884' : 'var(--bg-secondary)', 
            color: password.length > 0 ? '#111b21' : 'var(--text-secondary)', 
            cursor: password.length > 0 ? 'pointer' : 'default', 
            fontWeight: '500', fontSize: '16px', transition: 'background-color 0.2s'
          }}
          disabled={password.length === 0}
        >
          Unlock
        </button>
      </form>
    </div>
  );
}

export default LockScreen;

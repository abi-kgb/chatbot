import { useState } from 'react';
import api, { getMediaUrl } from '../api';
import AvatarCropperModal from './AvatarCropperModal';

function ProfileSettings({ user, setUser, onClose, onRequestAppLock, onLogout }) {
  const [statusMessage, setStatusMessage] = useState(user?.status_message || '');
  const [username, setUsername] = useState(user?.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [appLockEnabled, setAppLockEnabled] = useState(!!localStorage.getItem('chatbox_app_lock_hash'));

  const [cropImageSrc, setCropImageSrc] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setCropImageSrc(reader.result));
      reader.readAsDataURL(file);
      e.target.value = null;
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData();
      if (statusMessage !== user?.status_message) {
        formData.append('status_message', statusMessage);
      }
      if (username !== user?.username && username.trim() !== '') {
        formData.append('username', username.trim());
      }
      if (newPassword.trim() !== '') {
        formData.append('password', newPassword);
      }
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const res = await api.patch('users/me/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser(res.data);
      onClose();
    } catch (err) {
      console.error('Failed to update profile', err);
      alert('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const fullAvatarUrl = user?.avatar ? (getMediaUrl(user.avatar)) : null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-primary)', padding: '30px', borderRadius: '12px',
        width: '400px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Profile Settings</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--primary-color)',
              display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '40px', color: 'white',
              overflow: 'hidden', marginBottom: '15px', position: 'relative'
            }}>
              {(preview || fullAvatarUrl) ? (
                <img 
                  src={preview || fullAvatarUrl} 
                  alt="avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                  onClick={() => setFullscreenImage(preview || fullAvatarUrl)}
                />
              ) : (
                user?.username?.charAt(0).toUpperCase()
              )}
            </div>
            
            <label style={{
              cursor: 'pointer', color: 'var(--primary-color)', fontWeight: 'bold', fontSize: '14px'
            }}>
              Change Profile Photo
              <input type="file" style={{ display: 'none' }} accept="image/png, image/jpeg, image/jpg, image/webp" onChange={handleFileChange} />
            </label>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'
              }}
              placeholder="Your Name"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>New Password</label>
            <input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'
              }}
              placeholder="Leave blank to keep current password"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>About (Status)</label>
            <input 
              type="text" 
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'
              }}
              placeholder="Hey there! I am using WhatsApp Clone."
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>Theme</label>
            <select
              value={document.documentElement.getAttribute('data-theme') || 'light'}
              onChange={(e) => {
                const newTheme = e.target.value;
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                // Force re-render to update the select value
                setStatusMessage(statusMessage); 
              }}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer'
              }}
            >
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>App Lock</label>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Require password to open</span>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
              <input 
                type="checkbox" 
                checked={appLockEnabled}
                onChange={(e) => {
                  if (e.target.checked) {
                    onRequestAppLock();
                    onClose();
                  } else {
                    localStorage.removeItem('chatbox_app_lock_hash');
                    setAppLockEnabled(false);
                  }
                }}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: appLockEnabled ? '#00a884' : 'var(--text-secondary)', transition: '.4s', borderRadius: '20px'
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: '16px', width: '16px', left: appLockEnabled ? '22px' : '2px', bottom: '2px',
                  backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                }}></span>
              </span>
            </label>
          </div>

          <button type="submit" disabled={isSaving} style={{
            width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--primary-color)',
            color: 'white', border: 'none', fontWeight: 'bold', cursor: isSaving ? 'default' : 'pointer',
            opacity: isSaving ? 0.7 : 1
          }}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <button type="button" onClick={onLogout} style={{
              width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--danger)',
              color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer'
            }}>
              Log out
            </button>
          </div>
        </form>
      </div>
      {fullscreenImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out' }} onClick={() => setFullscreenImage(null)}>
          <img src={fullscreenImage} alt="Preview" style={{ width: '90%', height: 'auto', maxWidth: '400px', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: '20px', right: '30px', color: 'white', fontSize: '30px', cursor: 'pointer' }}>✖</div>
        </div>
      )}
      {cropImageSrc && (
        <AvatarCropperModal
          imageSrc={cropImageSrc}
          onComplete={(croppedFile) => {
            setAvatarFile(croppedFile);
            setPreview(URL.createObjectURL(croppedFile));
            setCropImageSrc(null);
          }}
          onCancel={() => setCropImageSrc(null)}
        />
      )}
    </div>
  );
}

export default ProfileSettings;

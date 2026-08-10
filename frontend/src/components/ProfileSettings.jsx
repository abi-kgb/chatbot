import { useState } from 'react';
import api, { getMediaUrl } from '../api';
import AvatarCropperModal from './AvatarCropperModal';
import { useAlert } from '../contexts/AlertContext';
import { X, Smile, Bell, Volume2, Play } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { playMessageNotificationSound, startCallRingtone, stopCallRingtone } from '../utils/soundEffects';

function ProfileSettings({ user, setUser, onClose, onRequestAppLock, onLogout }) {
  const { showAlert } = useAlert();
  const [statusMessage, setStatusMessage] = useState(user?.status_message || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [appLockEnabled, setAppLockEnabled] = useState(localStorage.getItem('chatbox_app_lock_enabled') === 'true');
  const [chatSoundEnabled, setChatSoundEnabled] = useState(localStorage.getItem('chatbox_sound_chat_enabled') !== 'false');
  const [chatTone, setChatTone] = useState(localStorage.getItem('chatbox_chat_tone') || 'classic');
  const [callSoundEnabled, setCallSoundEnabled] = useState(localStorage.getItem('chatbox_sound_call_enabled') !== 'false');
  const [callTone, setCallTone] = useState(localStorage.getItem('chatbox_call_tone') || 'whatsapp');

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

      const res = await api.patch('users/me/', formData);

      setUser(res.data);
      onClose();
    } catch (err) {
      console.error('Failed to update profile', err);
      showAlert('Error', 'Failed to update profile.');
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
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}><X size={22} /></button>
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

          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>About (Status)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type="text" 
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                style={{
                  width: '100%', padding: '12px', paddingRight: '44px', borderRadius: '8px', border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box'
                }}
                placeholder="Hey there! I am using WhatsApp Clone."
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Insert Emoji"
                style={{
                  position: 'absolute', right: '10px', background: 'none', border: 'none',
                  cursor: 'pointer', color: showEmojiPicker ? '#00a884' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px'
                }}
              >
                <Smile size={20} />
              </button>
            </div>
            {showEmojiPicker && (
              <div style={{ position: 'absolute', zIndex: 100, top: '75px', right: '0px', boxShadow: '0 8px 30px rgba(0,0,0,0.4)', borderRadius: '12px', overflow: 'hidden' }}>
                <EmojiPicker
                  theme={document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'}
                  onEmojiClick={(emojiData) => {
                    setStatusMessage((prev) => prev + emojiData.emoji);
                    setShowEmojiPicker(false);
                  }}
                  width={300}
                  height={360}
                />
              </div>
            )}
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

          {/* Notifications & Sound Settings Section */}
          <div style={{ marginBottom: '25px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: 'var(--primary-color)', fontWeight: 'bold', fontSize: '15px' }}>
              <Bell size={18} />
              <span>Notifications & Sounds</span>
            </div>

            {/* Chat Notification Sound Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500' }}>Message Sound</label>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Play sound for new messages</span>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '20px' }}>
                <input 
                  type="checkbox" 
                  checked={chatSoundEnabled}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setChatSoundEnabled(val);
                    localStorage.setItem('chatbox_sound_chat_enabled', String(val));
                    if (val) playMessageNotificationSound(chatTone);
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: chatSoundEnabled ? '#00a884' : 'var(--text-secondary)', transition: '.3s', borderRadius: '20px'
                }}>
                  <span style={{
                    position: 'absolute', content: '""', height: '14px', width: '14px', left: chatSoundEnabled ? '20px' : '3px', bottom: '3px',
                    backgroundColor: 'white', transition: '.3s', borderRadius: '50%'
                  }}></span>
                </span>
              </label>
            </div>

            {/* Chat Tone Selector */}
            {chatSoundEnabled && (
              <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={chatTone}
                  onChange={(e) => {
                    const tone = e.target.value;
                    setChatTone(tone);
                    localStorage.setItem('chatbox_chat_tone', tone);
                    playMessageNotificationSound(tone);
                  }}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer'
                  }}
                >
                  <option value="classic">🔔 Classic WhatsApp Chime</option>
                  <option value="marimba">🎵 Soft Marimba</option>
                  <option value="pop">🍿 Crisp Pop</option>
                  <option value="pulse">⚡ Double Pulse</option>
                </select>
                <button
                  type="button"
                  onClick={() => playMessageNotificationSound(chatTone)}
                  title="Test Message Tone"
                  style={{ background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <Play size={16} />
                </button>
              </div>
            )}

            {/* Call Ringtone Sound Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500' }}>Incoming Call Ringtone</label>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Ringtone for audio & video calls</span>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '20px' }}>
                <input 
                  type="checkbox" 
                  checked={callSoundEnabled}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setCallSoundEnabled(val);
                    localStorage.setItem('chatbox_sound_call_enabled', String(val));
                    if (val) {
                      startCallRingtone(callTone);
                      setTimeout(stopCallRingtone, 2000);
                    }
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: callSoundEnabled ? '#00a884' : 'var(--text-secondary)', transition: '.3s', borderRadius: '20px'
                }}>
                  <span style={{
                    position: 'absolute', content: '""', height: '14px', width: '14px', left: callSoundEnabled ? '20px' : '3px', bottom: '3px',
                    backgroundColor: 'white', transition: '.3s', borderRadius: '50%'
                  }}></span>
                </span>
              </label>
            </div>

            {/* Call Ringtone Selector */}
            {callSoundEnabled && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={callTone}
                  onChange={(e) => {
                    const tone = e.target.value;
                    setCallTone(tone);
                    localStorage.setItem('chatbox_call_tone', tone);
                    startCallRingtone(tone);
                    setTimeout(stopCallRingtone, 2000);
                  }}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer'
                  }}
                >
                  <option value="whatsapp">📞 WhatsApp Ringtone</option>
                  <option value="digital">☎️ Classic Digital Ring</option>
                  <option value="gentle">🎼 Gentle Melody Ring</option>
                  <option value="beat">🥁 Marimba Beat Ring</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    startCallRingtone(callTone);
                    setTimeout(stopCallRingtone, 2000);
                  }}
                  title="Test Call Ringtone"
                  style={{ background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <Play size={16} />
                </button>
              </div>
            )}
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
                    localStorage.removeItem('chatbox_app_lock_enabled');
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
          <div style={{ position: 'absolute', top: '20px', right: '30px', color: 'white', cursor: 'pointer' }}><X size={32} /></div>
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

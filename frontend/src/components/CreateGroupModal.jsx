import { useState, useRef } from 'react';
import api from '../api';
import AvatarCropperModal from './AvatarCropperModal';
import { useAlert } from '../contexts/AlertContext';
import { X, Camera } from 'lucide-react';

function CreateGroupModal({ onClose, onSuccess }) {
  const { showAlert } = useAlert();
  const [groupName, setGroupName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setCropImageSrc(reader.result));
      reader.readAsDataURL(file);
      e.target.value = null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', groupName);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const res = await api.post('chat/groups/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSuccess(res.data);
    } catch (err) {
      console.error('Failed to create group', err);
      showAlert('Error', 'Failed to create group. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-primary)', padding: '30px', borderRadius: '12px',
        width: '400px', maxWidth: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>New Group</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}><X size={22} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div 
              style={{
                width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)',
                display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', overflow: 'hidden',
                border: '2px dashed var(--border-color)', position: 'relative'
              }}
              onClick={() => fileInputRef.current.click()}
            >
              {preview ? (
                <img src={preview} alt="Group preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ marginBottom: '5px' }}><Camera size={30} strokeWidth={1.8} /></div>
                  <div style={{ fontSize: '12px' }}>Add Photo</div>
                </div>
              )}
            </div>
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/jpg, image/webp" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>Group Name</label>
            <input 
              type="text" 
              value={groupName} 
              onChange={(e) => setGroupName(e.target.value)} 
              placeholder="Enter group name"
              required
              autoFocus
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button 
              type="button" 
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent',
                color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={!groupName.trim() || isSubmitting}
              style={{
                padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#00a884',
                color: 'white', cursor: !groupName.trim() || isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 'bold',
                opacity: !groupName.trim() || isSubmitting ? 0.5 : 1
              }}
            >
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
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

export default CreateGroupModal;

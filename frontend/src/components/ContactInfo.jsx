import { useState, useRef } from 'react';
import api, { getMediaUrl } from '../api';
import AvatarCropperModal from './AvatarCropperModal';
import { useContacts } from '../contexts/ContactsContext';

function ContactInfo({ participant, group, onClose, onUpdateGroup }) {
  const [previewImage, setPreviewImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const fileInputRef = useRef(null);
  const { contactsMap, addContact, updateContact, getDisplayName } = useContacts();
  const isGroup = !!group;
  const name = isGroup ? group.name : getDisplayName(participant);
  const isContact = !isGroup && participant && contactsMap[participant.id];
  const avatar = isGroup ? group.avatar : participant?.avatar;
  const status = isGroup ? `${group.members?.length} participants` : participant?.status_message || 'Hey there! I am using WhatsApp Clone.';
  const fullAvatarUrl = avatar ? (getMediaUrl(avatar)) : null;

  const handleUpdateName = async () => {
    if (!editName.trim() || (isGroup && editName.trim() === name)) {
      setIsEditingName(false);
      return;
    }
    try {
      if (isGroup) {
        const res = await api.patch(`chat/groups/${group.id}/`, { name: editName.trim() });
        if (onUpdateGroup) {
           onUpdateGroup({ ...group, name: res.data.name });
        }
      } else {
        if (isContact) {
          await updateContact(isContact.id, participant.id, editName.trim());
        } else {
          await addContact(participant.id, editName.trim());
        }
      }
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to update name', err);
      alert('Failed to update name.');
    }
  };

  const handleAvatarChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setCropImageSrc(reader.result));
      reader.readAsDataURL(file);
      e.target.value = null;
    }
  };

  const uploadCroppedAvatar = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    setIsUploading(true);
    setCropImageSrc(null);
    try {
      const res = await api.patch(`chat/groups/${group.id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (onUpdateGroup) {
         onUpdateGroup({ ...group, avatar: res.data.avatar });
      }
    } catch (err) {
      console.error('Failed to update group avatar', err);
      alert('Failed to update group photo.');
    } finally {
      setIsUploading(false);
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
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>{isGroup ? 'Group Info' : 'Contact Info'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '150px', height: '150px', borderRadius: isGroup ? '16px' : '50%', backgroundColor: isGroup ? '#f59e0b' : 'var(--primary-color)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '60px', color: 'white',
            overflow: 'hidden', marginBottom: '15px', position: 'relative', cursor: isGroup ? 'pointer' : 'default'
          }} onClick={() => {
            if (isGroup) {
              fileInputRef.current.click();
            }
          }}>
            {fullAvatarUrl ? (
              <img 
                src={fullAvatarUrl} 
                alt="avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer', opacity: isUploading ? 0.5 : 1 }} 
                onClick={(e) => {
                  if (!isGroup) {
                    e.stopPropagation();
                    setPreviewImage(fullAvatarUrl);
                  }
                }}
              />
            ) : (
              name?.charAt(0).toUpperCase()
            )}
            {isGroup && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)',
                padding: '5px', fontSize: '14px', textAlign: 'center', color: 'white'
              }}>
                {isUploading ? 'Uploading...' : '📷 Change'}
              </div>
            )}
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/jpg, image/webp" 
              ref={fileInputRef} 
              onChange={handleAvatarChange} 
              style={{ display: 'none' }} 
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
            {isEditingName ? (
              <>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '18px', fontWeight: 'bold'
                  }}
                  autoFocus
                />
                <button onClick={handleUpdateName} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)' }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"></path></svg>
                </button>
              </>
            ) : (
              <>
                <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>{name}</h2>
                <button onClick={() => { setEditName(isContact ? isContact.saved_name : ''); setIsEditingName(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} title={isGroup ? "Edit Group Name" : (isContact ? "Edit Contact" : "Add to Contacts")}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    {isGroup || isContact ? (
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path>
                    ) : (
                      <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
                    )}
                  </svg>
                </button>
              </>
            )}
          </div>
          {!isGroup && <div style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '15px' }}>{participant?.phone_number}</div>}
        </div>

        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '15px', borderRadius: '8px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 'bold' }}>
            {isGroup ? `${group.members?.length} Participants` : 'About'}
          </label>
          <div style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
            {isGroup ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                {group.members?.map(member => (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '16px' }}>
                      {member.user.avatar ? (
                        <img src={getMediaUrl(member.user.avatar)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        getDisplayName(member.user, true).charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: '500' }}>{getDisplayName(member.user, true)}</div>
                      {member.role === 'admin' && <div style={{ fontSize: '12px', color: 'var(--primary-color)' }}>Group Admin</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              status
            )}
          </div>
        </div>
      </div>
      {previewImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out' }} onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Preview" style={{ width: '90%', height: 'auto', maxWidth: '400px', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: '20px', right: '30px', color: 'white', fontSize: '30px', cursor: 'pointer' }}>✖</div>
        </div>
      )}
      {cropImageSrc && (
        <AvatarCropperModal
          imageSrc={cropImageSrc}
          onComplete={uploadCroppedAvatar}
          onCancel={() => setCropImageSrc(null)}
        />
      )}
    </div>
  );
}

export default ContactInfo;

import { useState, useRef } from 'react';
import api, { getMediaUrl } from '../api';
import AvatarCropperModal from './AvatarCropperModal';
import { useContacts } from '../contexts/ContactsContext';
import { useAlert } from '../contexts/AlertContext';
import { X, Camera, Check, Pencil, UserPlus, Plus } from 'lucide-react';

function ContactInfo({ participant, group, currentUser, onClose, onUpdateGroup }) {
  const { showAlert, showConfirm } = useAlert();
  const [previewImage, setPreviewImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  
  // State for Add Member feature
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [addingUserId, setAddingUserId] = useState(null);

  const fileInputRef = useRef(null);
  const { contactsMap, addContact, updateContact, getDisplayName } = useContacts();
  const isGroup = !!group;
  const currentMember = isGroup && group.members?.find(m => m.user?.id === currentUser?.id || m.user?.username === currentUser?.username);
  const isCurrentUserAdmin = currentMember?.role === 'admin' || currentUser?.is_superuser;
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
      showAlert('Error', 'Failed to update name.');
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
      showAlert('Error', 'Failed to update group photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('users/search/?q=');
      const currentMemberIds = (group?.members || []).map(m => m.user.id);
      const filtered = (res.data || []).filter(u => !currentMemberIds.includes(u.id));
      setAvailableUsers(filtered);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddMember = async (targetUser) => {
    setAddingUserId(targetUser.id);
    try {
      const res = await api.post(`chat/groups/${group.id}/add_member/`, { user_id: targetUser.id });
      if (res.data && res.data.added === false) {
        showAlert('👥 Approval Request Sent!', `You are not an admin of this group. A formal request to add ${targetUser.username} has been posted into the group chat for admins to approve or reject!`);
        setShowAddMember(false);
      } else {
        showAlert('Success!', `✅ ${targetUser.username} added to the group successfully!`);
        setShowAddMember(false);
        // Refresh group members list if added directly
        const groupRes = await api.get(`chat/groups/${group.id}/`);
        if (onUpdateGroup && groupRes.data) {
          onUpdateGroup(groupRes.data);
        }
      }
    } catch (err) {
      console.error('Failed to add member', err);
      showAlert('Error', err.response?.data?.error || 'Failed to add member');
    } finally {
      setAddingUserId(null);
    }
  };

  const handleToggleRole = async (targetMember) => {
    const newRole = targetMember.role === 'admin' ? 'member' : 'admin';
    const actionText = newRole === 'admin' ? `promote ${targetMember.user.username} to Group Admin?` : `demote ${targetMember.user.username} to regular participant?`;
    const confirmed = await showConfirm('Change Role', `Are you sure you want to ${actionText}`, 'Yes, Confirm');
    if (!confirmed) return;

    try {
      const res = await api.post(`chat/groups/${group.id}/set_role/`, {
        user_id: targetMember.user.id,
        role: newRole
      });
      if (res.data?.group && onUpdateGroup) {
        onUpdateGroup(res.data.group);
      }
    } catch (err) {
      console.error('Failed to change member role:', err);
      showAlert('Error', err.response?.data?.error || 'Failed to update member role.');
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
        width: '420px', maxWidth: '95%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>{isGroup ? 'Group Info' : 'Contact Info'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}><X size={22} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '140px', height: '140px', borderRadius: isGroup ? '16px' : '50%', backgroundColor: isGroup ? '#f59e0b' : 'var(--primary-color)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '55px', color: 'white',
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
                padding: '5px', fontSize: '13px', textAlign: 'center', color: 'white'
              }}>
                {isUploading ? 'Uploading...' : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><Camera size={15} /> Change</span>}
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
                <button onClick={handleUpdateName} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', display: 'flex', alignItems: 'center' }}>
                  <Check size={20} strokeWidth={2.5} />
                </button>
              </>
            ) : (
              <>
                <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>{name}</h2>
                <button onClick={() => { setEditName(isContact ? isContact.saved_name : ''); setIsEditingName(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }} title={isGroup ? "Edit Group Name" : (isContact ? "Edit Contact" : "Add to Contacts")}>
                  {isGroup || isContact ? <Pencil size={18} strokeWidth={2.2} /> : <UserPlus size={18} strokeWidth={2.2} />}
                </button>
              </>
            )}
          </div>
          {!isGroup && <div style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '15px' }}>{participant?.phone_number}</div>}
        </div>

        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isGroup ? `👥 Participants (${group.members?.length})` : 'About'}
            </label>
            {isGroup && (
              <button
                type="button"
                onClick={() => {
                  const toShow = !showAddMember;
                  setShowAddMember(toShow);
                  if (toShow) fetchAvailableUsers();
                }}
                style={{
                  background: showAddMember ? '#ef4444' : '#00a884',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
                }}
              >
                {showAddMember ? <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><X size={15} /> Cancel</span> : <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><UserPlus size={15} /> Add Member</span>}
              </button>
            )}
          </div>

          {/* Add Member Selection Area */}
          {isGroup && showAddMember && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', fontWeight: '600' }}>
                Select a user to add (Admins add directly, others send an approval request):
              </div>
              {loadingUsers ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '10px' }}>
                  Loading contacts...
                </div>
              ) : availableUsers.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '10px', fontStyle: 'italic' }}>
                  No more contacts available to add.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {availableUsers.map(u => (
                    <div key={u.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255,255,255,0.04)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#00a884',
                          display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px'
                        }}>
                          {u.avatar ? (
                            <img src={getMediaUrl(u.avatar)} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            u.username?.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{u.username}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{u.phone_number || 'No phone'}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={addingUserId === u.id}
                        onClick={() => handleAddMember(u)}
                        style={{
                          backgroundColor: '#00a884',
                          color: 'white',
                          border: 'none',
                          borderRadius: '14px',
                          padding: '5px 12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: addingUserId === u.id ? 'wait' : 'pointer',
                          opacity: addingUserId === u.id ? 0.6 : 1
                        }}
                      >
                        {addingUserId === u.id ? 'Sending...' : <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>Add <Plus size={14} strokeWidth={2.5} /></span>}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
            {isGroup ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                {group.members?.map(member => {
                  const isSelf = member.user.id === currentUser?.id || member.user.username === currentUser?.username;
                  return (
                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '17px', fontWeight: 'bold', flexShrink: 0 }}>
                        {member.user.avatar ? (
                          <img src={getMediaUrl(member.user.avatar)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          getDisplayName(member.user, true).charAt(0).toUpperCase()
                        )}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {getDisplayName(member.user, true)}
                          {isSelf && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>(You)</span>}
                        </div>
                        {member.role === 'admin' ? (
                          <div style={{ fontSize: '12px', color: '#00a884', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            🛡️ Group Admin
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Participant</div>
                        )}
                      </div>
                      {isCurrentUserAdmin && !isSelf && (
                        <button
                          type="button"
                          onClick={() => handleToggleRole(member)}
                          title={member.role === 'admin' ? 'Demote to regular participant' : 'Promote to Group Admin'}
                          style={{
                            background: member.role === 'admin' ? 'transparent' : 'rgba(0, 168, 132, 0.15)',
                            color: member.role === 'admin' ? '#ef4444' : '#00a884',
                            border: member.role === 'admin' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(0, 168, 132, 0.4)',
                            borderRadius: '16px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                          }}
                        >
                          {member.role === 'admin' ? '⬇️ Dismiss Admin' : '⬆️ Make Admin'}
                        </button>
                      )}
                    </div>
                  );
                })}
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

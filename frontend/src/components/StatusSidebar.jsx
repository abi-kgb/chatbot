import { useState, useEffect, useRef } from 'react';
import api, { getMediaUrl } from '../api';
import { useContacts } from '../contexts/ContactsContext';
import { useAlert } from '../contexts/AlertContext';
import { CircleDot, FileText, Camera, Trash2, X, Eye, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import StatusMediaEditorModal from './StatusMediaEditorModal';
import MediaPicker from './MediaPicker';

function StatusSidebar({ user, onSelectChat, onLogout, onRequestAppLock, onUnviewedCountChange, className = '' }) {
  const [statuses, setStatuses] = useState([]);
  const [myStatuses, setMyStatuses] = useState([]);
  const [contactGroups, setContactGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMediaFile, setEditingMediaFile] = useState(null);
  
  // Create Status Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState('text'); // 'text' or 'media'
  const [textContent, setTextContent] = useState('');
  const [bgColor, setBgColor] = useState('#0b141a');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStatusEmoji, setShowStatusEmoji] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [showReplyMediaPicker, setShowReplyMediaPicker] = useState(false);

  // Status Viewer state
  const [viewingUserGroup, setViewingUserGroup] = useState(null); // { user: {}, stories: [] }
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showViewersDrawer, setShowViewersDrawer] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [storyProgress, setStoryProgress] = useState(0);
  const videoRef = useRef(null);

  const fileInputRef = useRef(null);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const { getDisplayName } = useContacts();
  const { showAlert, showConfirm } = useAlert();

  const bgColors = [
    '#0b141a', '#1e40af', '#b91c1c', '#15803d',
    '#6b21a8', '#c2410c', '#0f766e', '#374151'
  ];

  const emojis = ['😍', '😂', '😮', '😢', '🙏', '👏', '🔥', '❤️'];

  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchStatuses = async () => {
    try {
      const res = await api.get('chat/statuses/');
      const rawData = res.data || [];
      // Client-side safety: discard any status older than exactly 24 hours
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const data = rawData.filter(s => new Date(s.created_at).getTime() >= cutoff);
      setStatuses(data);

      // Separate into mine and contacts
      const currentUser = userRef.current || user;
      const isMe = (stUser) => (
        (stUser?.id != null && currentUser?.id != null && String(stUser.id) === String(currentUser.id)) ||
        (stUser?.username && currentUser?.username && String(stUser.username).trim().toLowerCase() === String(currentUser.username).trim().toLowerCase())
      );
      const mine = data.filter(s => isMe(s.user)).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const others = data.filter(s => !isMe(s.user));

      setMyStatuses(mine);

      // Group others by user
      const groupsMap = {};
      others.forEach(st => {
        const uid = st.user.id;
        if (!groupsMap[uid]) {
          groupsMap[uid] = { user: st.user, stories: [], unviewedCount: 0 };
        }
        groupsMap[uid].stories.push(st);
        if (!st.is_viewed) {
          groupsMap[uid].unviewedCount += 1;
        }
      });

      // Ensure each contact's stories play from oldest to newest
      Object.values(groupsMap).forEach(g => {
        g.stories.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      });

      // Convert to array and sort: users with unviewed stories first, then by latest story time
      const groupsArray = Object.values(groupsMap).sort((a, b) => {
        if (a.unviewedCount > 0 && b.unviewedCount === 0) return -1;
        if (a.unviewedCount === 0 && b.unviewedCount > 0) return 1;
        const lastA = a.stories[a.stories.length - 1]?.created_at || 0;
        const lastB = b.stories[b.stories.length - 1]?.created_at || 0;
        return new Date(lastB) - new Date(lastA);
      });

      setContactGroups(groupsArray);
      const totalUnviewed = groupsArray.reduce((acc, g) => acc + g.unviewedCount, 0);
      if (onUnviewedCountChange) {
        onUnviewedCountChange(totalUnviewed);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to load statuses:', err);
      setLoading(false);
    }
  };

  const handleCreateStatus = async (e) => {
    e.preventDefault();
    if (createType === 'text' && !textContent.trim()) return;
    if (createType === 'media' && !selectedFile) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (createType === 'text') {
        formData.append('content', textContent);
        formData.append('bg_color', bgColor);
      } else {
        formData.append('file', selectedFile);
        if (textContent.trim()) {
          formData.append('content', textContent);
        }
      }

      await api.post('chat/statuses/', formData);


      setShowCreateModal(false);
      setTextContent('');
      setSelectedFile(null);
      fetchStatuses();
    } catch (err) {
      console.error('Failed to create status:', err);
      showAlert('Error', 'Failed to post status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostEditedStatus = async ({ file, caption, metadata }) => {
    setEditingMediaFile(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (caption) formData.append('content', caption);
      if (metadata) formData.append('metadata', JSON.stringify(metadata));

      await api.post('chat/statuses/', formData);

      fetchStatuses();
      showAlert('✨ Status Posted!', 'Your status update has been published.');
    } catch (err) {
      console.error('Failed to create status:', err);
      showAlert('Error', 'Failed to post status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openStoryViewer = async (groupObj, startIdx = 0) => {
    setViewingUserGroup(groupObj);
    setCurrentIndex(startIdx);
    setShowViewersDrawer(false);
    
    // If not my status, record view
    const currentStory = groupObj.stories[startIdx];
    if (currentStory && groupObj.user.id !== user.id && !currentStory.is_viewed) {
      try {
        await api.post(`chat/statuses/${currentStory.id}/view/`);
        currentStory.is_viewed = true;
        fetchStatuses();
      } catch (err) {
        console.error('Failed to record status view', err);
      }
    }
  };

  const handleNextStory = async () => {
    if (!viewingUserGroup) return;
    if (currentIndex < viewingUserGroup.stories.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      const nextStory = viewingUserGroup.stories[nextIdx];
      if (nextStory && viewingUserGroup.user.id !== user.id && !nextStory.is_viewed) {
        try {
          await api.post(`chat/statuses/${nextStory.id}/view/`);
          nextStory.is_viewed = true;
          fetchStatuses();
        } catch (err) {
          console.error('Failed to record view', err);
        }
      }
    } else {
      setViewingUserGroup(null);
    }
  };

  const handlePrevStory = () => {
    if (!viewingUserGroup) return;
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setViewingUserGroup(null);
    }
  };

  const handleSendReactionOrReply = async (content, isEmoji = false, mediaObj = null) => {
    if (isSendingReply) return; // prevent double-send
    if (!viewingUserGroup || (!content.trim() && !isEmoji && !mediaObj)) return;
    const currentStory = viewingUserGroup.stories[currentIndex];
    if (!currentStory) return;
    setIsSendingReply(true);
    try {
      const res = await api.post('chat/conversations/', { participants: [user.id, viewingUserGroup.user.id] });
      const convId = res.data.id;

      const messageType = mediaObj ? (mediaObj.type === 'gif' || mediaObj.type === 'sticker' ? 'status_reply' : 'status_reply') : 'status_reply';
      const messageContent = mediaObj ? (mediaObj.url || content) : (isEmoji ? content : replyText);

      const formData = new FormData();
      formData.append('conversation', convId);
      formData.append('message_type', messageType);
      formData.append('content', messageContent);
      formData.append('metadata', JSON.stringify({
        status_id: currentStory.id,
        author: viewingUserGroup.user.username,
        bg_color: currentStory.bg_color,
        story_content: currentStory.content,
        file_url: currentStory.file ? getMediaUrl(currentStory.file) : null,
        is_reaction: isEmoji || Boolean(mediaObj),
        reaction_media: mediaObj ? { url: mediaObj.url, type: mediaObj.type, media_type: mediaObj.media_type } : null,
        timestamp: currentStory.created_at
      }));

      await api.post(`chat/conversations/${convId}/messages/`, formData);


      if (!isEmoji && !mediaObj) setReplyText('');
      setShowReplyMediaPicker(false);
      setIsPaused(false);
      setToastMsg(mediaObj ? `Sent ${mediaObj.media_type || 'reaction'} to direct chat!` : (isEmoji ? `Reacted with ${content} to direct chat!` : 'Reply sent to chat!'));
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err) {
      console.error('Failed to send reply/reaction:', err);
      showAlert('Error', 'Failed to send message.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDeleteStatus = async () => {
    const currentStory = viewingUserGroup?.stories[currentIndex];
    if (!currentStory) return;
    const confirmed = await showConfirm('Delete Status', 'Are you sure you want to delete this status update?', 'Delete');
    if (!confirmed) return;

    try {
      await api.delete(`chat/statuses/${currentStory.id}/`);
      const remaining = viewingUserGroup.stories.filter((_, idx) => idx !== currentIndex);
      if (remaining.length > 0) {
        const nextIdx = Math.min(currentIndex, remaining.length - 1);
        setViewingUserGroup({ ...viewingUserGroup, stories: remaining });
        setCurrentIndex(nextIdx);
      } else {
        setViewingUserGroup(null);
      }
      fetchStatuses();
    } catch (err) {
      console.error('Failed to delete status', err);
      showAlert('Error', 'Failed to delete status.');
    }
  };

  const currentActiveStory = viewingUserGroup?.stories[currentIndex];
  const isViewingMyOwn = viewingUserGroup?.user.id === user.id || viewingUserGroup?.user.username === user.username;
  const isVideoStory = currentActiveStory?.file && (
    currentActiveStory.file.endsWith('.mp4') || 
    currentActiveStory.file.endsWith('.webm') || 
    currentActiveStory.file.endsWith('.mov') || 
    currentActiveStory.metadata?.is_video
  );

  useEffect(() => {
    setStoryProgress(0);
    setIsPaused(false);
  }, [currentIndex, viewingUserGroup?.user?.id]);

  useEffect(() => {
    if (!viewingUserGroup || !currentActiveStory || isVideoStory || isPaused || showViewersDrawer) {
      return;
    }
    const timer = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          handleNextStory();
          return 100;
        }
        return prev + 2;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [viewingUserGroup, currentActiveStory, isVideoStory, isPaused, showViewersDrawer, currentIndex]);

  const togglePause = () => {
    setIsPaused((prev) => {
      const next = !prev;
      if (videoRef.current) {
        if (next) videoRef.current.pause();
        else videoRef.current.play();
      }
      return next;
    });
  };

  return (
    <>
      <div className={`sidebar ${className}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>

      {/* Hidden File Input for Media Studio */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.[0]) {
            const f = e.target.files[0];
            if (f.size > 50 * 1024 * 1024) {
              showAlert('⚠️ File Too Large!', 'Status video/image must be under 50 MB.');
              e.target.value = '';
              return;
            }
            setEditingMediaFile(f);
            e.target.value = '';
          }
        }}
      />

      {/* Header */}
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CircleDot size={22} color="#00a884" strokeWidth={2.5} /> Status
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => { setCreateType('text'); setShowCreateModal(true); }}
            title="Add Text Status"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
          >
            <FileText size={20} />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Add Photo/Video Status"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
          >
            <Camera size={20} />
          </button>
        </div>
      </div>

      {/* Status List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
        {/* My Status Row */}
        <div style={{ padding: '0 16px', marginBottom: '15px' }}>
          <div
            onClick={() => {
              if (myStatuses.length > 0) {
                openStoryViewer({ user, stories: myStatuses }, 0);
              } else {
                fileInputRef.current?.click();
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 12px',
              backgroundColor: 'var(--bg-primary)', borderRadius: '10px', cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.05))'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
          >
            <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%', backgroundColor: 'var(--primary-color)',
                overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white',
                fontSize: '20px', fontWeight: 'bold', border: myStatuses.length > 0 ? '3px solid #00a884' : '2px dashed var(--text-secondary)'
              }}>
                {user.avatar ? (
                  <img src={getMediaUrl(user.avatar)} alt="Me" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user.username.charAt(0).toUpperCase()
                )}
              </div>
              {myStatuses.length === 0 && (
                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', backgroundColor: '#00a884', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px', fontWeight: 'bold', border: '2px solid var(--bg-primary)' }}>
                  +
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '16px' }}>My Status</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {myStatuses.length > 0 ? `${myStatuses.length} active updates` : 'Tap to add status update'}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Updates */}
        <div style={{ padding: '0 16px' }}>

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>Loading statuses...</div>
          ) : contactGroups.length === 0 ? (
            <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              No status updates from contacts in the last 24 hours.
            </div>
          ) : (
            <>
              {/* Recent Updates (Unviewed) */}
              {contactGroups.filter(g => g.unviewedCount > 0).length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#00a884', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Recent Updates
                    </span>
                    <span style={{ backgroundColor: '#00a884', color: 'white', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px' }}>
                      {contactGroups.reduce((acc, g) => acc + g.unviewedCount, 0)} New
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {contactGroups.filter(g => g.unviewedCount > 0).map(group => (
                      <div
                        key={group.user.id}
                        onClick={() => openStoryViewer(group, 0)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 12px',
                          borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{
                          width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
                          padding: '2px', border: '3px solid #00a884',
                          display: 'flex', justifyContent: 'center', alignItems: 'center'
                        }}>
                          <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: 'var(--primary-color)', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
                            {group.user.avatar ? (
                              <img src={getMediaUrl(group.user.avatar)} alt={group.user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              getDisplayName(group.user, true).charAt(0).toUpperCase()
                            )}
                          </div>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {getDisplayName(group.user, true)}
                          </div>
                          <div style={{ fontSize: '13px', color: '#00a884', marginTop: '2px', fontWeight: '600' }}>
                            NEW ({group.unviewedCount}) • {new Date(group.stories[group.stories.length - 1].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Viewed Updates */}
              {contactGroups.filter(g => g.unviewedCount === 0).length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Viewed Updates
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {contactGroups.filter(g => g.unviewedCount === 0).map(group => (
                      <div
                        key={group.user.id}
                        onClick={() => openStoryViewer(group, 0)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 12px',
                          borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s', opacity: 0.85
                        }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{
                          width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
                          padding: '2px', border: '3px solid #667781',
                          display: 'flex', justifyContent: 'center', alignItems: 'center'
                        }}>
                          <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: 'var(--primary-color)', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
                            {group.user.avatar ? (
                              <img src={getMediaUrl(group.user.avatar)} alt={group.user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              getDisplayName(group.user, true).charAt(0).toUpperCase()
                            )}
                          </div>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {getDisplayName(group.user, true)}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Viewed • {new Date(group.stories[group.stories.length - 1].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>





      {/* Create Status Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary)', padding: '25px', borderRadius: '12px',
            width: '450px', maxWidth: '92%', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {createType === 'text' ? <><FileText size={20} color="#00a884" /> New Text Status</> : <><Camera size={20} color="#00a884" /> New Media Status</>}
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleCreateStatus}>
              {createType === 'text' ? (
                <div>
                  <div style={{
                    backgroundColor: bgColor, height: '220px', borderRadius: '12px', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', padding: '20px', marginBottom: '8px',
                    boxShadow: 'inset 0 0 15px rgba(0,0,0,0.3)', position: 'relative'
                  }}>
                    <textarea
                      value={textContent}
                      onChange={e => setTextContent(e.target.value)}
                      placeholder="Type a status update..."
                      required
                      style={{
                        background: 'transparent', border: 'none', outline: 'none', color: 'white',
                        fontSize: '22px', fontWeight: 'bold', textAlign: 'center', width: '100%', height: '100%',
                        resize: 'none'
                      }}
                    />
                  </div>

                  {/* Emoji button + picker */}
                  <div style={{ position: 'relative', marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowStatusEmoji(prev => !prev)}
                      title="Add Emoji"
                      style={{
                        background: showStatusEmoji ? 'rgba(0,168,132,0.15)' : 'transparent',
                        border: '1px solid var(--border-color)', borderRadius: '20px',
                        padding: '5px 12px', cursor: 'pointer',
                        color: showStatusEmoji ? '#00a884' : 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600'
                      }}
                    >
                      <Smile size={16} /> Emoji
                    </button>
                    {showStatusEmoji && (
                      <div style={{ position: 'absolute', bottom: '38px', right: 0, zIndex: 2000 }}>
                        <EmojiPicker
                          onEmojiClick={(emojiData) => {
                            setTextContent(prev => prev + emojiData.emoji);
                            setShowStatusEmoji(false);
                          }}
                          width={320}
                          height={380}
                          searchDisabled={false}
                          skinTonesDisabled
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Background Color</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {bgColors.map(col => (
                        <div
                          key={col}
                          onClick={() => setBgColor(col)}
                          style={{
                            width: '32px', height: '32px', borderRadius: '50%', backgroundColor: col,
                            cursor: 'pointer', border: bgColor === col ? '3px solid white' : '1px solid rgba(255,255,255,0.3)',
                            boxShadow: bgColor === col ? '0 0 10px rgba(255,255,255,0.5)' : 'none'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Select Photo or Video (Max 50 MB)</label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={e => {
                        if (e.target.files?.[0]) {
                          const f = e.target.files[0];
                          if (f.size > 50 * 1024 * 1024) {
                            showAlert('⚠️ File Too Large!', 'Status video/image must be under 50 MB.');
                            e.target.value = '';
                            return;
                          }
                          setEditingMediaFile(f);
                          setShowCreateModal(false);
                          e.target.value = '';
                        }
                      }}
                      required
                      style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                    />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <input
                      type="text"
                      placeholder="Add an optional caption..."
                      value={textContent}
                      onChange={e => setTextContent(e.target.value)}
                      style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '8px 16px', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '8px 22px', backgroundColor: '#00a884', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isSubmitting ? 'Posting...' : '🚀 Post Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Media Editor Studio */}
      {editingMediaFile && (
        <StatusMediaEditorModal
          file={editingMediaFile}
          onClose={() => setEditingMediaFile(null)}
          onComplete={handlePostEditedStatus}
        />
      )}

      {/* Full-Screen Story Viewer */}
      {viewingUserGroup && currentActiveStory && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', maxHeight: '100vh', overflow: 'hidden', boxSizing: 'border-box',
          backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', alignItems: 'center', padding: '15px 0 20px 0'
        }}>
          {/* Top Segments & User Bar */}
          <div style={{ width: '100%', maxWidth: '550px', padding: '0 15px', zIndex: 2 }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
              {viewingUserGroup.stories.map((s, idx) => {
                let widthPercent = 0;
                if (idx < currentIndex) widthPercent = 100;
                else if (idx === currentIndex) widthPercent = storyProgress;
                else widthPercent = 0;

                return (
                  <div 
                    key={s.id} 
                    onClick={() => { setCurrentIndex(idx); }} 
                    style={{ flex: 1, height: '3.5px', backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: '2px', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
                  >
                    <div style={{ width: `${widthPercent}%`, height: '100%', backgroundColor: '#ffffff', transition: idx === currentIndex && !isPaused && !isVideoStory ? 'width 0.1s linear' : 'none' }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold' }}>
                  {viewingUserGroup.user.avatar ? (
                    <img src={getMediaUrl(viewingUserGroup.user.avatar)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getDisplayName(viewingUserGroup.user, true).charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: '600', fontSize: '15px' }}>
                    {isViewingMyOwn ? 'My Status' : getDisplayName(viewingUserGroup.user, true)}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                    {new Date(currentActiveStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {isViewingMyOwn && (
                  <button
                    onClick={handleDeleteStatus}
                    title="Delete this status"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                )}
                <button onClick={() => setViewingUserGroup(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0 5px', display: 'flex', alignItems: 'center' }}>
                  <X size={26} />
                </button>
              </div>
            </div>
          </div>

          {/* Story Content Area */}
          <div style={{ position: 'relative', flex: 1, width: '100%', maxWidth: '600px', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '10px 0', overflow: 'hidden', maxHeight: 'calc(100vh - 200px)' }}>
            {/* Left Nav Zone */}
            <div onClick={handlePrevStory} style={{ position: 'absolute', top: 0, left: 0, width: '30%', height: '100%', zIndex: 5, cursor: 'pointer' }} title="Previous Story" />
            
            {/* Center Pause/Play Zone */}
            <div onClick={togglePause} style={{ position: 'absolute', top: 0, left: '30%', width: '40%', height: '100%', zIndex: 5, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title={isPaused ? "Click to Resume" : "Click to Pause"}>
              {isPaused && (
                <div style={{
                  width: '68px', height: '68px', borderRadius: '50%',
                  backgroundColor: 'rgba(0, 0, 0, 0.65)', border: '2px solid white',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)', transition: 'all 0.2s'
                }}>
                  <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor" style={{ marginLeft: '4px' }}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Right Nav Zone */}
            <div onClick={handleNextStory} style={{ position: 'absolute', top: 0, right: 0, width: '30%', height: '100%', zIndex: 5, cursor: 'pointer' }} title="Next Story" />

            {currentActiveStory.file ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', padding: '0 20px', boxSizing: 'border-box' }}>
                {currentActiveStory.file.endsWith('.mp4') || currentActiveStory.file.endsWith('.webm') || currentActiveStory.file.endsWith('.mov') || currentActiveStory.metadata?.is_video ? (
                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', maxHeight: 'calc(100vh - 240px)', maxWidth: '100%' }}>
                    <video 
                      ref={videoRef}
                      src={getMediaUrl(currentActiveStory.file)} 
                      autoPlay 
                      playsInline 
                      onLoadedMetadata={(e) => {
                        if (currentActiveStory.metadata?.startTime) {
                          e.target.currentTime = currentActiveStory.metadata.startTime;
                        }
                      }}
                      onTimeUpdate={(e) => {
                        if (isPaused) return;
                        const startTime = currentActiveStory.metadata?.startTime || 0;
                        const endTime = currentActiveStory.metadata?.endTime || e.target.duration || 0;
                        const totalDuration = endTime - startTime;
                        if (totalDuration > 0) {
                          const current = e.target.currentTime - startTime;
                          const progress = Math.min(100, Math.max(0, (current / totalDuration) * 100));
                          setStoryProgress(progress);
                        }
                        if (endTime && e.target.currentTime >= endTime) {
                          handleNextStory();
                        }
                      }}
                      onEnded={() => {
                        handleNextStory();
                      }}
                      style={{ maxHeight: 'calc(100vh - 240px)', maxWidth: '100%', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.6)' }} 
                    />
                    {currentActiveStory.metadata?.overlays?.map((ov) => (
                      <div
                        key={ov.id}
                        style={{
                          position: 'absolute',
                          left: `${ov.x * 100}%`,
                          top: `${ov.y * 100}%`,
                          padding: '6px 12px',
                          borderRadius: '6px',
                          pointerEvents: 'none',
                          backgroundColor: ov.bgStyle === 'dark' ? 'rgba(0,0,0,0.7)' : (ov.bgStyle === 'light' ? 'rgba(255,255,255,0.85)' : 'transparent'),
                          color: ov.color,
                          fontSize: `${Math.min(32, Math.max(16, ov.size))}px`,
                          fontWeight: ov.type === 'text' ? 'bold' : 'normal',
                          textShadow: ov.bgStyle === 'transparent' ? '0 2px 4px rgba(0,0,0,0.8)' : 'none',
                          zIndex: 20
                        }}
                      >
                        {ov.content}
                      </div>
                    ))}
                  </div>
                ) : (
                  <img src={getMediaUrl(currentActiveStory.file)} alt="Story" style={{ maxHeight: 'calc(100vh - 240px)', maxWidth: '100%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.6)' }} />
                )}
                {currentActiveStory.content && (
                  <div style={{ marginTop: '10px', color: 'white', fontSize: '16px', fontWeight: '600', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: '20px', flexShrink: 0 }}>
                    {currentActiveStory.content}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                width: '90%', maxWidth: '400px', height: 'calc(100vh - 250px)', maxHeight: '480px', backgroundColor: currentActiveStory.bg_color || '#0b141a',
                borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '30px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)', boxSizing: 'border-box', border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ color: 'white', fontSize: '26px', fontWeight: 'bold', textAlign: 'center', wordBreak: 'break-word', overflowY: 'auto', maxHeight: '100%' }}>
                  {currentActiveStory.content}
                </div>
              </div>
            )}

            {/* Left/Right visual navigation chevrons */}
            {currentIndex > 0 && (
              <div style={{ position: 'absolute', left: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '36px', pointerEvents: 'none' }}>‹</div>
            )}
            {currentIndex < viewingUserGroup.stories.length - 1 && (
              <div style={{ position: 'absolute', right: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '36px', pointerEvents: 'none' }}>›</div>
            )}
          </div>

          {/* Bottom Interaction & Viewers Bar */}
          <div style={{ width: '100%', maxWidth: '550px', padding: '0 15px', zIndex: 10 }}>
            {toastMsg && (
              <div style={{ backgroundColor: '#00a884', color: 'white', padding: '8px 16px', borderRadius: '20px', textAlign: 'center', fontSize: '14px', fontWeight: '600', marginBottom: '10px', boxShadow: '0 4px 12px rgba(0,168,132,0.4)', animation: 'fadeIn 0.3s' }}>
                ✅ {toastMsg}
              </div>
            )}

            {isViewingMyOwn ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    const nextDrawer = !showViewersDrawer;
                    setShowViewersDrawer(nextDrawer);
                    if (nextDrawer) setIsPaused(true);
                    else setIsPaused(false);
                  }}
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 20px', borderRadius: '25px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(5px)' }}
                >
                  <Eye size={18} /> Viewed by {currentActiveStory.views?.length || 0}
                </button>

                {showViewersDrawer && (
                  <div style={{
                    position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                    width: '380px', maxWidth: '92vw', backgroundColor: 'var(--bg-primary)',
                    borderRadius: '16px', padding: '18px', border: '1px solid var(--border-color)',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.95)', zIndex: 10005,
                    maxHeight: '65vh', overflowY: 'auto'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '16px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Eye size={20} color="#00a884" /> Story Views ({currentActiveStory.views?.length || 0})</span>
                      <button onClick={() => { setShowViewersDrawer(false); setIsPaused(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}><X size={22} /></button>
                    </h4>
                    {!currentActiveStory.views || currentActiveStory.views.length === 0 ? (
                      <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 10px', fontSize: '14px' }}>No views yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {currentActiveStory.views.map(v => (
                          <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '15px' }}>{v.viewer?.username || 'User'}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {new Date(v.viewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* Emoji Quick Reactions */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
                  {emojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleSendReactionOrReply(emoji, true)}
                      title={`React with ${emoji}`}
                      style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '42px', height: '42px', fontSize: '22px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'transform 0.2s', backdropFilter: 'blur(5px)' }}
                      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {/* Floating Media Picker for status replies */}
                {showReplyMediaPicker && (
                  <div style={{ position: 'absolute', bottom: '70px', right: '15px', zIndex: 10000 }}>
                    <MediaPicker
                      onSelectEmoji={(emojiData) => handleSendReactionOrReply(emojiData.emoji, true)}
                      onSelectGif={(gif) => handleSendReactionOrReply(gif.title || 'GIF', false, { url: gif.url, media_type: 'GIF', type: 'gif' })}
                      onSelectSticker={(sticker) => handleSendReactionOrReply(sticker.title || 'Sticker', false, { url: sticker.url, media_type: 'Sticker', type: 'sticker' })}
                      onClose={() => { setShowReplyMediaPicker(false); setIsPaused(false); }}
                    />
                  </div>
                )}

                {/* Text Reply Input */}
                <form onSubmit={e => { e.preventDefault(); if (!isSendingReply) handleSendReactionOrReply(replyText, false); }} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder={`Reply to ${getDisplayName(viewingUserGroup.user, true)}...`}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onFocus={() => setIsPaused(true)}
                      onBlur={() => {
                        if (!showReplyMediaPicker) setIsPaused(false);
                      }}
                      style={{ width: '100%', padding: '10px 42px 10px 16px', backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '25px', color: 'white', outline: 'none', fontSize: '15px', backdropFilter: 'blur(5px)', boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = !showReplyMediaPicker;
                        setShowReplyMediaPicker(next);
                        setIsPaused(next);
                      }}
                      title="Emojis, GIFs & Stickers"
                      style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: showReplyMediaPicker ? '#00a884' : 'rgba(255,255,255,0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', transition: 'color 0.2s' }}
                    >
                      <Smile size={22} />
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={!replyText.trim() || isSendingReply}
                    style={{ backgroundColor: isSendingReply ? '#667781' : '#00a884', color: 'white', border: 'none', borderRadius: '25px', padding: '10px 20px', fontWeight: '600', cursor: isSendingReply ? 'not-allowed' : 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
                  >
                    {isSendingReply ? 'Sending...' : 'Send 🚀'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}


export default StatusSidebar;

import { useState, useEffect, useRef } from 'react';
import api, { getMediaUrl } from '../api';
import ContactInfo from './ContactInfo';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import AttachmentMenu from './AttachmentMenu';
import AttachmentModals from './AttachmentModals';
import EmojiPicker from 'emoji-picker-react';
import { useContacts } from '../contexts/ContactsContext';

function ChatWindow({ user, chat, onUpdateChat, onLogout, onStartCall, conversations = [], groups = [], onCloseChat, className = '' }) {
  const { getDisplayName } = useContacts();
  const [messages, setMessages] = useState([]);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewAvatarImage, setPreviewAvatarImage] = useState(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const shouldAutoScroll = useRef(true);
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const isGroup = chat.isGroup;

  const getOtherParticipant = (participants) => {
    if (!participants) return null;
    return participants.find(p => p.id !== user?.id) || participants[0];
  };

  const otherParticipant = isGroup ? null : getOtherParticipant(chat.participants);
  const chatName = isGroup ? chat.name : getDisplayName(otherParticipant);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const endpoint = isGroup 
          ? `chat/groups/${chat.id}/messages/` 
          : `chat/conversations/${chat.id}/messages/`;
        const res = await api.get(endpoint);
        setMessages(res.data);
      } catch (err) {
        console.error('Failed to fetch messages', err);
      }
    };
    fetchMessages();
    
    // Setup WebSocket
    const roomName = isGroup ? `group_${chat.id}` : `conv_${chat.id}`;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws/chat/${roomName}/`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'new_message') {
        setMessages(prev => {
          if (prev.find(m => m.id === data.message.id)) return prev;
          shouldAutoScroll.current = true;
          return [...prev, data.message];
        });
        onUpdateChat({
          ...chat,
          last_message: data.message,
          updated_at: new Date().toISOString()
        });
        
        // Auto-read if at the bottom
        if (data.message.sender.username !== user?.username && shouldAutoScroll.current) {
          api.post(isGroup ? `chat/groups/${chat.id}/read/` : `chat/conversations/${chat.id}/read/`).catch(console.error);
        }
      } else if (data.type === 'message_update') {
        setMessages(prev => prev.map(m => m.id === data.message.id ? data.message : m));
      } else if (data.type === 'message_delete') {
        setMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, is_deleted: true, content: '', file: null } : m));
      } else if (data.type === 'messages_read') {
        if (data.reader !== user?.username) {
          setMessages(prev => prev.map(m => m.sender.username === user?.username ? { ...m, is_read: true } : m));
        }
      } else if (data.type === 'typing_start') {
        if (data.username !== user?.username) {
          setIsTyping(true);
          setTypingUser(data.username);
        }
      } else if (data.type === 'typing_stop') {
        if (data.username !== user?.username) {
          setIsTyping(false);
          setTypingUser('');
        }
      }
    };

    return () => {
      ws.close();
    };
  }, [chat.id, isGroup]);

  useEffect(() => {
    if (shouldAutoScroll.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // Auto-scroll if within 100px of the bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    shouldAutoScroll.current = isNearBottom;
    setShowScrollDown(!isNearBottom && scrollHeight > clientHeight);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };


  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'voice_message.webm', { type: 'audio/webm' });
        setSelectedFile(file);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    try {
      if (editingMessage) {
        const endpoint = isGroup 
          ? `chat/groups/${chat.id}/messages/${editingMessage.id}/` 
          : `chat/conversations/${chat.id}/messages/${editingMessage.id}/`;
        
        const res = await api.patch(endpoint, { content: newMessage });
        setMessages(messages.map(m => m.id === editingMessage.id ? res.data : m));
        setNewMessage('');
        setEditingMessage(null);
        return;
      }

      const endpoint = isGroup 
        ? `chat/groups/${chat.id}/messages/` 
        : `chat/conversations/${chat.id}/messages/`;
        
      const formData = new FormData();
      if (newMessage.trim()) formData.append('content', newMessage);
      if (selectedFile) formData.append('file', selectedFile);
      if (replyingTo) formData.append('reply_to', replyingTo.id);
      if (isGroup) {
        formData.append('group', chat.id);
      } else {
        formData.append('conversation', chat.id);
      }
        
      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      shouldAutoScroll.current = true;
      setMessages(prev => {
        if (prev.find(m => m.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
      setNewMessage('');
      setSelectedFile(null);
      setReplyingTo(null);
      onUpdateChat({
        ...chat,
        last_message: res.data,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleSendSpecialMessage = async (type, data) => {
    try {
      const endpoint = isGroup 
        ? `chat/groups/${chat.id}/messages/` 
        : `chat/conversations/${chat.id}/messages/`;
        
      const formData = new FormData();
      formData.append('message_type', type);
      formData.append('metadata', JSON.stringify(data));
      if (isGroup) {
        formData.append('group', chat.id);
      } else {
        formData.append('conversation', chat.id);
      }
        
      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      shouldAutoScroll.current = true;
      setMessages(prev => {
        if (prev.find(m => m.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
      setActiveModal(null);
      onUpdateChat({
        ...chat,
        last_message: res.data,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to send special message', err);
    }
  };
  const handleVote = async (msgId, optionId) => {
    try {
      const endpoint = isGroup 
        ? `chat/groups/${chat.id}/messages/${msgId}/vote_poll/` 
        : `chat/conversations/${chat.id}/messages/${msgId}/vote_poll/`;
      await api.post(endpoint, { option_id: optionId });
    } catch (err) {
      console.error('Failed to vote', err);
    }
  };

  const handleForwardSubmit = async (selectedChats, selectedGroups) => {
    try {
      await api.post('chat/forward_message/', {
        message_id: forwardingMessage.id,
        is_group_message: isGroup,
        target_conversations: selectedChats,
        target_groups: selectedGroups
      });
      setForwardingMessage(null);
      setActiveMessageMenu(null);
    } catch (err) {
      console.error('Failed to forward message', err);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Delete message?')) return;
    try {
      const endpoint = isGroup 
        ? `chat/groups/${chat.id}/messages/${msgId}/` 
        : `chat/conversations/${chat.id}/messages/${msgId}/`;
      await api.delete(endpoint);
      setActiveMessageMenu(null);
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMessages.length === 0) return;
    if (!window.confirm(`Delete ${selectedMessages.length} message(s)?`)) return;
    try {
      for (const msgId of selectedMessages) {
          const endpoint = isGroup 
            ? `chat/groups/${chat.id}/messages/${msgId}/` 
            : `chat/conversations/${chat.id}/messages/${msgId}/`;
          await api.delete(endpoint);
      }
      setSelectionMode(false);
      setSelectedMessages([]);
    } catch (err) {
      console.error('Failed to bulk delete', err);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatStatusTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(now.getDate() - 1);
    const isYesterday = date.getDate() === yesterdayDate.getDate() && date.getMonth() === yesterdayDate.getMonth() && date.getFullYear() === yesterdayDate.getFullYear();
    
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) return `today at ${timeStr}`;
    if (isYesterday) return `yesterday at ${timeStr}`;
    return `${date.toLocaleDateString()} at ${timeStr}`;
  };
  
  const renderStatus = () => {
    if (isTyping) {
      return <span style={{ color: '#25D366', fontWeight: 'bold' }}>{isGroup ? `${typingUser} is typing...` : 'typing...'}</span>;
    }
    if (isGroup) {
      return `${chat.members?.length || 0} participants`;
    }
    if (otherParticipant?.last_seen) {
      const lastSeen = new Date(otherParticipant.last_seen);
      const diff = (new Date() - lastSeen) / 1000;
      if (diff < 30) {
        return <span style={{ color: '#25D366' }}>🟢 Online</span>;
      }
      return `Last seen ${formatStatusTime(otherParticipant.last_seen)}`;
    }
    return 'Offline';
  };

  const handleAddMember = async () => {
    const query = prompt("Enter phone number or username of the person to add:");
    if (!query) return;
    
    try {
      const searchRes = await api.get(`users/search/?q=${query}`);
      if (searchRes.data.length === 0) {
        alert("User not found!");
        return;
      }
      
      const userToAdd = searchRes.data[0];
      const confirmAdd = window.confirm(`Add ${userToAdd.username} (${userToAdd.phone_number}) to the group?`);
      
      if (confirmAdd) {
        await api.post(`chat/groups/${chat.id}/add_member/`, { user_id: userToAdd.id });
        alert(`${userToAdd.username} added successfully!`);
        onUpdateChat({ ...chat });
      }
    } catch (err) {
      console.error('Failed to add member', err);
      alert("Failed to add member.");
    }
  };

  const renderFile = (fileUrl) => {
    if (!fileUrl) return null;
    let urlStr = typeof fileUrl === 'string' ? fileUrl : (fileUrl.url || fileUrl.name || String(fileUrl));
    const fullUrl = getMediaUrl(urlStr);
    const isImage = urlStr.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
    const isAudio = urlStr.match(/\.(webm|mp3|ogg|wav)$/i) != null;
    
    if (isImage) {
      return (
        <img 
          src={fullUrl} 
          alt="attachment" 
          style={{ maxWidth: '300px', maxHeight: '300px', objectFit: 'cover', borderRadius: '8px', marginTop: '5px', cursor: 'pointer' }} 
          onClick={() => setPreviewImage(fullUrl)}
        />
      );
    } else if (isAudio) {
      return <VoiceMessagePlayer src={fullUrl} />;
    } else {
      return (
        <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '5px', padding: '8px 12px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '8px', color: 'inherit', textDecoration: 'none' }}>
          📄 Download Attachment
        </a>
      );
    }
  };

  const formatRecordingTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'typing_start', username: user.username }));
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === 1) {
          wsRef.current.send(JSON.stringify({ type: 'typing_stop', username: user.username }));
        }
      }, 2000);
    }
  };

  return (
    <div className={`chat-window ${className}`}>
      {selectionMode ? (
        <div className="chat-header" style={{ backgroundColor: 'var(--bg-secondary)', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
             <button onClick={() => { setSelectionMode(false); setSelectedMessages([]); }} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
             <span style={{ fontSize: '18px', color: 'var(--text-primary)' }}>{selectedMessages.length} selected</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
             {selectedMessages.length > 0 && (
                <button onClick={handleBulkDelete} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Delete">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>
                </button>
             )}
          </div>
        </div>
      ) : (
      <div className="chat-header">
        <div className="chat-header-info">
          {onCloseChat && (
            <button className="mobile-only" onClick={onCloseChat} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', marginRight: '10px', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path>
              </svg>
            </button>
          )}
          <div onClick={() => setShowInfo(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <div className="user-avatar" style={{ backgroundColor: isGroup ? '#f59e0b' : '#2764FF', overflow: 'hidden' }}>
            {isGroup ? (
              chat.avatar ? (
                <img 
                  src={getMediaUrl(chat.avatar)} 
                  alt="avatar" 
                  style={{width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer'}} 
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewAvatarImage(getMediaUrl(chat.avatar));
                  }}
                />
              ) : (
                chatName?.charAt(0).toUpperCase()
              )
            ) : otherParticipant?.avatar ? (
              <img 
                src={getMediaUrl(otherParticipant.avatar)} 
                alt="avatar" 
                style={{width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer'}} 
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewAvatarImage(getMediaUrl(otherParticipant.avatar));
                }}
              />
            ) : (
              chatName?.charAt(0).toUpperCase()
            )}
          </div>
          </div>
          <div className="chat-header-text" onClick={() => setShowInfo(true)} style={{ cursor: 'pointer' }}>
            <div className="chat-header-name">{chatName}</div>
            <div className="chat-header-status">{renderStatus()}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {!isGroup && (
            <>
              <button 
                onClick={() => onStartCall(chat, false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                title="Voice Call"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 1-.63 1-1.18v-3.45c0-.54-.45-.99-.99-.99z"></path></svg>
              </button>
              <button 
                onClick={() => onStartCall(chat, true)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                title="Video Call"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M18 10.496L22 6.811V17.189L18 13.504V17C18 17.552 17.552 18 17 18H3C2.448 18 2 17.552 2 17V7C2 6.448 2.448 6 3 6H17C17.552 6 18 6.448 18 7V10.496Z"></path></svg>
              </button>
            </>
          )}
          <button onClick={() => { setIsSearchActive(!isSearchActive); setSearchQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} title="Search">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M15.009 13.805H14.374L14.149 13.588C15.326 12.221 16.037 10.435 16.037 8.5C16.037 4.358 12.679 1 8.518 1C4.358 1 1 4.358 1 8.5C1 12.642 4.358 16 8.518 16C10.453 16 12.239 15.289 13.606 14.112L13.823 14.337V14.972L19.61 20.75L21.36 19L15.582 13.213V13.805ZM8.518 13.805C5.589 13.805 3.212 11.428 3.212 8.5C3.212 5.572 5.589 3.195 8.518 3.195C11.447 3.195 13.824 5.572 13.824 8.5C13.824 11.428 11.447 13.805 8.518 13.805Z"></path></svg>
          </button>
          
          <div style={{ position: 'relative' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowHeaderMenu(!showHeaderMenu)} title="Menu">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 7C12.828 7 13.5 6.328 13.5 5.5C13.5 4.672 12.828 4 12 4C11.172 4 10.5 4.672 10.5 5.5C10.5 6.328 11.172 7 12 7ZM12 10.5C11.172 10.5 10.5 11.172 10.5 12C10.5 12.828 11.172 13.5 12 13.5C12.828 13.5 13.5 12.828 13.5 12C13.5 11.172 12.828 10.5 12 10.5ZM12 17C11.172 17 10.5 17.672 10.5 18.5C10.5 19.328 11.172 20 12 20C12.828 20 13.5 19.328 13.5 18.5C13.5 17.672 12.828 17 12 17Z"></path></svg>
            </button>
            {showHeaderMenu && (
              <>
                <div 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} 
                  onClick={(e) => { e.stopPropagation(); setShowHeaderMenu(false); }}
                  onTouchEnd={(e) => { e.stopPropagation(); setShowHeaderMenu(false); }}
                />
                <div style={{
                  position: 'absolute', top: '40px', right: '0', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.3)', padding: '10px 0', minWidth: '240px', zIndex: 100
                }}>
                  {(isGroup ? [
                    { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>, label: 'Add member', onClick: () => { setShowHeaderMenu(false); handleAddMember(); } },
                    { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path></svg>, label: 'Group info', onClick: () => { setShowHeaderMenu(false); setShowInfo(true); } },
                    { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>, label: 'Select messages', onClick: () => setSelectionMode(true) },
                    { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"></path></svg>, label: chat.is_muted ? 'Unmute notifications' : 'Mute notifications', onClick: () => {
                        api.post(`chat/groups/${chat.id}/toggle_mute/`).then(() => {
                            onUpdateChat({...chat, is_muted: !chat.is_muted});
                        });
                    } },
                    { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>, label: chat.is_favourite ? 'Remove from favourites' : 'Add to favourites', onClick: () => {
                        api.post(`chat/groups/${chat.id}/toggle_favourite/`).then(() => {
                           onUpdateChat({...chat, is_favourite: !chat.is_favourite});
                        });
                    } },
                    { type: 'divider' },
                    { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 11H7v-2h10v2z"></path></svg>, label: 'Clear chat', onClick: () => {
                        if (window.confirm('Clear all messages in this group?')) {
                            api.post(`chat/groups/${chat.id}/clear/`).then(() => setMessages([]));
                        }
                    } },
                    { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"></path></svg>, label: 'Exit group', onClick: () => {
                        if (window.confirm('Exit this group?')) {
                            api.post(`chat/groups/${chat.id}/exit_group/`).then(() => window.location.reload());
                        }
                    } }
                  ] : [
                    { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path></svg>, label: 'Contact info', onClick: () => { setShowHeaderMenu(false); setShowInfo(true); } },
                    { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>, label: 'Select messages', onClick: () => setSelectionMode(true) },
                    { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"></path></svg>, label: chat.is_muted ? 'Unmute notifications' : 'Mute notifications', onClick: () => {
                        api.post(`chat/conversations/${chat.id}/toggle_mute/`).then(() => {
                            onUpdateChat({...chat, is_muted: !chat.is_muted});
                        });
                    } },
                    { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>, label: chat.is_favourite ? 'Remove from favourites' : 'Add to favourites', onClick: () => {
                        api.post(`chat/conversations/${chat.id}/toggle_favourite/`).then(() => {
                           onUpdateChat({...chat, is_favourite: !chat.is_favourite});
                        });
                    } },
                    { type: 'divider' },
                    { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"></path></svg>, label: chat.is_blocked ? 'Unblock' : 'Block', onClick: () => {
                        if (chat.is_blocked) {
                            api.post(`users/unblock/${otherParticipant.id}/`).then(() => {
                                alert('User unblocked!');
                                onUpdateChat({...chat, is_blocked: false});
                            });
                        } else {
                            if (window.confirm(`Block ${otherParticipant.username}?`)) {
                                api.post(`users/block/${otherParticipant.id}/`).then(() => {
                                    alert('User blocked!');
                                    onUpdateChat({...chat, is_blocked: true});
                                });
                            }
                        }
                    } },
                    { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 11H7v-2h10v2z"></path></svg>, label: 'Clear chat', onClick: () => {
                        if (window.confirm('Clear all messages in this chat?')) {
                            api.post(`chat/conversations/${chat.id}/clear/`).then(() => setMessages([]));
                        }
                    } },
                    { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>, label: 'Delete chat', onClick: () => {
                        if (window.confirm('Delete this chat entirely?')) {
                            api.post(`chat/conversations/${chat.id}/delete_chat/`).then(() => window.location.reload());
                        }
                    } }
                  ]).map((item, i) => (
                    item.type === 'divider' ? (
                      <div key={i} style={{ borderBottom: '1px solid var(--border-color)', margin: '5px 0' }} />
                    ) : (
                      <div 
                        key={i}
                        style={{ padding: '10px 24px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}
                        onMouseOver={(e) => e.target.style.backgroundColor = 'var(--bg-sidebar)'}
                        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        onClick={() => { setShowHeaderMenu(false); item.onClick(); }}
                      >
                        <div style={{ color: 'var(--text-secondary)' }}>{item.icon}</div>
                        {item.label}
                      </div>
                    )
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      )}
      
      {isSearchActive && (
        <div style={{ padding: '10px 20px', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Search messages..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
            autoFocus
          />
          <button onClick={() => { setIsSearchActive(false); setSearchQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', marginLeft: '10px' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
          </button>
        </div>
      )}
      
      <div className="chat-messages" style={{ position: 'relative' }} ref={chatContainerRef} onScroll={handleScroll}>
        {messages.filter(msg => !isSearchActive || !searchQuery || msg.content?.toLowerCase().includes(searchQuery.toLowerCase())).map(msg => {
          if (msg.message_type === 'system') {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', margin: '10px 0', width: '100%' }}>
                <div style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', padding: '5px 12px', borderRadius: '12px', fontSize: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  {msg.content}
                </div>
              </div>
            );
          }
          
          const isOut = msg.sender.username === user?.username;
          return (
            <div key={msg.id} style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: isOut ? 'flex-end' : 'flex-start' }}>
              {selectionMode && (
                <input 
                  type="checkbox" 
                  checked={selectedMessages.includes(msg.id)}
                  onChange={() => {
                    if (selectedMessages.includes(msg.id)) setSelectedMessages(prev => prev.filter(id => id !== msg.id));
                    else setSelectedMessages(prev => [...prev, msg.id]);
                  }}
                  style={{ marginRight: '15px', width: '20px', height: '20px', cursor: 'pointer' }}
                />
              )}
            <div className={`message ${isOut ? 'msg-out' : 'msg-in'}`} style={{ paddingRight: '25px', ...(selectionMode ? { flex: 1, marginLeft: 0, marginRight: 0 } : {}) }}>
              {!selectionMode && <div style={{ position: 'absolute', top: 5, right: 8, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '16px', opacity: 0.5 }} onClick={() => setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id)}>
                ⌄
              </div>}
              
              {activeMessageMenu === msg.id && (
                <>
                  <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMessageMenu(null);
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      setActiveMessageMenu(null);
                    }}
                  />
                  <div style={{ position: 'absolute', top: 25, right: 5, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', borderRadius: '8px', zIndex: 100, padding: '5px 0', minWidth: '120px' }}>
                    <div style={{ padding: '8px 20px', cursor: 'pointer', color: 'var(--text-primary)' }} onClick={() => { setReplyingTo(msg); setActiveMessageMenu(null); }}>Reply</div>
                    {!msg.is_deleted && msg.content && (
                      <div style={{ padding: '8px 20px', cursor: 'pointer', color: 'var(--text-primary)' }} onClick={() => { navigator.clipboard.writeText(msg.content); setActiveMessageMenu(null); }}>Copy</div>
                    )}
                    {!msg.is_deleted && (
                      <div style={{ padding: '8px 20px', cursor: 'pointer', color: 'var(--text-primary)' }} onClick={() => { setForwardingMessage(msg); setActiveMessageMenu(null); }}>Forward</div>
                    )}
                  {isOut && !msg.is_deleted && (
                    <>
                      <div style={{ padding: '8px 20px', cursor: 'pointer', color: 'var(--text-primary)' }} onClick={() => { setEditingMessage(msg); setNewMessage(msg.content); setActiveMessageMenu(null); }}>Edit</div>
                      <div style={{ padding: '8px 20px', cursor: 'pointer', color: 'var(--danger)' }} onClick={() => handleDeleteMessage(msg.id)}>Delete</div>
                    </>
                    )}
                  </div>
                </>
              )}

              {!isOut && isGroup && <div style={{fontSize: '11px', color: 'var(--primary-color)', marginBottom: '2px', fontWeight: 'bold'}}>{getDisplayName(msg.sender, true)}</div>}
              
              {msg.is_deleted ? (
                <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginTop: '5px' }}>🚫 This message was deleted</div>
              ) : (
                <>
                  {msg.metadata && msg.metadata.is_forwarded && (
                      <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M10.89 12l5.59-5.59L15.07 5 8.01 12l7.06 7 1.41-1.41L10.89 12z" transform="rotate(180 12 12)"/></svg>
                        Forwarded
                      </div>
                    )}
                  {msg.replied_to && (
                    <div style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderLeft: '4px solid var(--primary-color)', padding: '5px 10px', borderRadius: '4px', marginBottom: '5px', fontSize: '13px' }}>
                      <strong style={{ color: 'var(--primary-color)' }}>{msg.replied_to.sender}</strong>
                      <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {msg.replied_to.is_deleted ? '🚫 This message was deleted' : (msg.replied_to.content || (msg.replied_to.has_file ? '📎 Attachment' : ''))}
                      </div>
                    </div>
                  )}
                  {msg.file && renderFile(msg.file)}
                  
                  {msg.message_type === 'poll' && msg.metadata && (
                    <div style={{ marginTop: '5px', backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', minWidth: '250px' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '15px' }}>📊 {msg.metadata.question}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        {msg.metadata.allow_multiple ? 'Select one or more' : 'Select one'}
                      </div>
                      {msg.metadata.options.map(opt => {
                        const votesForOption = msg.poll_votes ? msg.poll_votes.filter(v => v.option_id === String(opt.id)) : [];
                        const hasVoted = votesForOption.some(v => v.user_id === user?.id);
                        const totalVotes = msg.poll_votes ? msg.poll_votes.length : 0;
                        const percentage = totalVotes > 0 ? (votesForOption.length / totalVotes) * 100 : 0;
                        
                        return (
                          <div key={opt.id} onClick={() => handleVote(msg.id, String(opt.id))} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', marginBottom: '5px', borderRadius: '4px', cursor: 'pointer', overflow: 'hidden', border: hasVoted ? '1px solid var(--primary-color)' : '1px solid transparent' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${percentage}%`, backgroundColor: 'var(--primary-color)', opacity: 0.1, zIndex: 0, transition: 'width 0.3s ease' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 1 }}>
                              {msg.metadata.allow_multiple ? (
                                <input type="checkbox" checked={hasVoted} readOnly style={{ pointerEvents: 'none', cursor: 'pointer' }} />
                              ) : (
                                <input type="radio" checked={hasVoted} readOnly style={{ pointerEvents: 'none', cursor: 'pointer' }} />
                              )}
                              <span>{opt.text}</span>
                            </div>
                            <div style={{ zIndex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>
                              {votesForOption.length > 0 ? votesForOption.length : ''}
                            </div>
                          </div>
                        );
                      })}
                      {msg.poll_votes && msg.poll_votes.length > 0 && (
                        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '10px', paddingTop: '10px', textAlign: 'center', fontSize: '13px', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: '500' }}>
                          View votes
                        </div>
                      )}
                    </div>
                  )}

                  {msg.message_type === 'event' && msg.metadata && (
                    <div style={{ marginTop: '5px', backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #00a884', minWidth: '200px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📅 {msg.metadata.title}
                      </div>
                      
                      {msg.metadata.description && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                          {msg.metadata.description}
                        </div>
                      )}
                      
                      <div style={{ color: 'var(--text-primary)', fontSize: '13px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>
                          <strong>Start:</strong> {msg.metadata.start_date || msg.metadata.date} at {msg.metadata.start_time}
                        </div>
                        
                        {(msg.metadata.end_date || msg.metadata.end_time) && (
                          <div>
                            <strong>End:</strong> {msg.metadata.end_date} {msg.metadata.end_time ? `at ${msg.metadata.end_time}` : ''}
                          </div>
                        )}
                        
                        {msg.metadata.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ color: 'var(--text-secondary)' }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"></path></svg>
                            {msg.metadata.location}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {msg.message_type === 'contact' && msg.metadata && (
                    <div style={{ marginTop: '5px', backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#009de2', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '20px' }}>👤</div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{msg.metadata.name}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{msg.metadata.phone}</div>
                      </div>
                    </div>
                  )}

                  {msg.content && <div style={{ marginTop: (msg.file || msg.message_type !== 'text') ? '5px' : '0', color: 'var(--text-primary)' }}>{msg.content}</div>}
                </>
              )}
              
              <div className="message-time">
                {msg.is_edited && !msg.is_deleted && <span style={{ marginRight: '5px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>(edited)</span>}
                {formatTime(msg.timestamp)}
                {isOut && !isGroup && (
                  <span style={{ marginLeft: '5px', color: msg.is_read ? '#53bdeb' : '#8696a0' }}>
                    {msg.is_read ? '✓✓' : '✓'}
                  </span>
                )}
              </div>
            </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />

      </div>

      {showScrollDown && (
        <button
          onClick={scrollToBottom}
          style={{
            position: 'absolute',
            bottom: '90px',
            right: '20px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            zIndex: 100
          }}
          title="Scroll to bottom"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
          </svg>
        </button>
      )}

      {chat.is_blocked ? (
        <div style={{ padding: '20px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '14px' }}>
          You blocked this contact. Messages cannot be sent or received.
        </div>
      ) : (
      <div className="chat-input-container" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        {(replyingTo || editingMessage) && (
          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '10px 15px', borderLeft: '4px solid var(--primary-color)', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', marginBottom: '10px' }}>
            <div>
              <div style={{ color: 'var(--primary-color)', fontSize: '13px', fontWeight: 'bold', marginBottom: '2px' }}>
                {editingMessage ? 'Editing message' : `Replying to ${replyingTo.sender.username}`}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                {editingMessage ? '' : (replyingTo.content || (replyingTo.file ? '📎 Attachment' : ''))}
              </div>
            </div>
            <div style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px' }} onClick={() => { setReplyingTo(null); setEditingMessage(null); setNewMessage(''); }}>
              ✕
            </div>
          </div>
        )}
        
        <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '10px' }}>
          {selectedFile && (
            <div style={{ position: 'absolute', bottom: '100%', left: '20px', backgroundColor: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)', zIndex: 50 }}>
              {selectedFile.type && selectedFile.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(selectedFile)} alt="preview" style={{ height: '60px', borderRadius: '4px', objectFit: 'cover' }} />
              ) : null}
              <span style={{ fontSize: '14px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                {selectedFile.type && selectedFile.type.startsWith('image/') ? '' : 'Attached: '}{selectedFile.name}
              </span>
              <button type="button" onClick={() => setSelectedFile(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0 5px', fontSize: '18px' }}>✕</button>
            </div>
          )}

          {isRecording ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px', color: '#f03e3e', fontWeight: 'bold' }}>
              <span className="recording-dot" style={{ width: '10px', height: '10px', backgroundColor: '#f03e3e', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></span>
              Recording... {formatRecordingTime(recordingTime)}
              <button type="button" onClick={stopRecording} style={{ marginLeft: 'auto', background: '#f03e3e', color: 'white', border: 'none', borderRadius: '20px', padding: '5px 15px', cursor: 'pointer' }}>
                Stop & Attach
              </button>
            </div>
          ) : (
            <form style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '15px' }} onSubmit={handleSendMessage}>
              <div style={{ position: 'relative' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Attach"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {showAttachmentMenu && (
                  <AttachmentMenu 
                    onClose={() => setShowAttachmentMenu(false)}
                    onSelect={(type) => {
                      if (type === 'photos') {
                        document.getElementById('hidden-photo-input').click();
                      } else if (type === 'document') {
                        document.getElementById('hidden-document-input').click();
                      } else if (['poll', 'event', 'contact'].includes(type)) {
                        setActiveModal(type);
                      } else {
                        alert(`Feature ${type} coming in next step!`);
                      }
                    }}
                  />
                )}
                <input id="hidden-photo-input" type="file" style={{ display: 'none' }} accept="image/png, image/jpeg, image/jpg, image/webp, video/mp4, video/webm" onChange={handleFileChange} />
                <input id="hidden-document-input" type="file" style={{ display: 'none' }} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar" onChange={handleFileChange} />
              </div>
              
              <div style={{ position: 'relative' }}>
                <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2S22 6.477 22 12S17.523 22 12 22ZM12 20C16.418 20 20 16.418 20 12S16.418 4 12 4S4 7.582 4 12S7.582 20 12 20ZM8.5 11C7.671 11 7 10.329 7 9.5S7.671 8 8.5 8S10 8.671 10 9.5S9.329 11 8.5 11ZM15.5 11C14.671 11 14 10.329 14 9.5S14.671 8 15.5 8S17 8.671 17 9.5S16.329 11 15.5 11ZM12 16.5C9.721 16.5 7.755 15.111 6.822 13.064C6.671 12.732 6.818 12.339 7.15 12.188C7.482 12.037 7.875 12.184 8.026 12.516C8.653 13.889 9.972 14.821 11.5 14.821H12.5C14.028 14.821 15.347 13.889 15.974 12.516C16.125 12.184 16.518 12.037 16.85 12.188C17.182 12.339 17.329 12.732 17.178 13.064C16.245 15.111 14.279 16.5 12 16.5Z"></path>
                  </svg>
                </button>
                {showEmojiPicker && (
                  <div style={{ position: 'absolute', bottom: '50px', left: 0, zIndex: 100 }}>
                    <EmojiPicker 
                      onEmojiClick={(emojiData) => {
                        setNewMessage(prev => prev + emojiData.emoji);
                        setShowEmojiPicker(false);
                      }} 
                    />
                  </div>
                )}
              </div>

              <input 
                type="text" 
                className="chat-input"
                placeholder="Type a message" 
                value={newMessage}
                onChange={handleTyping}
              />
              
              {!newMessage.trim() && !selectedFile ? (
                <button type="button" onClick={startRecording} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 14C10.343 14 9 12.657 9 11V5C9 3.343 10.343 2 12 2C13.657 2 15 3.343 15 5V11C15 12.657 13.657 14 12 14ZM11 11V5C11 4.448 11.448 4 12 4C12.552 4 13 4.448 13 5V11C13 11.552 12.552 12 12 12C11.448 12 11 11.552 11 11ZM20 11C20 15.418 16.418 19 12 19C7.582 19 4 15.418 4 11H6C6 14.314 8.686 17 12 17C15.314 17 18 14.314 18 11H20ZM11 19.938V22H13V19.938C16.331 19.516 19 16.848 19 13.5H17C17 16.261 14.761 18.5 12 18.5C9.239 18.5 7 16.261 7 13.5H5C5 16.848 7.669 19.516 11 19.938Z"></path>
                  </svg>
                </button>
              ) : (
                <button type="submit" className="send-btn">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path>
                  </svg>
                </button>
              )}
            </form>
          )}
        </div>
      </div>
      )}
      {showInfo && (
        <ContactInfo 
          participant={otherParticipant} 
          group={isGroup ? chat : null} 
          onClose={() => setShowInfo(false)} 
          onUpdateGroup={onUpdateChat}
        />
      )}

      {previewAvatarImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out' }} onClick={() => setPreviewAvatarImage(null)}>
          <img src={previewAvatarImage} alt="Avatar Preview" style={{ width: '90%', height: 'auto', maxWidth: '400px', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: '20px', right: '30px', color: 'white', fontSize: '30px', cursor: 'pointer' }}>✖</div>
        </div>
      )}

      {previewImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out' }} onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Preview" style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain', borderRadius: '8px' }} />
          <div style={{ position: 'absolute', top: '20px', right: '30px', color: 'white', fontSize: '30px', cursor: 'pointer' }}>✖</div>
        </div>
      )}

      {activeModal && (
        <AttachmentModals 
          type={activeModal} 
          onClose={() => setActiveModal(null)}
          onSubmit={handleSendSpecialMessage}
        />
      )}
      
      {forwardingMessage && (
        <ForwardModal 
          conversations={conversations}
          groups={groups}
          user={user}
          onClose={() => setForwardingMessage(null)}
          onForward={handleForwardSubmit}
        />
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default ChatWindow;

function ForwardModal({ conversations, groups, onClose, onForward, user }) {
  const [selectedChats, setSelectedChats] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);

  const handleForward = () => {
    if (selectedChats.length === 0 && selectedGroups.length === 0) return;
    onForward(selectedChats, selectedGroups);
  };

  const allConversations = conversations.filter(c => !c.is_archived);
  const allGroups = groups.filter(g => !g.is_archived);

  return (
    <>
      <div 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 999 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        backgroundColor: 'var(--bg-primary)', borderRadius: '12px', padding: '24px',
        width: '400px', maxWidth: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', zIndex: 1000,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)', color: 'var(--text-primary)'
      }}>
        <h3 style={{ marginBottom: '20px', marginTop: 0 }}>Forward Message to...</h3>
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
          {allConversations.length > 0 && <h4 style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>Chats</h4>}
          {allConversations.map(c => {
            const other = c.participants.find(p => p.id !== user?.id) || c.participants[0];
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => {
                if (selectedChats.includes(c.id)) setSelectedChats(selectedChats.filter(id => id !== c.id));
                else setSelectedChats([...selectedChats, c.id]);
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#2764FF', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold' }}>
                    {other?.username.charAt(0).toUpperCase()}
                  </div>
                  <span>{other?.username}</span>
                </div>
                <input type="checkbox" checked={selectedChats.includes(c.id)} readOnly style={{ cursor: 'pointer' }} />
              </div>
            );
          })}

          {allGroups.length > 0 && <h4 style={{ color: 'var(--text-secondary)', marginTop: '20px', marginBottom: '10px' }}>Groups</h4>}
          {allGroups.map(g => (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => {
              if (selectedGroups.includes(g.id)) setSelectedGroups(selectedGroups.filter(id => id !== g.id));
              else setSelectedGroups([...selectedGroups, g.id]);
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold' }}>
                  {g.name.charAt(0).toUpperCase()}
                </div>
                <span>{g.name}</span>
              </div>
              <input type="checkbox" checked={selectedGroups.includes(g.id)} readOnly style={{ cursor: 'pointer' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button type="button" onClick={onClose} style={{ padding: '10px 20px', color: 'var(--primary-color)', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={handleForward} disabled={selectedChats.length === 0 && selectedGroups.length === 0} style={{ padding: '10px 20px', backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: '24px', fontWeight: 'bold', border: 'none', cursor: (selectedChats.length === 0 && selectedGroups.length === 0) ? 'not-allowed' : 'pointer', opacity: (selectedChats.length === 0 && selectedGroups.length === 0) ? 0.5 : 1 }}>Send</button>
        </div>
      </div>
    </>
  );
}

import { useState, useEffect, useRef } from 'react';
import api, { getMediaUrl, getWebSocketUrl } from '../api';
import ContactInfo from './ContactInfo';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import AttachmentMenu from './AttachmentMenu';
import AttachmentModals from './AttachmentModals';
import MediaPicker from './MediaPicker';
import ImagePreviewEditor from './ImagePreviewEditor';
import StarredMessagesModal from './StarredMessagesModal';
import ScheduleMessageModal from './ScheduleMessageModal';
import DocumentPreviewModal from './DocumentPreviewModal';
import { useContacts } from '../contexts/ContactsContext';
import { useAlert } from '../contexts/AlertContext';
import { Phone, Video, Search, MoreVertical, Plus, Smile, Mic, Send, X, UserPlus, Info, CheckSquare, Bell, BellOff, Star, Ban, Eraser, LogOut, Trash2, Check, CheckCheck, Lock, Reply, Forward, Clock, FileText, FileSpreadsheet, FileCode, Eye } from 'lucide-react';
import { getChatKey, isChatLocked } from '../utils/chatLock';
import { playMessageNotificationSound, playSentMessageSound } from '../utils/soundEffects';

function ChatWindow({ user, chat, onUpdateChat, onLogout, onStartCall, conversations = [], groups = [], onCloseChat, className = '' }) {
  const { getDisplayName } = useContacts();
  const { showAlert, showConfirm, showToast } = useAlert();
  const [messages, setMessages] = useState([]);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreviewFile, setImagePreviewFile] = useState(null);
  const [viewingStatusPreview, setViewingStatusPreview] = useState(null);
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
  const [showStarredModal, setShowStarredModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [viewingVotesModal, setViewingVotesModal] = useState(null);
  const [viewingDocumentModal, setViewingDocumentModal] = useState(null);
  const [pendingPreSendDocument, setPendingPreSendDocument] = useState(null);
  const [selectedFileIsHD, setSelectedFileIsHD] = useState(false);

  const [isMobileView, setIsMobileView] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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

  const isGroup = Boolean(chat.isGroup || chat.is_group || chat.members || (chat.name && !chat.participants));

  const renderFormattedContent = (content, size = 18) => {
    if (!content) return null;
    if (content.includes('Voice call') || content.includes('Video call')) {
      const isVideo = content.includes('Video call');
      const isMissed = content.includes('Missed');
      const iconColor = isMissed ? '#ef4444' : '#00a884';
      const cleanText = content.replace(/^[📞📹]\s*/, '').trim();

      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle' }}>
          {isVideo ? (
            <svg viewBox="0 0 24 24" width={size} height={size} fill={iconColor} style={{ flexShrink: 0 }}>
              <path d="M18 10.496L22 6.811V17.189L18 13.504V17C18 17.552 17.552 18 17 18H3C2.448 18 2 17.552 2 17V7C2 6.448 2.448 6 3 6H17C17.552 6 18 6.448 18 7V10.496Z"></path>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width={size} height={size} fill={iconColor} style={{ flexShrink: 0 }}>
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 1-.63 1-1.18v-3.45c0-.54-.45-.99-.99-.99z"></path>
            </svg>
          )}
          <span>{cleanText}</span>
        </span>
      );
    }
    if (typeof content === 'string' && /(https?:\/\/[^\s]+|www\.[^\s]+)/i.test(content)) {
      const parts = content.split(/(https?:\/\/[^\s]+|www\.[^\s]+)/gi);
      return parts.map((part, idx) => {
        if (part && part.match(/^(https?:\/\/|www\.)/i)) {
          let url = part;
          let trailing = '';
          const trailingMatch = url.match(/[.,!?);]+$/);
          if (trailingMatch) {
            trailing = trailingMatch[0];
            url = url.slice(0, -trailing.length);
          }
          const href = url.startsWith('www.') ? `https://${url}` : url;
          return (
            <span key={idx}>
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ color: '#53bdeb', textDecoration: 'underline', wordBreak: 'break-all' }}
                onClick={(e) => e.stopPropagation()}
              >
                {url}
              </a>
              {trailing}
            </span>
          );
        }
        return part;
      });
    }
    return content;
  };

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
    const ws = new WebSocket(getWebSocketUrl(`/ws/chat/${roomName}/`));
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
        
        // Sound & Auto-read if at the bottom
        const senderUsername = data.message.sender?.username || data.message.sender;
        const senderId = data.message.sender?.id || data.message.sender;
        const isFromMe = senderId === user?.id || senderUsername === user?.username;
        if (!isFromMe) {
          playMessageNotificationSound();
          if (shouldAutoScroll.current) {
            api.post(isGroup ? `chat/groups/${chat.id}/read/` : `chat/conversations/${chat.id}/read/`).catch(console.error);
          }
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
      const file = e.target.files[0];
      const isMedia = file.type.startsWith('video/') || file.type.startsWith('audio/') || file.type.startsWith('image/');
      const maxMediaSize = 50 * 1024 * 1024; // 50 MB for media
      const maxDocSize = 100 * 1024 * 1024;  // 100 MB for documents/other files

      if (isMedia && file.size > maxMediaSize) {
        showAlert('⚠️ Video / Media Too Large!', `The selected file (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed video/media limit of 50 MB.`);
        e.target.value = '';
        return;
      }
      if (!isMedia && file.size > maxDocSize) {
        showAlert('⚠️ Document Too Large!', `The selected document (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed document limit of 100 MB.`);
        e.target.value = '';
        return;
      }

      // Open image editor for images, open document preview modal for documents/files
      if (file.type.startsWith('image/')) {
        setImagePreviewFile(file);
        e.target.value = '';
      } else {
        setPendingPreSendDocument(file);
        e.target.value = '';
      }
    }
  };

  const handleDocumentPreSend = (fileObj, caption) => {
    setSelectedFile(fileObj);
    if (caption && caption.trim()) setNewMessage(caption);
    setPendingPreSendDocument(null);
    setTimeout(() => {
      document.getElementById('chat-send-btn')?.click();
    }, 50);
  };

  const handleImageEditorSend = (editedFile, caption, isHD) => {
    setSelectedFile(editedFile);
    setSelectedFileIsHD(Boolean(isHD));
    if (caption && caption.trim()) setNewMessage(caption);
    setImagePreviewFile(null);
    // Auto-submit immediately
    setTimeout(() => {
      document.getElementById('chat-send-btn')?.click();
    }, 50);
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
      showAlert('Error', 'Microphone access denied or unavailable.');
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
      if (selectedFileIsHD) formData.append('metadata', JSON.stringify({ is_hd: true }));
      if (replyingTo) formData.append('reply_to', replyingTo.id);
      if (isGroup) {
        formData.append('group', chat.id);
      } else {
        formData.append('conversation', chat.id);
      }
        
      const res = await api.post(endpoint, formData);

      
      shouldAutoScroll.current = true;
      setMessages(prev => {
        if (prev.find(m => m.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
      playSentMessageSound();
      setNewMessage('');
      setSelectedFile(null);
      setSelectedFileIsHD(false);
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
      if (type === 'gif') formData.append('content', '🎞️ GIF');
      if (type === 'sticker') formData.append('content', '🏷️ Sticker');
      if (type === 'poll') formData.append('content', `📊 Poll: ${data.question}`);
      if (type === 'event') formData.append('content', `📅 Event: ${data.title}`);
      if (type === 'contact') formData.append('content', `👤 Contact: ${data.name || data.phone}`);
      if (isGroup) {
        formData.append('group', chat.id);
      } else {
        formData.append('conversation', chat.id);
      }
        
      const res = await api.post(endpoint, formData);

      
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
      const res = await api.post(endpoint, { option_id: optionId });
      if (res.data && res.data.id) {
        setMessages(prev => prev.map(m => m.id === res.data.id ? res.data : m));
        if (viewingVotesModal && viewingVotesModal.id === res.data.id) {
          setViewingVotesModal(res.data);
        }
      }
    } catch (err) {
      console.error('Failed to vote', err);
      showToast('Failed to record vote. Please try refreshing.', 'error');
    }
  };

  const handleForwardSubmit = async (selectedChats, selectedGroups) => {
    try {
      const msgsToForward = Array.isArray(forwardingMessage) ? forwardingMessage : [forwardingMessage];
      for (const msg of msgsToForward) {
        if (!msg) continue;
        await api.post('chat/forward_message/', {
          message_id: msg.id,
          is_group_message: isGroup,
          target_conversations: selectedChats,
          target_groups: selectedGroups
        });
      }
      setForwardingMessage(null);
      setActiveMessageMenu(null);
      setSelectionMode(false);
      setSelectedMessages([]);
    } catch (err) {
      console.error('Failed to forward message', err);
    }
  };

  const handleDeleteForMe = async (msgId) => {
    const confirmed = await showConfirm('Delete for Me', 'This message will be removed from your view only. Others can still see it.', 'Delete');
    if (!confirmed) return;
    try {
      const endpoint = isGroup 
        ? `chat/groups/${chat.id}/messages/${msgId}/delete_for_me/` 
        : `chat/conversations/${chat.id}/messages/${msgId}/delete_for_me/`;
      await api.post(endpoint);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      setActiveMessageMenu(null);
    } catch (err) {
      console.error('Failed to delete message for me', err);
    }
  };

  const handleDeleteForEveryone = async (msg) => {
    // Check 30-minute time limit on frontend too
    const sentTime = new Date(msg.timestamp);
    const now = new Date();
    const diffMs = now - sentTime;
    const thirtyMinMs = 30 * 60 * 1000;

    if (diffMs > thirtyMinMs) {
      showAlert('⏰ Time Expired', 'You can only delete for everyone within 30 minutes of sending the message.');
      return;
    }

    const confirmed = await showConfirm('Delete for Everyone', 'This message will be deleted for all participants.', 'Delete');
    if (!confirmed) return;
    try {
      const endpoint = isGroup 
        ? `chat/groups/${chat.id}/messages/${msg.id}/` 
        : `chat/conversations/${chat.id}/messages/${msg.id}/`;
      await api.delete(endpoint);
      setActiveMessageMenu(null);
    } catch (err) {
      if (err.response?.data?.error) {
        showAlert('Cannot Delete', err.response.data.error);
      }
      console.error('Failed to delete message for everyone', err);
    }
  };

  const canEditMessage = (msg) => {
    if (!msg || String(msg.sender?.id) !== String(user?.id) || msg.is_deleted) return false;
    if (msg.message_type && msg.message_type !== 'text') return false;
    if (msg.content && /(Voice call|Video call|Missed call|Missed voice call|Missed video call)/i.test(msg.content)) return false;
    if (msg.file) return false;
    const sentTime = new Date(msg.timestamp);
    const now = new Date();
    return (now - sentTime) <= 15 * 60 * 1000;
  };


  const handleReactToMessage = async (msgId, emoji) => {
    try {
      const res = await api.post('chat/messages/react/', {
        message_id: msgId,
        is_group: isGroup,
        emoji: emoji
      });
      setMessages(prev => prev.map(m => m.id === msgId ? res.data : m));
    } catch (err) {
      console.error('Failed to react to message', err);
    }
  };

  const handleToggleStarMessage = async (msgId) => {
    try {
      const res = await api.post('chat/messages/star/', {
        message_id: msgId,
        is_group: isGroup
      });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_starred: res.data.is_starred } : m));
      showToast(res.data.is_starred ? 'Message starred! ⭐' : 'Message unstarred');
    } catch (err) {
      console.error('Failed to star message', err);
    }
  };

  const [disappearingModal, setDisappearingModal] = useState(false);

  const handleSetDisappearing = async (duration) => {
    try {
      await api.post('chat/disappearing/', {
        target_id: chat.id,
        is_group: isGroup,
        duration: duration
      });
      onUpdateChat({ ...chat, disappearing_duration: duration });
      setDisappearingModal(false);
      showToast(duration === 0 ? 'Disappearing messages off' : 'Disappearing messages updated!');
    } catch (err) {
      console.error('Failed to set disappearing duration', err);
    }
  };

  const canDeleteForEveryone = (msg) => {
    if (!msg || msg.sender?.id !== user?.id) return false;
    const sentTime = new Date(msg.timestamp);
    const now = new Date();
    return (now - sentTime) <= 30 * 60 * 1000;
  };

  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const canBulkDeleteForEveryone = () => {
    if (selectedMessages.length === 0) return false;
    const now = new Date();
    const thirtyMinMs = 30 * 60 * 1000;
    return selectedMessages.every(msgId => {
      const msg = messages.find(m => m.id === msgId);
      if (!msg) return false;
      if (msg.sender?.id !== user?.id) return false;
      if (msg.is_deleted) return false;
      return (now - new Date(msg.timestamp)) <= thirtyMinMs;
    });
  };

  const handleBulkDeleteForMe = async () => {
    setShowBulkDeleteModal(false);
    if (selectedMessages.length === 0) return;
    const idsToDelete = [...selectedMessages];
    setSelectionMode(false);
    setSelectedMessages([]);
    setMessages(prev => prev.filter(m => !idsToDelete.includes(m.id)));
    try {
      await Promise.all(idsToDelete.map(msgId => {
        const endpoint = isGroup 
          ? `chat/groups/${chat.id}/messages/${msgId}/delete_for_me/` 
          : `chat/conversations/${chat.id}/messages/${msgId}/delete_for_me/`;
        return api.post(endpoint);
      }));
    } catch (err) {
      console.error('Failed to bulk delete for me', err);
    }
  };

  const handleBulkDeleteForEveryone = async () => {
    setShowBulkDeleteModal(false);
    if (selectedMessages.length === 0) return;
    const idsToDelete = [...selectedMessages];
    setSelectionMode(false);
    setSelectedMessages([]);
    setMessages(prev => prev.map(m => idsToDelete.includes(m.id) ? { ...m, is_deleted: true, content: '', file: null } : m));
    try {
      await Promise.all(idsToDelete.map(msgId => {
        const endpoint = isGroup 
          ? `chat/groups/${chat.id}/messages/${msgId}/` 
          : `chat/conversations/${chat.id}/messages/${msgId}/`;
        return api.delete(endpoint);
      }));
    } catch (err) {
      if (err.response?.data?.error) {
        showAlert('Cannot Delete', err.response.data.error);
      }
      console.error('Failed to bulk delete for everyone', err);
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
        showAlert('Notice', "User not found!");
        return;
      }
      
      const userToAdd = searchRes.data[0];
      const nameToDisplay = getDisplayName(userToAdd);
      const confirmAdd = await showConfirm('Add Member', `Add ${nameToDisplay} to the group?`, 'Add');
      
      if (confirmAdd) {
        await api.post(`chat/groups/${chat.id}/add_member/`, { user_id: userToAdd.id });
        showAlert('Success', `${nameToDisplay} added successfully!`);
        onUpdateChat({ ...chat });
      }
    } catch (err) {
      console.error('Failed to add member', err);
      showAlert('Error', "Failed to add member.");
    }
  };

  const renderFile = (fileUrl, metadata) => {
    if (!fileUrl) return null;
    let urlStr = typeof fileUrl === 'string' ? fileUrl : (fileUrl.url || fileUrl.name || String(fileUrl));
    const fullUrl = getMediaUrl(urlStr);
    const isImage = urlStr.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
    const isAudio = urlStr.match(/\.(webm|mp3|ogg|wav)$/i) != null;
    const isHD = Boolean(metadata?.is_hd);

    if (isImage) {
      return (
        <div style={{ position: 'relative', display: 'inline-block', marginTop: '5px' }}>
          <img 
            src={fullUrl} 
            alt="attachment" 
            style={{ maxWidth: '300px', maxHeight: '300px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', display: 'block' }} 
            onClick={() => setPreviewImage(fullUrl)}
          />
          {isHD && (
            <div 
              title="HD Quality Photo"
              style={{
                position: 'absolute', top: '8px', left: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.65)', color: 'white',
                border: '1.5px solid rgba(255, 255, 255, 0.9)', borderRadius: '4px',
                padding: '1px 5px', fontSize: '10px', fontWeight: '900',
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)', pointerEvents: 'none',
                letterSpacing: '0.5px'
              }}
            >
              HD
            </div>
          )}
        </div>
      );
    } else if (isAudio) {
      return <VoiceMessagePlayer src={fullUrl} />;
    } else {
      const fileName = urlStr.split('/').pop();
      const ext = fileName.split('.').pop().toLowerCase();

      const getDocIcon = () => {
        if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet size={26} color="#22c55e" />;
        if (['doc', 'docx', 'txt', 'rtf', 'pdf'].includes(ext)) return <FileText size={26} color="#3b82f6" />;
        return <FileCode size={26} color="#eab308" />;
      };

      return (
        <div 
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px',
            padding: '10px 14px', backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', transition: 'all 0.2s'
          }} 
          onClick={() => setViewingDocumentModal({ url: urlStr, name: fileName })}
          title="Click to preview document"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {getDocIcon()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {fileName}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
              <span>Preview document</span>
              <Eye size={12} />
            </div>
          </div>
        </div>
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

  const handleApproveOrReject = async (messageId, action) => {
    try {
      await api.post(`chat/groups/${chat.id}/handle_add_request/`, {
        message_id: messageId,
        action: action
      });
    } catch (err) {
      console.error('Failed to handle add request:', err);
      showAlert('Error', err.response?.data?.error || 'Failed to process request.');
    }
  };

  return (
    <div className={`chat-window ${className}`}>
      {selectionMode ? (
        <div className="chat-header" style={{ backgroundColor: 'var(--bg-secondary)', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
             <button onClick={() => { setSelectionMode(false); setSelectedMessages([]); }} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '20px' }} title="Cancel selection">✕</button>
             <span style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: '500' }}>{selectedMessages.length} selected</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
             {/* Reply Icon - Only shown when EXACTLY 1 message is selected */}
             {selectedMessages.length === 1 && (
               <button 
                 onClick={() => {
                   const msgToReply = messages.find(m => m.id === selectedMessages[0]);
                   if (msgToReply && !msgToReply.is_deleted) {
                     setReplyingTo(msgToReply);
                     setSelectionMode(false);
                     setSelectedMessages([]);
                   }
                 }} 
                 style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} 
                 title="Reply"
               >
                 <Reply size={22} strokeWidth={2.2} />
               </button>
             )}

             {/* Forward Icon - Shown when 1 or more messages are selected */}
             {selectedMessages.length > 0 && (
               <button 
                 onClick={() => {
                   const selectedMsgs = messages.filter(m => selectedMessages.includes(m.id) && !m.is_deleted);
                   if (selectedMsgs.length > 0) {
                     setForwardingMessage(selectedMsgs.length === 1 ? selectedMsgs[0] : selectedMsgs);
                   }
                 }} 
                 style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} 
                 title="Forward"
               >
                 <Forward size={22} strokeWidth={2.2} />
               </button>
             )}

             {/* Delete Icon - Shown when 1 or more messages are selected */}
             {selectedMessages.length > 0 && (
                <button onClick={() => setShowBulkDeleteModal(true)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Delete">
                  <Trash2 size={22} strokeWidth={2.2} />
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
                <Phone size={21} strokeWidth={2.2} />
              </button>
              <button 
                onClick={() => onStartCall(chat, true)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                title="Video Call"
              >
                <Video size={23} strokeWidth={2.2} />
              </button>
            </>
          )}
          <button onClick={() => { setIsSearchActive(!isSearchActive); setSearchQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} title="Search">
            <Search size={21} strokeWidth={2.2} />
          </button>
          
          <div style={{ position: 'relative' }}>
            <button 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} 
              onClick={(e) => { e.stopPropagation(); setShowHeaderMenu(!showHeaderMenu); }} 
              title="Menu"
            >
              <MoreVertical size={22} strokeWidth={2.2} />
            </button>
            {showHeaderMenu && (
              <>
                <div 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }} 
                  onClick={(e) => { e.stopPropagation(); setShowHeaderMenu(false); }}
                  onTouchEnd={(e) => { e.stopPropagation(); setShowHeaderMenu(false); }}
                />
                <div style={{
                  position: 'absolute', top: '45px', right: '0', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', padding: '10px 0', minWidth: '240px', zIndex: 10000
                }}>
                  {(isGroup ? [
                    { icon: <UserPlus size={18} />, label: 'Add member', onClick: () => { setShowHeaderMenu(false); handleAddMember(); } },
                    { icon: <Info size={18} />, label: 'Group info', onClick: () => { setShowHeaderMenu(false); setShowInfo(true); } },
                    { icon: <CheckSquare size={18} />, label: 'Select messages', onClick: () => setSelectionMode(true) },
                    { icon: chat.is_muted ? <Bell size={18} /> : <BellOff size={18} />, label: chat.is_muted ? 'Unmute notifications' : 'Mute notifications', onClick: () => {
                        api.post(`chat/groups/${chat.id}/toggle_mute/`).then(() => {
                            onUpdateChat({...chat, is_muted: !chat.is_muted});
                        });
                    } },
                    { icon: <Star size={18} />, label: chat.is_favourite ? 'Remove from favourites' : 'Add to favourites', onClick: () => {
                        api.post(`chat/groups/${chat.id}/toggle_favourite/`).then(() => {
                           onUpdateChat({...chat, is_favourite: !chat.is_favourite});
                        });
                    } },
                    { icon: <Star size={18} fill="#eab308" color="#eab308" />, label: 'Starred messages', onClick: () => { setShowHeaderMenu(false); setShowStarredModal(true); } },
                    { icon: <Clock size={18} color="#00a884" />, label: 'Schedule message 🕒', onClick: () => { setShowHeaderMenu(false); setShowScheduleModal(true); } },
                    { icon: <Clock size={18} />, label: 'Disappearing messages', onClick: () => { setShowHeaderMenu(false); setDisappearingModal(true); } },
                    { type: 'divider' },
                    { icon: <Eraser size={18} />, label: 'Clear chat', onClick: async () => {
                        const confirmed = await showConfirm('Clear Chat', 'Clear all messages in this group?', 'Clear');
                        if (confirmed) {
                            api.post(`chat/groups/${chat.id}/clear/`).then(() => setMessages([]));
                        }
                    } },
                    { icon: <LogOut size={18} />, label: 'Exit group', onClick: async () => {
                        const confirmed = await showConfirm('Exit Group', 'Exit this group?', 'Exit');
                        if (confirmed) {
                            api.post(`chat/groups/${chat.id}/exit_group/`).then(() => window.location.reload());
                        }
                    } }
                  ] : [
                    { icon: <Info size={18} />, label: 'Contact info', onClick: () => { setShowHeaderMenu(false); setShowInfo(true); } },
                    { icon: <CheckSquare size={18} />, label: 'Select messages', onClick: () => setSelectionMode(true) },
                    { icon: <Star size={18} fill="#eab308" color="#eab308" />, label: 'Starred messages', onClick: () => { setShowHeaderMenu(false); setShowStarredModal(true); } },
                    { icon: <Clock size={18} color="#00a884" />, label: 'Schedule message 🕒', onClick: () => { setShowHeaderMenu(false); setShowScheduleModal(true); } },
                    { icon: <Clock size={18} />, label: 'Disappearing messages', onClick: () => { setShowHeaderMenu(false); setDisappearingModal(true); } },
                    { icon: chat.is_muted ? <Bell size={18} /> : <BellOff size={18} />, label: chat.is_muted ? 'Unmute notifications' : 'Mute notifications', onClick: () => {
                        api.post(`chat/conversations/${chat.id}/toggle_mute/`).then(() => {
                            onUpdateChat({...chat, is_muted: !chat.is_muted});
                        });
                    } },
                    { icon: <Lock size={18} />, label: isChatLocked(getChatKey(chat)) ? 'Unlock chat 🔓' : 'Lock chat 🔒', onClick: () => {
                        setShowHeaderMenu(false);
                        const event = new CustomEvent('chatbox_toggle_chat_lock', { detail: chat });
                        window.dispatchEvent(event);
                    } },
                    { icon: <Star size={18} />, label: chat.is_favourite ? 'Remove from favourites' : 'Add to favourites', onClick: () => {
                        api.post(`chat/conversations/${chat.id}/toggle_favourite/`).then(() => {
                           onUpdateChat({...chat, is_favourite: !chat.is_favourite});
                        });
                    } },
                    { type: 'divider' },
                    { icon: <Ban size={18} />, label: chat.is_blocked ? 'Unblock' : 'Block', onClick: async () => {
                        if (!otherParticipant) return;
                        if (chat.is_blocked) {
                            api.post(`users/unblock/${otherParticipant.id}/`).then(() => {
                                showToast('User unblocked!');
                                onUpdateChat({...chat, is_blocked: false});
                            });
                        } else {
                            const confirmed = await showConfirm('Block User', `Block ${getDisplayName(otherParticipant)}?`, 'Block');
                            if (confirmed) {
                                api.post(`users/block/${otherParticipant.id}/`).then(() => {
                                    showToast('User blocked!');
                                    onUpdateChat({...chat, is_blocked: true});
                                });
                            }
                        }
                    } },
                    { icon: <Eraser size={18} />, label: 'Clear chat', onClick: async () => {
                        const confirmed = await showConfirm('Clear Chat', 'Clear all messages in this chat?', 'Clear');
                        if (confirmed) {
                            api.post(`chat/conversations/${chat.id}/clear/`).then(() => setMessages([]));
                        }
                    } },
                    { icon: <Trash2 size={18} />, label: 'Delete chat', onClick: async () => {
                        const confirmed = await showConfirm('Delete Chat', 'Delete this chat entirely?', 'Delete');
                        if (confirmed) {
                            api.post(`chat/conversations/${chat.id}/delete_chat/`).then(() => window.location.reload());
                        }
                    } }
                  ]).map((item, i) => (
                    item.type === 'divider' ? (
                      <div key={i} style={{ borderBottom: '1px solid var(--border-color)', margin: '5px 0' }} />
                    ) : (
                      <div 
                        key={i}
                        style={{ padding: '10px 24px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '15px', transition: 'background-color 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-sidebar)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        onClick={() => { setShowHeaderMenu(false); item.onClick(); }}
                      >
                        <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>{item.icon}</div>
                        <span>{item.label}</span>
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

          if (msg.message_type === 'add_request' && msg.metadata) {
            const status = msg.metadata.status || 'pending';
            const isPending = status === 'pending';
            const isApproved = status === 'approved';
            const currentMember = isGroup && chat.members?.find(m => m.user?.id === user?.id || m.user?.username === user?.username);
            const isAdmin = currentMember?.role === 'admin' || user?.is_superuser;

            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', margin: '14px 0', width: '100%' }}>
                <div style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderLeft: '4px solid #f59e0b',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  boxShadow: '0 3px 12px rgba(0,0,0,0.25)',
                  maxWidth: '85%',
                  minWidth: '300px',
                  color: 'var(--text-primary)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '20px' }}>👥</span>
                    <strong style={{ fontSize: '14px', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Group Join Request
                    </strong>
                  </div>
                  
                  <div style={{ fontSize: '14px', margin: '6px 0', lineHeight: '1.4' }}>
                    <strong>{msg.metadata.requester_username}</strong> requested to add <strong>{msg.metadata.target_username}</strong> to this group.
                  </div>

                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                    {isPending ? (
                      isAdmin ? (
                        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                          <button
                            onClick={() => handleApproveOrReject(msg.id, 'approve')}
                            style={{
                              flex: 1, backgroundColor: '#00a884', color: 'white', border: 'none',
                              padding: '7px 14px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                            }}
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => handleApproveOrReject(msg.id, 'reject')}
                            style={{
                              flex: 1, backgroundColor: '#ef4444', color: 'white', border: 'none',
                              padding: '7px 14px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                            }}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#f59e0b', fontStyle: 'italic', fontWeight: '600' }}>
                          ⏳ Waiting for group admin approval...
                        </span>
                      )
                    ) : (
                      <span style={{
                        fontSize: '12px', fontWeight: '700',
                        color: isApproved ? '#00a884' : '#ef4444',
                        display: 'flex', alignItems: 'center', gap: '5px'
                      }}>
                        {isApproved ? '✅ Approved by Admin' : '❌ Rejected by Admin'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          
          const isOut = msg.sender.username === user?.username;
          const isDeleted = Boolean(msg.is_deleted);

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
                  style={{
                    marginRight: '15px', width: '20px', height: '20px',
                    cursor: 'pointer'
                  }}
                />
              )}
            <div className={`message ${isOut ? 'msg-out' : 'msg-in'}`} style={{ 
              paddingRight: '25px', 
              ...(selectionMode ? { flex: 1, marginLeft: 0, marginRight: 0, cursor: 'pointer' } : {}),
              ...(msg.message_type === 'sticker' ? { backgroundColor: 'transparent', boxShadow: 'none', border: 'none', paddingRight: '5px' } : {}) 
            }}
            onClick={() => {
              if (selectionMode) {
                if (selectedMessages.includes(msg.id)) setSelectedMessages(prev => prev.filter(id => id !== msg.id));
                else setSelectedMessages(prev => [...prev, msg.id]);
              }
            }}>
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
                  <div style={{ position: 'absolute', top: 25, [isOut ? 'right' : 'left']: 5, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', borderRadius: '10px', zIndex: 1000, padding: '5px 0', minWidth: '180px' }}>
                    {!msg.is_deleted && (
                      <div style={{ display: 'flex', gap: '6px', padding: '6px 12px', borderBottom: '1px solid var(--border-color)', justifyContent: 'space-around' }}>
                        {['👍', '❤️', '😂', '😢', '😮', '🙏'].map(emoji => (
                          <span
                            key={emoji}
                            onClick={() => { handleReactToMessage(msg.id, emoji); setActiveMessageMenu(null); }}
                            style={{ cursor: 'pointer', fontSize: '18px', transition: 'transform 0.1s' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.3)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            {emoji}
                          </span>
                        ))}
                      </div>
                    )}
                    {msg.is_deleted ? (
                      <div style={{ padding: '8px 20px', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => handleDeleteForMe(msg.id)}>Delete for me</div>
                    ) : (
                      <>
                        <div style={{ padding: '8px 20px', cursor: 'pointer', color: 'var(--text-primary)' }} onClick={() => { setReplyingTo(msg); setActiveMessageMenu(null); }}>Reply</div>
                        <div style={{ padding: '8px 20px', cursor: 'pointer', color: 'var(--text-primary)' }} onClick={() => { handleToggleStarMessage(msg.id); setActiveMessageMenu(null); }}>
                          {msg.is_starred ? 'Unstar ⭐' : 'Star message ⭐'}
                        </div>
                        {msg.content && (
                          <div style={{ padding: '8px 20px', cursor: 'pointer', color: 'var(--text-primary)' }} onClick={() => { navigator.clipboard.writeText(msg.content); setActiveMessageMenu(null); }}>Copy</div>
                        )}
                        <div style={{ padding: '8px 20px', cursor: 'pointer', color: 'var(--text-primary)' }} onClick={() => { setForwardingMessage(msg); setActiveMessageMenu(null); }}>Forward</div>
                        {isOut && (
                          <>
                            {canEditMessage(msg) && (
                              <div style={{ padding: '8px 20px', cursor: 'pointer', color: 'var(--text-primary)' }} onClick={() => { setEditingMessage(msg); setNewMessage(msg.content); setActiveMessageMenu(null); }}>Edit</div>
                            )}
                            <div style={{ padding: '8px 20px', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => handleDeleteForMe(msg.id)}>Delete for me</div>
                            {canDeleteForEveryone(msg) && (
                              <div style={{ padding: '8px 20px', cursor: 'pointer', color: 'var(--danger)', fontWeight: '500' }} onClick={() => handleDeleteForEveryone(msg)}>Delete for everyone</div>
                            )}
                          </>
                        )}
                        {!isOut && (
                          <div style={{ padding: '8px 20px', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => handleDeleteForMe(msg.id)}>Delete for me</div>
                        )}
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
                  {msg.message_type === 'status_reply' && msg.metadata && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingStatusPreview(msg.metadata);
                      }}
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.25)', borderLeft: '4px solid #00a884',
                        borderRadius: '6px', padding: '8px 10px', marginBottom: '8px', display: 'flex',
                        alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'background-color 0.2s',
                      }}
                      title="Click to view status story"
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.35)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.25)'}
                    >
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '12px', color: '#00a884', fontWeight: '700', marginBottom: '2px' }}>
                          ⭕ Status {msg.metadata.author ? `• ${msg.metadata.author}` : ''}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {msg.metadata.story_content || '📷 Photo/Video Story'}
                        </div>
                      </div>
                      {msg.metadata.file_url ? (
                        <img src={getMediaUrl(msg.metadata.file_url)} alt="Status" style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }} />
                      ) : (
                        <div style={{ width: '44px', height: '44px', borderRadius: '6px', backgroundColor: msg.metadata.bg_color || '#0b141a', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '14px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)' }}>
                          📝
                        </div>
                      )}
                    </div>
                  )}
                  {msg.message_type === 'status_reply' && msg.metadata?.reaction_media && (
                    <div style={{ marginTop: '4px', marginBottom: '4px' }}>
                      <img 
                        src={msg.metadata.reaction_media.url} 
                        alt={msg.metadata.reaction_media.media_type || 'Reaction'} 
                        style={{ 
                          maxHeight: msg.metadata.reaction_media.type === 'sticker' ? '140px' : '220px', 
                          maxWidth: '100%', 
                          borderRadius: '8px', 
                          objectFit: 'contain',
                          display: 'block' 
                        }} 
                      />
                    </div>
                  )}
                  {msg.replied_to && (
                    <div style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderLeft: '4px solid var(--primary-color)', padding: '5px 10px', borderRadius: '4px', marginBottom: '5px', fontSize: '13px' }}>
                      <strong style={{ color: 'var(--primary-color)' }}>{msg.replied_to.sender}</strong>
                      <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {msg.replied_to.is_deleted ? '🚫 This message was deleted' : (renderFormattedContent(msg.replied_to.content, 14) || (msg.replied_to.has_file ? '📎 Attachment' : ''))}
                      </div>
                    </div>
                  )}
                  {msg.file && renderFile(msg.file, msg.metadata)}
                  
                  {msg.message_type === 'poll' && msg.metadata && (
                    <div style={{ 
                      marginTop: '4px', 
                      minWidth: '280px', 
                      maxWidth: '380px', 
                      userSelect: 'none' 
                    }}>
                      {/* Poll Question */}
                      <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px', color: 'inherit' }}>
                        {msg.metadata.question}
                      </div>

                      {/* Select One or More Subtitle */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', opacity: 0.8, marginBottom: '14px' }}>
                        <CheckCheck size={15} style={{ opacity: 0.85 }} />
                        <span>{msg.metadata.allow_multiple ? 'Select one or more' : 'Select one'}</span>
                      </div>

                      {/* Poll Options */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '8px' }}>
                        {msg.metadata.options.map(opt => {
                          const votesForOption = msg.poll_votes ? msg.poll_votes.filter(v => v.option_id === String(opt.id)) : [];
                          const hasVoted = votesForOption.some(v => v.user_id === user?.id);
                          const totalVotes = msg.poll_votes ? msg.poll_votes.length : 0;
                          const percentage = totalVotes > 0 ? (votesForOption.length / totalVotes) * 100 : 0;
                          
                          const topVoters = votesForOption.slice(0, 3).map(v => v.user).filter(Boolean);

                          return (
                            <div 
                              key={opt.id} 
                              onClick={(e) => { e.stopPropagation(); handleVote(msg.id, String(opt.id)); }} 
                              style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              {/* Option Row */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', flex: 1 }}>
                                  {/* WhatsApp Style Round Check Indicator */}
                                  <div style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    border: hasVoted ? 'none' : '2px solid rgba(134, 150, 160, 0.7)',
                                    backgroundColor: hasVoted ? '#25D366' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: hasVoted ? '0 1px 3px rgba(0,0,0,0.2)' : 'none'
                                  }}>
                                    {hasVoted && <Check size={14} color="white" strokeWidth={3.5} />}
                                  </div>
                                  
                                  <span style={{ fontSize: '15px', fontWeight: '500', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                    {opt.text}
                                  </span>
                                </div>

                                {/* Voter Avatars & Count */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                                  {topVoters.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', marginRight: '2px' }}>
                                      {topVoters.map((voter, idx) => (
                                        <div key={voter.id || idx} style={{
                                          width: '20px',
                                          height: '20px',
                                          borderRadius: '50%',
                                          backgroundColor: '#1f2937',
                                          border: '1.5px solid rgba(255,255,255,0.2)',
                                          marginLeft: idx > 0 ? '-8px' : '0',
                                          overflow: 'hidden',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '9px',
                                          color: 'white',
                                          fontWeight: 'bold',
                                          zIndex: topVoters.length - idx
                                        }}>
                                          {voter.avatar ? (
                                            <img src={getMediaUrl(voter.avatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                          ) : (
                                            (voter.username || 'U').charAt(0).toUpperCase()
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <span style={{ fontSize: '13px', fontWeight: '600', minWidth: '16px', textAlign: 'right', opacity: votesForOption.length > 0 ? 1 : 0.6 }}>
                                    {votesForOption.length}
                                  </span>
                                </div>
                              </div>

                              {/* Capsule Progress Bar */}
                              <div style={{ 
                                marginLeft: '34px', 
                                height: '6px', 
                                backgroundColor: 'rgba(0, 0, 0, 0.25)', 
                                borderRadius: '4px', 
                                overflow: 'hidden',
                                position: 'relative'
                              }}>
                                {votesForOption.length > 0 && (
                                  <div style={{
                                    width: `${percentage}%`,
                                    height: '100%',
                                    backgroundColor: '#25D366',
                                    borderRadius: '4px',
                                    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                                  }} />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* View Votes Footer Button */}
                      <div 
                        onClick={(e) => { e.stopPropagation(); setViewingVotesModal(msg); }}
                        style={{ 
                          borderTop: '1px solid rgba(255, 255, 255, 0.15)', 
                          marginTop: '16px', 
                          paddingTop: '12px', 
                          paddingBottom: '2px',
                          textAlign: 'center', 
                          fontSize: '14px', 
                          color: '#25d366', 
                          cursor: 'pointer', 
                          fontWeight: '600',
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        View votes
                      </div>
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

                  {msg.message_type === 'gif' && msg.metadata && (
                    <div style={{ marginTop: '4px', borderRadius: '10px', overflow: 'hidden', maxWidth: '280px', backgroundColor: 'var(--bg-secondary)' }}>
                      <img 
                        src={msg.metadata.url} 
                        alt="GIF" 
                        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '10px', maxHeight: '280px', objectFit: 'cover' }} 
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif'; }}
                      />
                    </div>
                  )}

                  {msg.message_type === 'sticker' && msg.metadata && (
                    <div style={{ marginTop: '4px', maxWidth: '160px', padding: '4px' }}>
                      <img 
                        src={msg.metadata.url} 
                        alt="Sticker" 
                        style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '160px', objectFit: 'contain' }} 
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.gif'; }}
                      />
                    </div>
                  )}

                  {msg.content && !['gif', 'sticker'].includes(msg.message_type) && <div style={{ marginTop: (msg.file || msg.message_type !== 'text') ? '5px' : '0', color: 'var(--text-primary)' }}>{renderFormattedContent(msg.content)}</div>}
                </>
              )}
              
              <div className="message-time" style={msg.message_type === 'sticker' ? { backgroundColor: 'rgba(0,0,0,0.55)', padding: '2px 7px', borderRadius: '12px', color: '#fff', marginTop: '2px', float: 'right' } : {}}>
                {msg.is_starred && <Star size={12} fill="#eab308" color="#eab308" style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />}
                {msg.is_edited && !msg.is_deleted && <span style={{ marginRight: '5px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>(edited)</span>}
                {formatTime(msg.timestamp)}
                {isOut && !isGroup && (
                  <span style={{ marginLeft: '5px', color: msg.is_read ? '#53bdeb' : (msg.message_type === 'sticker' ? '#ddd' : '#8696a0') }}>
                    {msg.is_read ? '✓✓' : '✓'}
                  </span>
                )}
              </div>
            </div>
            {msg.metadata?.reactions && Object.keys(msg.metadata.reactions).length > 0 && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap', justifyContent: isOut ? 'flex-end' : 'flex-start', width: '100%', padding: '0 8px' }}>
                {Object.entries(msg.metadata.reactions).map(([emoji, users]) => (
                  <div 
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation();
                      showAlert(`Reactions (${emoji})`, `Reacted by:\n${users.join('\n')}`);
                    }}
                    style={{
                      backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                      borderRadius: '12px', padding: '2px 8px', fontSize: '12px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                    title={`Reacted by: ${users.join(', ')}`}
                  >
                    <span>{emoji}</span>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{users.length}</span>
                  </div>
                ))}
              </div>
            )}
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
                {editingMessage ? 'Editing message' : `Replying to ${getDisplayName(replyingTo.sender)}`}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                {editingMessage ? '' : (renderFormattedContent(replyingTo.content, 14) || (replyingTo.file ? '📎 Attachment' : ''))}
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
                  <Plus size={24} strokeWidth={2.4} />
                </button>
                {showAttachmentMenu && (
                  <AttachmentMenu 
                    onClose={() => setShowAttachmentMenu(false)}
                    onFileSelect={handleFileChange}
                    onSelect={(type) => {
                      if (['poll', 'event', 'contact'].includes(type)) {
                        setActiveModal(type);
                      } else {
                        showAlert('Coming Soon', `Feature ${type} coming in next step!`);
                      }
                    }}
                  />
                )}

                <input id="hidden-photo-input" type="file" style={{ opacity: 0, position: 'absolute', width: '1px', height: '1px', zIndex: -1, pointerEvents: 'none' }} accept="image/*,video/*" onChange={handleFileChange} />
                <input id="hidden-document-input" type="file" style={{ opacity: 0, position: 'absolute', width: '1px', height: '1px', zIndex: -1, pointerEvents: 'none' }} accept="*/*" onChange={handleFileChange} />
                <input id="hidden-camera-input" type="file" style={{ opacity: 0, position: 'absolute', width: '1px', height: '1px', zIndex: -1, pointerEvents: 'none' }} accept="image/*" capture="environment" onChange={handleFileChange} />
              </div>


              
              <div style={{ position: 'relative' }}>
                <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Emojis, GIFs, Stickers" style={{ background: 'none', border: 'none', cursor: 'pointer', color: showEmojiPicker ? '#00a884' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Smile size={24} strokeWidth={2.2} />
                </button>
                {showEmojiPicker && !isMobileView && (
                  <div style={{ position: 'absolute', bottom: '50px', left: 0, zIndex: 100, width: '360px', height: '420px', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.35)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                    <MediaPicker 
                      onSelectEmoji={(emojiData) => {
                        setNewMessage(prev => prev + emojiData.emoji);
                      }}
                      onSelectGif={(gif) => {
                        handleSendSpecialMessage('gif', { url: gif.url, title: gif.title });
                        setShowEmojiPicker(false);
                      }}
                      onSelectSticker={(sticker) => {
                        handleSendSpecialMessage('sticker', { url: sticker.url, title: sticker.title });
                        setShowEmojiPicker(false);
                      }}
                      onClose={() => setShowEmojiPicker(false)}
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
                enterKeyHint="send"
                autoCapitalize="sentences"
                autoComplete="off"
                spellCheck="true"
              />
              
              {!newMessage.trim() && !selectedFile ? (
                <button type="button" onClick={startRecording} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                  <Mic size={24} strokeWidth={2.2} />
                </button>
              ) : (
                <button id="chat-send-btn" type="submit" className="send-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={20} strokeWidth={2.4} />
                </button>
              )}
            </form>
          )}
        </div>

        {showEmojiPicker && isMobileView && (
          <div style={{
            width: '100%', height: '310px', marginTop: '10px',
            borderTop: '1px solid var(--border-color)', overflow: 'hidden'
          }}>
            <MediaPicker 
              onSelectEmoji={(emojiData) => {
                setNewMessage(prev => prev + emojiData.emoji);
              }}
              onSelectGif={(gif) => {
                handleSendSpecialMessage('gif', { url: gif.url, title: gif.title });
                setShowEmojiPicker(false);
              }}
              onSelectSticker={(sticker) => {
                handleSendSpecialMessage('sticker', { url: sticker.url, title: sticker.title });
                setShowEmojiPicker(false);
              }}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}
      </div>
      )}
      {showInfo && (
        <ContactInfo 
          participant={otherParticipant} 
          group={isGroup ? chat : null} 
          currentUser={user}
          onClose={() => setShowInfo(false)} 
          onUpdateGroup={onUpdateChat}
        />
      )}

      {previewAvatarImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out' }} onClick={() => setPreviewAvatarImage(null)}>
          <img src={previewAvatarImage} alt="Avatar Preview" style={{ width: '90%', height: 'auto', maxWidth: '400px', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: '20px', right: '30px', color: 'white', cursor: 'pointer' }}><X size={32} /></div>
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

      {viewingVotesModal && (
        <PollVotesModal 
          poll={viewingVotesModal} 
          onClose={() => setViewingVotesModal(null)} 
          user={user} 
        />
      )}

      {imagePreviewFile && (
        <ImagePreviewEditor
          file={imagePreviewFile}
          onSend={handleImageEditorSend}
          onCancel={() => setImagePreviewFile(null)}
        />
      )}

      {viewingStatusPreview && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 12000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setViewingStatusPreview(null)}
        >
          <div 
            style={{ position: 'relative', width: '360px', maxWidth: '90vw', height: '600px', maxHeight: '85vh', backgroundColor: viewingStatusPreview.bg_color || '#0b141a', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setViewingStatusPreview(null)} 
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
            >
              <X size={20} />
            </button>

            <div style={{ position: 'absolute', top: '15px', left: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', zIndex: 10 }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                ⭕ Status • {viewingStatusPreview.author || 'Story'}
              </div>
            </div>

            {viewingStatusPreview.file_url ? (
              <img 
                src={getMediaUrl(viewingStatusPreview.file_url)} 
                alt="Status Story" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
              />
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: 'white', fontSize: '22px', fontWeight: 'bold', wordBreak: 'break-word', lineHeight: '1.4' }}>
                {viewingStatusPreview.story_content}
              </div>
            )}

            {viewingStatusPreview.file_url && viewingStatusPreview.story_content && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '15px 20px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '14px', textAlign: 'center' }}>
                {viewingStatusPreview.story_content}
              </div>
            )}
          </div>
        </div>
      )}

      {showBulkDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowBulkDeleteModal(false)}>
          <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '16px', padding: '24px', width: '340px', maxWidth: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.4)', border: '1px solid var(--border-color)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '17px' }}>
              Delete {selectedMessages.length} message{selectedMessages.length > 1 ? 's' : ''}?
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              {canBulkDeleteForEveryone() 
                ? 'All selected messages are within 30 minutes. You can delete for everyone or just for yourself.'
                : 'Some messages are older than 30 minutes or sent by others. You can only delete for yourself.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {canBulkDeleteForEveryone() && (
                <button
                  onClick={handleBulkDeleteForEveryone}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '24px', border: 'none',
                    backgroundColor: '#ef4444', color: 'white', fontWeight: '600',
                    fontSize: '14px', cursor: 'pointer', transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Delete for everyone
                </button>
              )}
              <button
                onClick={handleBulkDeleteForMe}
                style={{
                  width: '100%', padding: '10px', borderRadius: '24px',
                  border: '1px solid var(--border-color)', backgroundColor: 'transparent',
                  color: 'var(--text-primary)', fontWeight: '500', fontSize: '14px',
                  cursor: 'pointer', transition: 'background-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Delete for me
              </button>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                style={{
                  width: '100%', padding: '10px', borderRadius: '24px',
                  border: 'none', backgroundColor: 'transparent',
                  color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {disappearingModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            width: '380px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px',
            padding: '24px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            color: 'var(--text-primary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Clock size={24} color="#00a884" />
              <h3 style={{ margin: 0, fontSize: '18px' }}>Disappearing Messages</h3>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
              For more privacy and storage, all new messages in this chat will disappear after the selected duration.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: '24 Hours', duration: 86400 },
                { label: '7 Days', duration: 604800 },
                { label: '30 Days', duration: 2592000 },
                { label: 'Off', duration: 0 }
              ].map(opt => (
                <button
                  key={opt.duration}
                  onClick={() => handleSetDisappearing(opt.duration)}
                  style={{
                    padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)',
                    backgroundColor: (chat.disappearing_duration || 0) === opt.duration ? '#00a884' : 'var(--bg-primary)',
                    color: (chat.disappearing_duration || 0) === opt.duration ? 'white' : 'var(--text-primary)',
                    fontWeight: '600', cursor: 'pointer', textAlign: 'left', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between'
                  }}
                >
                  <span>{opt.label}</span>
                  {(chat.disappearing_duration || 0) === opt.duration && <span>✓</span>}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={() => setDisappearingModal(false)}
                style={{ padding: '8px 20px', borderRadius: '20px', border: 'none', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <StarredMessagesModal isOpen={showStarredModal} onClose={() => setShowStarredModal(false)} />
      <ScheduleMessageModal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} chat={chat} isGroup={isGroup} onScheduled={() => showToast('Message scheduled successfully! 🕒')} />
      <DocumentPreviewModal fileUrl={viewingDocumentModal?.url} fileName={viewingDocumentModal?.name} onClose={() => setViewingDocumentModal(null)} />
      <DocumentPreviewModal file={pendingPreSendDocument} onClose={() => setPendingPreSendDocument(null)} onSend={handleDocumentPreSend} />
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
  const { getDisplayName } = useContacts();
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
            const displayName = getDisplayName(other);
            const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => {
                if (selectedChats.includes(c.id)) setSelectedChats(selectedChats.filter(id => id !== c.id));
                else setSelectedChats([...selectedChats, c.id]);
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#2764FF', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold' }}>
                    {initial}
                  </div>
                  <span>{displayName}</span>
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

function PollVotesModal({ poll, onClose, user }) {
  const { getDisplayName } = useContacts();

  if (!poll || !poll.metadata || !poll.metadata.options) return null;

  const totalVotes = poll.poll_votes ? poll.poll_votes.length : 0;

  return (
    <>
      <div 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 1000, backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        backgroundColor: 'var(--bg-primary, #111b21)', borderRadius: '16px', padding: '24px',
        width: '440px', maxWidth: '92%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', zIndex: 1001,
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)', color: 'var(--text-primary, #e9edef)', border: '1px solid var(--border-color, rgba(255,255,255,0.1))'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>Poll details</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary, #8696a0)' }}>{poll.metadata.question}</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={22} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '6px' }}>
          {poll.metadata.options.map(opt => {
            const votesForOption = poll.poll_votes ? poll.poll_votes.filter(v => v.option_id === String(opt.id)) : [];
            const percentage = totalVotes > 0 ? Math.round((votesForOption.length / totalVotes) * 100) : 0;

            return (
              <div key={opt.id} style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{opt.text}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary-color, #25D366)' }}>
                    {votesForOption.length} {votesForOption.length === 1 ? 'vote' : 'votes'} ({percentage}%)
                  </span>
                </div>
                
                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-secondary, rgba(255,255,255,0.1))', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: '#25D366', transition: 'width 0.4s' }} />
                </div>

                {votesForOption.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '6px' }}>
                    {votesForOption.map((v, idx) => {
                      const voter = v.user || {};
                      const displayName = voter.username ? (voter.id === user?.id ? 'You' : getDisplayName(voter)) : `User #${v.user_id}`;
                      const avatarUrl = voter.avatar ? getMediaUrl(voter.avatar) : null;
                      
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', overflow: 'hidden', flexShrink: 0 }}>
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              (displayName || 'U').charAt(0).toUpperCase()
                            )}
                          </div>
                          <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: voter.id === user?.id ? '600' : '400' }}>
                            {displayName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary, #8696a0)', fontStyle: 'italic', paddingLeft: '6px' }}>
                    No votes yet
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))', paddingTop: '16px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <span>Total votes: <strong>{totalVotes}</strong></span>
          <button type="button" onClick={onClose} style={{ padding: '8px 20px', backgroundColor: 'var(--primary-color, #25D366)', color: '#111b21', borderRadius: '24px', fontWeight: '700', border: 'none', cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}

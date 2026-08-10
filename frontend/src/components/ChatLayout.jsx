import { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import CallHistorySidebar from './CallHistorySidebar';
import StatusSidebar from './StatusSidebar';
import ChatWindow from './ChatWindow';
import ProfileSettings from './ProfileSettings';
import CallOverlay from './CallOverlay';
import CreateGroupModal from './CreateGroupModal';
import api, { getWebSocketUrl } from '../api';
import { useContacts } from '../contexts/ContactsContext';
import { useAlert } from '../contexts/AlertContext';
import { MessageCircle, PhoneCall, CircleDot, Users, Star, Settings } from 'lucide-react';
import { playMessageNotificationSound, startCallRingtone, stopCallRingtone } from '../utils/soundEffects';

function ChatLayout({ user, setUser, onLogout, onRequestAppLock }) {
  const { getDisplayName } = useContacts();
  const { showAlert } = useAlert();
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [unviewedStatusCount, setUnviewedStatusCount] = useState(0);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // Global WebRTC State
  const [callState, _setCallState] = useState(null);
  const [isVideoCall, _setIsVideoCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [activeCallChat, _setActiveCallChat] = useState(null);
  
  const peerConnectionRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);
  const globalWsRef = useRef(null);
  
  const callRoleRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const callLoggedRef = useRef(false);

  const callStateRef = useRef(null);
  const isVideoCallRef = useRef(false);
  const activeCallChatRef = useRef(null);

  const setCallState = (val) => { callStateRef.current = val; _setCallState(val); };
  const setIsVideoCall = (val) => { isVideoCallRef.current = val; _setIsVideoCall(val); };
  const setActiveCallChat = (val) => { activeCallChatRef.current = val; _setActiveCallChat(val); };

  const logCall = async (status, duration, chat = null, role = null, isVideo = null) => {
    const activeChat = chat || activeCallChatRef.current || activeCallChat;
    const activeRole = role || callRoleRef.current;
    const video = isVideo !== null ? isVideo : (isVideoCallRef.current || isVideoCall);

    if (!activeChat || activeRole !== 'caller' || callLoggedRef.current) return;
    callLoggedRef.current = true;
    
    const targetParticipant = activeChat.participants.find(p => p.id !== user.id);
    if (!targetParticipant) return;
    
    try {
      const payload = {
        receiver_id: targetParticipant.id,
        caller_id: user.id,
        is_video: video,
        status: status,
        duration: duration
      };
      await api.post('chat/calls/', payload);
    } catch (err) {
      console.error('Failed to log call', err);
      callLoggedRef.current = false; // reset lock on network failure
    }
  };

  const fetchChats = async () => {
    try {
      const [convRes, groupRes, statusRes] = await Promise.all([
        api.get('chat/conversations/'),
        api.get('chat/groups/'),
        api.get('chat/statuses/').catch(() => ({ data: [] }))
      ]);
      setConversations(convRes.data.map(c => ({ ...c, isGroup: false })));
      setGroups(groupRes.data.map(g => ({ ...g, isGroup: true })));

      const statuses = statusRes.data || [];
      const currentUser = userRef.current || user;
      const othersUnviewed = statuses.filter(s => {
        const isMe = (s.user?.id != null && currentUser?.id != null && String(s.user.id) === String(currentUser.id)) ||
                     (s.user?.username && currentUser?.username && String(s.user.username).trim().toLowerCase() === String(currentUser.username).trim().toLowerCase());
        return !isMe && !s.is_viewed;
      });
      setUnviewedStatusCount(othersUnviewed.length);
    } catch (err) {
      console.error('Failed to fetch chats', err);
    }
  };

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 5000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const ws = new WebSocket(getWebSocketUrl(`/ws/global/${user.id}/`));
    globalWsRef.current = ws;

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'call_offer') {
        callLoggedRef.current = false;
        iceCandidateQueueRef.current = [];
        setIncomingOffer(data.sdp);
        setIsVideoCall(data.isVideo);
        setActiveCallChat(data.chat);
        setCallState('incoming');
        startCallRingtone();
      } else if (data.type === 'call_answer') {
        stopCallRingtone();
        if (peerConnectionRef.current) {
          peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(() => {
            iceCandidateQueueRef.current.forEach(c => peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(c)));
            iceCandidateQueueRef.current = [];
            setCallState('connected');
            callStartTimeRef.current = Date.now();
          });
        }
      } else if (data.type === 'profile_update') {
        const updateParticipants = (chat) => {
          if (chat.participants.some(p => p.id === data.user_id)) {
            return {
              ...chat,
              participants: chat.participants.map(p => 
                p.id === data.user_id ? { ...p, avatar: data.avatar, about: data.about, username: data.username } : p
              )
            };
          }
          return chat;
        };
        setConversations(prev => prev.map(updateParticipants));
        setGroups(prev => prev.map(updateParticipants));
        setActiveChat(prev => prev ? updateParticipants(prev) : prev);
      } else if (data.type === 'ice_candidate') {
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          iceCandidateQueueRef.current.push(data.candidate);
        }
      } else if (data.type === 'call_end' || data.type === 'call_reject') {
        const currentChat = activeCallChatRef.current;
        const currentRole = callRoleRef.current;
        const currentState = callStateRef.current;
        const currentVideo = isVideoCallRef.current;

        let finalStatus = data.type === 'call_reject' ? 'rejected' : 'completed';
        if (currentState === 'calling' && data.type === 'call_end') finalStatus = 'missed';
        
        let duration = 0;
        if (callStartTimeRef.current) {
           duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        }
        
        if (currentChat && currentRole) {
           logCall(finalStatus, duration, currentChat, currentRole, currentVideo);
        }

        if (peerConnectionRef.current) peerConnectionRef.current.close();
        peerConnectionRef.current = null;
        if (localStream) localStream.getTracks().forEach(t => t.stop());
        stopCallRingtone();
        setLocalStream(null);
        setRemoteStream(null);
        setCallState(null);
        setIncomingOffer(null);
        setActiveCallChat(null);
        callRoleRef.current = null;
        callStartTimeRef.current = null;
      } else if (data.type === 'chat_message' || data.type === 'new_message') {
        const msg = data.message;
        if (msg) {
          const senderUsername = msg.sender?.username || msg.sender;
          const senderId = msg.sender?.id || msg.sender;
          const isFromMe = senderId === user.id || senderUsername === user.username;
          if (!isFromMe) {
            playMessageNotificationSound();
          }
        }
      }
    };

    return () => ws.close();
  }, [user]);

  const setupPeerConnection = (targetUserId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    });


    pc.onicecandidate = (e) => {
      if (e.candidate && globalWsRef.current?.readyState === 1) {
        globalWsRef.current.send(JSON.stringify({ 
          type: 'ice_candidate', candidate: e.candidate, target_user: targetUserId 
        }));
      }
    };
    pc.ontrack = (e) => {
      setRemoteStream(prevStream => {
        if (prevStream) {
          // If we already have a stream, add the new track to it
          const tracks = prevStream.getTracks();
          if (!tracks.find(t => t.id === e.track.id)) {
            return new MediaStream([...tracks, e.track]);
          }
          return prevStream;
        }
        // First track arrives, create a new stream
        return new MediaStream([e.track]);
      });
      setCallState('connected');
      if (!callStartTimeRef.current) callStartTimeRef.current = Date.now();
    };
    peerConnectionRef.current = pc;
    return pc;
  };

  const startGlobalCall = async (chat, video = true) => {
    const isGroup = chat.isGroup;
    const targetParticipant = chat.participants.find(p => p.id !== user.id);
    if (isGroup || !targetParticipant) {
      return;
    }
    const targetUserId = targetParticipant.id;

    setIsVideoCall(video);
    setCallState('calling');
    setActiveCallChat(chat);
    callRoleRef.current = 'caller';
    callStartTimeRef.current = null;
    callLoggedRef.current = false;

    try {
      let stream;
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Not supported');
        stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
      } catch (err) {
        console.warn('Camera/mic unavailable, using mock stream for testing', err);
        const canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 480;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#111b21';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00a884';
        ctx.font = '30px Arial';
        ctx.fillText('Mock Video Stream', 180, 240);
        setInterval(() => {
           ctx.fillStyle = '#111b21';
           ctx.fillRect(0, 0, canvas.width, canvas.height);
           ctx.fillStyle = '#00a884';
           ctx.fillText('Mock Video Stream', 180, 240);
           ctx.beginPath();
           ctx.arc((Date.now() / 10) % canvas.width, 300, 20, 0, 2 * Math.PI);
           ctx.fill();
        }, 100);
        stream = canvas.captureStream(30);
        
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          audioCtx.resume();
          const dest = audioCtx.createMediaStreamDestination();
          const osc = audioCtx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, audioCtx.currentTime);
          osc.connect(dest);
          osc.start();
          stream.addTrack(dest.stream.getAudioTracks()[0]);
        } catch (e) {
          console.warn('Could not mock audio', e);
        }
      }
      setLocalStream(stream);
      
      const pc = setupPeerConnection(targetUserId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (globalWsRef.current?.readyState === 1) {
        globalWsRef.current.send(JSON.stringify({
          type: 'call_offer', sdp: offer, isVideo: video, target_user: targetUserId, chat: chat
        }));
      }
    } catch (err) {
      console.error(err);
      setCallState(null);
      setActiveCallChat(null);
      showAlert('Device Error', 'Could not access microphone/camera.');
    }
  };

  const acceptCall = async () => {
    stopCallRingtone();
    setCallState('connecting');
    callRoleRef.current = 'receiver';
    callStartTimeRef.current = null;
    const targetUserId = activeCallChat.participants.find(p => p.id !== user.id).id;
    try {
      let stream;
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Not supported');
        stream = await navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true });
      } catch (err) {
        console.warn('Camera/mic unavailable, using mock stream for testing', err);
        const canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 480;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#111b21';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00a884';
        ctx.font = '30px Arial';
        ctx.fillText('Mock Video Stream', 180, 240);
        setInterval(() => {
           ctx.fillStyle = '#111b21';
           ctx.fillRect(0, 0, canvas.width, canvas.height);
           ctx.fillStyle = '#00a884';
           ctx.fillText('Mock Video Stream', 180, 240);
           ctx.beginPath();
           ctx.arc((Date.now() / 10) % canvas.width, 300, 20, 0, 2 * Math.PI);
           ctx.fill();
        }, 100);
        stream = canvas.captureStream(30);
        
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          audioCtx.resume();
          const dest = audioCtx.createMediaStreamDestination();
          const osc = audioCtx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, audioCtx.currentTime);
          osc.connect(dest);
          osc.start();
          stream.addTrack(dest.stream.getAudioTracks()[0]);
        } catch (e) {
          console.warn('Could not mock audio', e);
        }
      }
      setLocalStream(stream);
      
      const pc = setupPeerConnection(targetUserId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      iceCandidateQueueRef.current.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)));
      iceCandidateQueueRef.current = [];
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (globalWsRef.current?.readyState === 1) {
        globalWsRef.current.send(JSON.stringify({
          type: 'call_answer', sdp: answer, target_user: targetUserId
        }));
      }
      setCallState('connected');
    } catch (err) {
      console.error(err);
      endCall(true);
    }
  };

  const endCall = (broadcast = true) => {
    stopCallRingtone();
    const currentChat = activeCallChatRef.current || activeCallChat;
    const currentRole = callRoleRef.current;
    const currentState = callStateRef.current || callState;
    const currentVideo = isVideoCallRef.current !== undefined ? isVideoCallRef.current : isVideoCall;

    if (currentChat && currentRole) {
       let duration = 0;
       if (callStartTimeRef.current) {
          duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
       }
       let status = currentState === 'calling' ? 'missed' : (currentState === 'incoming' ? 'rejected' : 'completed');
       logCall(status, duration, currentChat, currentRole, currentVideo);
    }

    if (broadcast && currentChat && globalWsRef.current?.readyState === 1) {
      const targetUserId = currentChat.participants.find(p => p.id !== user.id)?.id;
      if (targetUserId) {
        globalWsRef.current.send(JSON.stringify({
          type: currentState === 'incoming' ? 'call_reject' : 'call_end', target_user: targetUserId
        }));
      }
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setCallState(null);
    setIncomingOffer(null);
    setActiveCallChat(null);
    callRoleRef.current = null;
    callStartTimeRef.current = null;
  };

  const handleUpdateChat = (updatedChat) => {
    if (updatedChat.isGroup) {
      setGroups(prev => prev.map(g => g.id === updatedChat.id ? updatedChat : g));
    } else {
      setConversations(prev => prev.map(c => c.id === updatedChat.id ? updatedChat : c));
    }
    setActiveChat(updatedChat);
  };

  const createGroup = () => {
    setShowCreateGroup(true);
  };

  const handleGroupCreated = async (newGroup) => {
    await fetchChats();
    setActiveChat({ ...newGroup, isGroup: true });
    setShowCreateGroup(false);
  };

  const handleTabChange = (tab) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
      setActiveChat(null);
    }
  };

  return (
    <div className="app-container">
      <div className={`left-nav ${activeChat ? 'mobile-hidden' : ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className={`nav-icon ${activeTab === 'all' ? 'active' : ''}`} title="Chats" onClick={() => handleTabChange('all')} style={{ cursor: 'pointer' }}>
            <MessageCircle size={24} strokeWidth={2.2} />
          </div>
          <div className={`nav-icon ${activeTab === 'calls' ? 'active' : ''}`} title="Calls" style={{ marginTop: '10px', cursor: 'pointer' }} onClick={() => handleTabChange('calls')}>
            <PhoneCall size={24} strokeWidth={2.2} />
          </div>
          <div className={`nav-icon ${activeTab === 'status' ? 'active' : ''}`} title="Status / Stories" style={{ marginTop: '10px', cursor: 'pointer', position: 'relative' }} onClick={() => handleTabChange('status')}>
            <CircleDot size={24} strokeWidth={2.2} />
            {unviewedStatusCount > 0 && (
              <div style={{
                position: 'absolute', top: '-4px', right: '-4px',
                backgroundColor: '#00a884', color: 'white',
                borderRadius: '12px', padding: '2px 6px',
                fontSize: '11px', fontWeight: '800',
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                border: '2px solid var(--bg-primary, #111b21)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: '18px', height: '18px', lineHeight: 1
              }}>
                {unviewedStatusCount > 99 ? '99+' : unviewedStatusCount}
              </div>
            )}
          </div>
          <div className={`nav-icon ${activeTab === 'groups' ? 'active' : ''}`} title="Groups" onClick={() => handleTabChange('groups')} style={{ cursor: 'pointer', marginTop: '10px' }}>
            <Users size={24} strokeWidth={2.2} />
          </div>
          <div className={`nav-icon ${activeTab === 'favourites' ? 'active' : ''}`} title="Favourites" onClick={() => handleTabChange('favourites')} style={{ cursor: 'pointer', marginTop: '10px' }}>
            <Star size={24} strokeWidth={2.2} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '10px' }}>
          <div className="nav-icon" title="Settings" onClick={() => setShowProfile(true)} style={{ cursor: 'pointer' }}>
            <Settings size={24} strokeWidth={2.2} />
          </div>
        </div>
      </div>

      {activeTab === 'calls' ? (
        <CallHistorySidebar 
          user={user} 
          onSelectChat={(chat) => { setActiveChat(chat); setActiveTab('all'); }} 
          onLogout={onLogout} 
          onRequestAppLock={onRequestAppLock} 
          className={activeChat ? 'mobile-hidden' : ''}
        />
      ) : activeTab === 'status' ? (
        <StatusSidebar 
          user={user} 
          onSelectChat={setActiveChat} 
          onLogout={onLogout} 
          onRequestAppLock={onRequestAppLock} 
          onUnviewedCountChange={setUnviewedStatusCount}
          className={activeChat ? 'mobile-hidden' : ''}
        />
      ) : (
        <Sidebar 
          user={user} 
          onLogout={onLogout} 
          conversations={activeTab === 'all' || activeTab === 'favourites' ? conversations : []} 
          groups={activeTab === 'groups' || activeTab === 'all' || activeTab === 'favourites' ? groups : []}
          activeChat={activeChat}
          onSelectChat={setActiveChat}
          refreshChats={fetchChats}
          onRequestAppLock={onRequestAppLock}
          onCreateGroup={createGroup}
          activeTab={activeTab}
          className={activeChat ? 'mobile-hidden' : ''}
        />
      )}
      
      {activeTab === 'status' ? (
        <div className="empty-chat mobile-hidden" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ width: '88px', height: '88px', borderRadius: '50%', backgroundColor: 'rgba(0, 168, 132, 0.1)', border: '1px solid rgba(0, 168, 132, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: '#00a884', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)' }}>
            <CircleDot size={48} strokeWidth={1.8} />
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: '300', color: 'var(--text-primary)', marginBottom: '12px', letterSpacing: '-0.3px' }}>Status Updates</h2>
          <p style={{ maxWidth: '420px', textAlign: 'center', lineHeight: '1.6', fontSize: '15px', color: 'var(--text-secondary)' }}>
            Click on a contact on the left to view their status stories or create your own photo, video, and text updates to share with your friends.
          </p>
        </div>
      ) : activeChat ? (
        <ChatWindow 
          user={user} 
          chat={activeChat} 
          onUpdateChat={handleUpdateChat}
          onLogout={onLogout}
          onStartCall={startGlobalCall}
          conversations={conversations}
          groups={groups}
          onCloseChat={() => setActiveChat(null)}
          className={!activeChat ? 'mobile-hidden' : ''}
        />
      ) : (
        <div className="empty-chat mobile-hidden">
          <svg className="empty-chat-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 5.58 2 10c0 1.95.87 3.76 2.37 5.16L3 20l4.3-2.15c1.4.67 3 .95 4.7.95 5.52 0 10-3.58 10-8s-4.48-8-10-8zm-2 11H8V9h2v4zm6 0h-2V9h2v4z"/>
          </svg>
          <h2>Welcome, {user?.username}</h2>
          <p>Select a user from the left to start chatting.</p>
        </div>
      )}
      {showProfile && <ProfileSettings user={user} setUser={setUser} onClose={() => setShowProfile(false)} onRequestAppLock={onRequestAppLock} onLogout={onLogout} />}
      {showCreateGroup && (
        <CreateGroupModal 
          onClose={() => setShowCreateGroup(false)} 
          onSuccess={handleGroupCreated} 
        />
      )}
      
      {callState && activeCallChat && (
        <CallOverlay 
          user={user}
          chatName={activeCallChat.isGroup ? activeCallChat.name : getDisplayName(activeCallChat.participants.find(p => p.id !== user.id))}
          callState={callState}
          isVideo={isVideoCall}
          isIncoming={callState === 'incoming'}
          onAccept={acceptCall}
          onDecline={() => endCall(true)}
          onEnd={() => endCall(true)}
          localStream={localStream}
          remoteStream={remoteStream}
        />
      )}
    </div>
  );
}

export default ChatLayout;

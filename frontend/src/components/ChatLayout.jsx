import { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import CallHistorySidebar from './CallHistorySidebar';
import ChatWindow from './ChatWindow';
import ProfileSettings from './ProfileSettings';
import CallOverlay from './CallOverlay';
import CreateGroupModal from './CreateGroupModal';
import api from '../api';

function ChatLayout({ user, setUser, onLogout, onRequestAppLock }) {
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Global WebRTC State
  const [callState, setCallState] = useState(null);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [activeCallChat, setActiveCallChat] = useState(null);
  
  const peerConnectionRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);
  const globalWsRef = useRef(null);
  
  const callRoleRef = useRef(null);
  const callStartTimeRef = useRef(null);

  const logCall = async (status, duration) => {
    if (callRoleRef.current !== 'caller' || !activeCallChat) return;
    
    const targetParticipant = activeCallChat.participants.find(p => p.id !== user.id);
    if (!targetParticipant) return;
    
    try {
      await api.post('chat/calls/', {
        receiver_id: targetParticipant.id,
        is_video: isVideoCall,
        status: status,
        duration: duration
      });
    } catch (err) {
      console.error('Failed to log call', err);
    }
  };

  const fetchChats = async () => {
    try {
      const [convRes, groupRes] = await Promise.all([
        api.get('chat/conversations/'),
        api.get('chat/groups/')
      ]);
      setConversations(convRes.data.map(c => ({ ...c, isGroup: false })));
      setGroups(groupRes.data.map(g => ({ ...g, isGroup: true })));
    } catch (err) {
      console.error('Failed to fetch chats', err);
    }
  };

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws/global/${user.id}/`);
    globalWsRef.current = ws;

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'call_offer') {
        iceCandidateQueueRef.current = [];
        setIncomingOffer(data.sdp);
        setIsVideoCall(data.isVideo);
        setActiveCallChat(data.chat);
        setCallState('incoming');
      } else if (data.type === 'call_answer') {
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
        let finalStatus = data.type === 'call_reject' ? 'rejected' : 'completed';
        if (callState === 'calling' && data.type === 'call_end') finalStatus = 'missed';
        
        let duration = 0;
        if (callStartTimeRef.current) {
           duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        }
        
        // Log if we are the caller
        if (callRoleRef.current === 'caller' && activeCallChat) {
           // wait, we can't await inside onmessage easily without making it an async function, 
           // but it is an async callback, so we can just fire and forget.
           logCall(finalStatus, duration);
        }

        if (peerConnectionRef.current) peerConnectionRef.current.close();
        peerConnectionRef.current = null;
        if (localStream) localStream.getTracks().forEach(t => t.stop());
        setLocalStream(null);
        setRemoteStream(null);
        setCallState(null);
        setIncomingOffer(null);
        setActiveCallChat(null);
        callRoleRef.current = null;
        callStartTimeRef.current = null;
      }
    };

    return () => ws.close();
  }, [user]);

  const setupPeerConnection = (targetUserId) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
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
      alert('Could not access microphone/camera.');
    }
  };

  const acceptCall = async () => {
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
    if (broadcast && activeCallChat && globalWsRef.current?.readyState === 1) {
      const targetUserId = activeCallChat.participants.find(p => p.id !== user.id).id;
      globalWsRef.current.send(JSON.stringify({
        type: callState === 'incoming' ? 'call_reject' : 'call_end', target_user: targetUserId
      }));
      
      // If we are the caller and we hang up
      if (callRoleRef.current === 'caller') {
         let duration = 0;
         if (callStartTimeRef.current) {
            duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
         }
         let status = callState === 'calling' ? 'missed' : 'completed';
         logCall(status, duration);
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

  return (
    <div className="app-container">
      <div className={`left-nav ${activeChat ? 'mobile-hidden' : ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className={`nav-icon ${activeTab === 'all' ? 'active' : ''}`} title="Chats" onClick={() => setActiveTab('all')} style={{ cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.477 2 2 6.14 2 11.25c0 2.87 1.455 5.432 3.738 7.106L5 22l3.415-1.95A10.63 10.63 0 0012 20.5c5.523 0 10-4.14 10-9.25S17.523 2 12 2z"></path></svg>
          </div>
          <div className={`nav-icon ${activeTab === 'calls' ? 'active' : ''}`} title="Calls" style={{ marginTop: '10px', cursor: 'pointer' }} onClick={() => setActiveTab('calls')}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 1-.63 1-1.18v-3.45c0-.54-.45-.99-.99-.99z"></path></svg>
          </div>
          <div className={`nav-icon ${activeTab === 'groups' ? 'active' : ''}`} title="Groups" onClick={() => setActiveTab('groups')} style={{ cursor: 'pointer', marginTop: '10px' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"></path></svg>
          </div>
          <div className={`nav-icon ${activeTab === 'favourites' ? 'active' : ''}`} title="Favourites" onClick={() => setActiveTab('favourites')} style={{ cursor: 'pointer', marginTop: '10px' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '10px' }}>
          <div className="nav-icon" title="Settings" onClick={() => setShowProfile(true)} style={{ cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"></path></svg>
          </div>
        </div>
      </div>

      {activeTab === 'calls' ? (
        <CallHistorySidebar 
          user={user} 
          onSelectChat={setActiveChat} 
          onLogout={onLogout} 
          onRequestAppLock={onRequestAppLock} 
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
      
      {activeChat ? (
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
          chatName={activeCallChat.isGroup ? activeCallChat.name : activeCallChat.participants.find(p => p.id !== user.id)?.username}
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

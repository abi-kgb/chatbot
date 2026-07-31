import { useState, useEffect } from 'react';
import api, { getMediaUrl } from '../api';

function CallHistorySidebar({ user, onSelectChat, onLogout, onRequestAppLock }) {
  const [calls, setCalls] = useState([]);
  const [showMenu, setShowMenu] = useState(false);

  const fetchCalls = async () => {
    try {
      const res = await api.get('chat/calls/');
      setCalls(res.data);
    } catch (err) {
      console.error('Failed to fetch call history', err);
    }
  };

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(now.getDate() - 1);
    const isYesterday = date.getDate() === yesterdayDate.getDate() && date.getMonth() === yesterdayDate.getMonth() && date.getFullYear() === yesterdayDate.getFullYear();
    
    if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isYesterday) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const getCallTarget = (call) => {
    return call.caller.id === user.id ? call.receiver : call.caller;
  };

  const handleCallback = async (e, call) => {
    e.stopPropagation();
    const targetUser = getCallTarget(call);
    
    // To start a new conversation and jump to it
    try {
      const res = await api.post('chat/conversations/', { participants: [user.id, targetUser.id] });
      onSelectChat({ ...res.data, isGroup: false });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="sidebar" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Calls</span>
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ position: 'relative' }}>
            <button style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowMenu(!showMenu)}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"></path></svg>
            </button>
            {showMenu && (
              <>
                <div 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} 
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                />
                <div style={{
                  position: 'absolute', top: '40px', right: '0', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.3)', padding: '10px 0', minWidth: '220px', zIndex: 100
                }}>
                  {[
                    { label: 'Clear call log', onClick: () => { alert('Not implemented yet'); setShowMenu(false); } },
                    { label: 'App lock', onClick: onRequestAppLock },
                    { label: 'Log out', onClick: onLogout }
                  ].map((item, i) => (
                    <div 
                      key={i}
                      style={{ padding: '12px 24px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '15px' }}
                      onMouseOver={(e) => e.target.style.backgroundColor = 'var(--bg-sidebar)'}
                      onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                      onClick={() => { setShowMenu(false); item.onClick(); }}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="conversations-list" style={{ paddingTop: '10px' }}>
        {calls.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No recent calls
          </div>
        ) : (
          calls.map(call => {
            const isOutgoing = call.caller.id === user.id;
            const targetUser = isOutgoing ? call.receiver : call.caller;
            const isMissed = call.status === 'missed' || call.status === 'rejected';
            
            return (
              <div 
                key={call.id} 
                className="conversation-item"
                style={{ cursor: 'pointer' }}
                onClick={(e) => handleCallback(e, call)}
              >
                <div className="user-avatar" style={{ backgroundColor: 'var(--primary-color)' }}>
                  {targetUser.avatar ? (
                    <img src={getMediaUrl(targetUser.avatar)} alt="avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                  ) : (
                    targetUser.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="conversation-details">
                  <div className="conversation-header">
                    <span className="conversation-name" style={{ color: isMissed ? '#ef4444' : 'var(--text-primary)' }}>
                      {targetUser.username}
                    </span>
                    <span className="conversation-time">
                      {formatTime(call.timestamp)}
                    </span>
                  </div>
                  <div className="conversation-last-msg" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {isOutgoing ? (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill={isMissed ? '#ef4444' : '#10b981'} style={{ transform: 'rotate(45deg)' }}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill={isMissed ? '#ef4444' : '#10b981'} style={{ transform: 'rotate(-135deg)' }}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path></svg>
                    )}
                    <span>
                      {call.status === 'completed' ? `Duration: ${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : call.status}
                    </span>
                  </div>
                </div>
                <div style={{ marginLeft: '10px', color: 'var(--primary-color)', padding: '10px' }} title="Call back">
                   {call.is_video ? (
                     <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"></path></svg>
                   ) : (
                     <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 1-.63 1-1.18v-3.45c0-.54-.45-.99-.99-.99z"></path></svg>
                   )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default CallHistorySidebar;

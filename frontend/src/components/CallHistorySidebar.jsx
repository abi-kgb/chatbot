import { useState, useEffect } from 'react';
import api, { getMediaUrl } from '../api';
import { useContacts } from '../contexts/ContactsContext';
import { MoreVertical, ArrowUpRight, ArrowDownLeft, Video, Phone } from 'lucide-react';

function CallHistorySidebar({ user, onSelectChat, onLogout, onRequestAppLock, className = '' }) {
  const { getDisplayName } = useContacts();
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
    <div className={`sidebar ${className}`} style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Calls</span>
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ position: 'relative' }}>
            <button style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setShowMenu(!showMenu)}>
              <MoreVertical size={22} strokeWidth={2.3} />
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
                    (getDisplayName(targetUser) || '?').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="conversation-details">
                  <div className="conversation-header">
                    <span className="conversation-name" style={{ color: isMissed ? '#ef4444' : 'var(--text-primary)' }}>
                      {getDisplayName(targetUser)}
                    </span>
                    <span className="conversation-time">
                      {formatTime(call.timestamp)}
                    </span>
                  </div>
                  <div className="conversation-last-msg" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {isOutgoing ? (
                      <ArrowUpRight size={17} color={isMissed ? '#ef4444' : '#10b981'} strokeWidth={2.4} />
                    ) : (
                      <ArrowDownLeft size={17} color={isMissed ? '#ef4444' : '#10b981'} strokeWidth={2.4} />
                    )}
                    <span>
                      {call.status === 'completed' ? `Duration: ${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : call.status}
                    </span>
                  </div>
                </div>
                <div style={{ marginLeft: '10px', color: 'var(--primary-color)', padding: '10px', display: 'flex', alignItems: 'center' }} title="Call back">
                   {call.is_video ? (
                     <Video size={20} strokeWidth={2.3} />
                   ) : (
                     <Phone size={19} strokeWidth={2.3} />
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

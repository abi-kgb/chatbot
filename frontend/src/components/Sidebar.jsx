import { useState, useMemo } from 'react';
import api, { getMediaUrl } from '../api';
import { useContacts } from '../contexts/ContactsContext';
import { useAlert } from '../contexts/AlertContext';
import { Video, Phone, ArrowLeft, CheckCheck, Trash2, MoreVertical, Search, Pin, Star, BellOff, ChevronDown, Archive } from 'lucide-react';

function Sidebar({ user, onLogout, conversations, groups, activeChat, onSelectChat, refreshChats, onRequestAppLock, onCreateGroup, activeTab, className = '' }) {
  const { getDisplayName } = useContacts();
  const { showAlert, showConfirm } = useAlert();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState([]);
  
  const [hoveredChatId, setHoveredChatId] = useState(null);
  const [dropdownPos, setDropdownPos] = useState(null); // { x, y, chat }
  const [showArchived, setShowArchived] = useState(false);

  const renderFormattedContent = (content, size = 14) => {
    if (!content) return null;
    if (content.includes('Voice call') || content.includes('Video call')) {
      const isVideo = content.includes('Video call');
      const isMissed = content.includes('Missed');
      const iconColor = isMissed ? '#ef4444' : '#00a884';
      const cleanText = content.replace(/^[📞📹]\s*/, '').trim();

      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle' }}>
          {isVideo ? (
            <Video size={size} color={iconColor} style={{ flexShrink: 0 }} strokeWidth={2.2} />
          ) : (
            <Phone size={size} color={iconColor} style={{ flexShrink: 0 }} strokeWidth={2.2} />
          )}
          <span>{cleanText}</span>
        </span>
      );
    }
    return content;
  };

  const getOtherParticipant = (participants) => {
    if (!participants || !Array.isArray(participants)) return null;
    return participants.find(p => p.id !== user?.id) || participants[0];
  };

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

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length > 0) {
      setIsSearching(true);
      try {
        const res = await api.get(`users/search/?q=${q}`);
        setSearchResults(res.data.filter(u => u.id !== user.id));
      } catch (err) {
        console.error(err);
      }
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const startConversation = async (otherUserId) => {
    try {
      const res = await api.post('chat/conversations/', { participants: [user.id, otherUserId] });
      await refreshChats();
      onSelectChat({ ...res.data, isGroup: false });
      setSearchQuery('');
      setIsSearching(false);
    } catch (err) {
      console.error(err);
    }
  };


  const allChats = useMemo(() => {
    let combined = [...conversations, ...groups].filter(c => showArchived ? c.is_archived : !c.is_archived);
    if (activeTab === 'favourites') {
        combined = combined.filter(c => c.is_favourite);
    }
    return combined.sort((a, b) => {
      // Pinned chats first
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      
      const timeA = a.last_message?.timestamp ? new Date(a.last_message.timestamp).getTime() : new Date(a.created_at).getTime();
      const timeB = b.last_message?.timestamp ? new Date(b.last_message.timestamp).getTime() : new Date(b.created_at).getTime();
      return timeB - timeA;
    });
  }, [conversations, groups, activeTab]);

  const handleMarkAllAsRead = async () => {
    const unreadChats = allChats.filter(c => (c.unread_count || 0) > 0);
    if (unreadChats.length === 0) {
      setShowMenu(false);
      return;
    }
    
    try {
      await Promise.all(unreadChats.map(chat => {
        const endpoint = chat.isGroup ? `chat/groups/${chat.id}/read/` : `chat/conversations/${chat.id}/read/`;
        return api.post(endpoint);
      }));
      await refreshChats();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
    setShowMenu(false);
  };

  const handleBulkDelete = async () => {
    const confirmed = await showConfirm('Delete Chats', `Are you sure you want to delete ${selectedChats.length} selected chats?`, 'Delete');
    if (!confirmed) return;
    try {
      await Promise.all(selectedChats.map(chat => {
        const endpoint = chat.isGroup ? `chat/groups/${chat.id}/` : `chat/conversations/${chat.id}/`;
        return api.delete(endpoint);
      }));
      setSelectionMode(false);
      setSelectedChats([]);
      await refreshChats();
    } catch (err) {
      console.error("Failed to delete chats:", err);
      showAlert('Error', 'Some chats could not be deleted.');
    }
  };

  const handleBulkRead = async () => {
    try {
      await Promise.all(selectedChats.map(chat => {
        const endpoint = chat.isGroup ? `chat/groups/${chat.id}/read/` : `chat/conversations/${chat.id}/read/`;
        return api.post(endpoint);
      }));
      setSelectionMode(false);
      setSelectedChats([]);
      await refreshChats();
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleDeleteChat = async (chat) => {
    const action = chat.isGroup ? 'exit this group' : 'delete this chat';
    const confirmed = await showConfirm(chat.isGroup ? 'Exit Group' : 'Delete Chat', `Are you sure you want to ${action}?`, chat.isGroup ? 'Exit' : 'Delete');
    if (!confirmed) return;
    try {
      const endpoint = chat.isGroup ? `chat/groups/${chat.id}/` : `chat/conversations/${chat.id}/`;
      await api.delete(endpoint);
      await refreshChats();
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  return (
    <div className={`sidebar ${className}`}>
      {selectionMode ? (
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => { setSelectionMode(false); setSelectedChats([]); }}>
              <ArrowLeft size={22} strokeWidth={2.3} />
            </button>
            <span style={{ fontSize: '18px', color: 'var(--text-primary)' }}>{selectedChats.length} Selected</span>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={handleBulkRead} title="Mark as Read">
              <CheckCheck size={22} strokeWidth={2.3} />
            </button>
            <button style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={handleBulkDelete} title="Delete">
              <Trash2 size={22} strokeWidth={2.3} />
            </button>
          </div>
        </div>
      ) : (
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>WhatsApp</span>
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
                    onTouchEnd={(e) => { e.stopPropagation(); setShowMenu(false); }}
                  />
                  <div style={{
                    position: 'absolute', top: '40px', right: '0', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)', padding: '10px 0', minWidth: '220px', zIndex: 100
                  }}>
                    {[
                      { label: 'New group', onClick: () => { setShowMenu(false); onCreateGroup(); } },
                      { label: 'Select chats', onClick: () => { setShowMenu(false); setSelectionMode(true); } },
                      { label: 'Mark all as read', onClick: handleMarkAllAsRead },
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
      )}
      
      <div className="sidebar-search" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
            <Search size={18} strokeWidth={2.3} />
          </div>
          <input 
            type="text" 
            placeholder="Search or start a new chat" 
            value={searchQuery}
            onChange={handleSearch}
            style={{ width: '100%', padding: '8px 12px 8px 40px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>


      <div className="conversations-list">

        {(() => {
          const renderChat = (chat) => {
            const isGroup = chat.isGroup;
            const otherParticipant = getOtherParticipant(chat.participants);
            const name = isGroup ? chat.name : getDisplayName(otherParticipant);
            const unreadCount = chat.unread_count || 0;
            const isSelected = selectedChats.some(c => c.id === chat.id && c.isGroup === chat.isGroup);
            
            return (
              <div 
                key={`${isGroup ? 'group' : 'conv'}-${chat.id}`} 
                className={`conversation-item ${!selectionMode && activeChat?.id === chat.id && activeChat?.isGroup === isGroup ? 'active' : ''}`}
                style={isSelected ? { backgroundColor: 'var(--bg-secondary)' } : {}}
                onMouseEnter={() => setHoveredChatId(chat.id)}
                onMouseLeave={() => setHoveredChatId(null)}
                onClick={() => {
                  if (selectionMode) {
                    if (isSelected) {
                      setSelectedChats(prev => prev.filter(c => !(c.id === chat.id && c.isGroup === chat.isGroup)));
                    } else {
                      setSelectedChats(prev => [...prev, chat]);
                    }
                  } else {
                    onSelectChat(chat);
                    if (unreadCount > 0) {
                       const endpoint = isGroup ? `chat/groups/${chat.id}/read/` : `chat/conversations/${chat.id}/read/`;
                       api.post(endpoint).then(refreshChats);
                    }
                  }
                }}
              >
                {selectionMode && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', marginRight: '5px' }}>
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '4px', border: isSelected ? 'none' : '2px solid var(--text-secondary)',
                      backgroundColor: isSelected ? '#00a884' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isSelected && (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#111b21"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"></path></svg>
                      )}
                    </div>
                  </div>
                )}
                  <div className="user-avatar" style={{ backgroundColor: chat.isGroup ? '#f59e0b' : 'var(--primary-color)' }}>
                    {chat.isGroup ? (
                      chat.avatar ? (
                        <img src={getMediaUrl(chat.avatar)} alt="avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                      ) : (
                        chat.name?.charAt(0).toUpperCase()
                      )
                    ) : (
                      getOtherParticipant(chat.participants)?.avatar ? (
                        <img src={getMediaUrl(getOtherParticipant(chat.participants).avatar)} alt="avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                      ) : (
                        name?.charAt(0).toUpperCase()
                      )
                    )}
                  </div>
                  <div className="conversation-details">
                  <div className="conversation-header">
                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <span className="conversation-name">{name}</span>
                       {chat.is_pinned && <Pin size={14} fill="var(--text-secondary)" color="var(--text-secondary)" />}
                       {chat.is_favourite && <Star size={14} fill="var(--primary-color)" color="var(--primary-color)" />}
                       {chat.is_muted && <BellOff size={14} color="var(--text-secondary)" />}
                     </div>
                    <span className="conversation-time">
                      {formatTime(chat.last_message?.timestamp)}
                    </span>
                  </div>
                  <div className="conversation-last-msg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                      {chat.last_message ? (
                        <>
                           {chat.last_message.sender?.id === user?.id ? "You: " : (isGroup ? `${getDisplayName(chat.last_message.sender, true)}: ` : "")}
                           {renderFormattedContent(chat.last_message.content, 14)}
                        </>
                      ) : 'No messages yet'}
                    </span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {unreadCount > 0 && (
                        <span style={{ backgroundColor: 'var(--primary-color)', color: 'white', fontSize: '12px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px', minWidth: '20px', textAlign: 'center' }}>
                          {unreadCount}
                        </span>
                      )}
                      {!selectionMode && (
                        <div 
                           className={`chat-menu-arrow ${(hoveredChatId === chat.id || dropdownPos?.chat?.id === chat.id) ? 'active' : ''}`}
                           style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}
                           onClick={(e) => {
                               e.stopPropagation();
                               if (dropdownPos?.chat?.id === chat.id) {
                                 setDropdownPos(null);
                                 return;
                               }
                               const rect = e.currentTarget.getBoundingClientRect();
                               let yPos = rect.bottom;
                               if (yPos + 260 > window.innerHeight) {
                                 yPos = window.innerHeight - 260;
                               }
                               setDropdownPos({ x: rect.right - 180, y: yPos, chat });
                           }}
                        >
                           <ChevronDown size={20} strokeWidth={2.2} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          };

          if (isSearching) {
            const filteredChats = allChats.filter(chat => {
              const other = chat.isGroup ? null : getOtherParticipant(chat.participants);
              const name = chat.isGroup ? chat.name : getDisplayName(other);
              const phone = chat.isGroup ? '' : other?.phone_number;
              const term = searchQuery.toLowerCase();
              return (name && name.toLowerCase().includes(term)) || (phone && String(phone).includes(term));
            });

            return (
              <>
                {filteredChats.length > 0 && <div style={{ padding: '10px 20px', color: 'var(--primary-color)', fontSize: '14px', fontWeight: 'bold' }}>CHATS</div>}
                {filteredChats.map(renderChat)}

                {searchResults.length > 0 && <div style={{ padding: '10px 20px', color: 'var(--primary-color)', fontSize: '14px', fontWeight: 'bold' }}>CONTACTS</div>}
                {searchResults.map(u => {
                  const uDisplayName = getDisplayName(u);
                  const initial = uDisplayName ? uDisplayName.charAt(0).toUpperCase() : u.phone_number?.charAt(0) || '?';
                  return (
                    <div key={u.id} className="conversation-item" onClick={() => startConversation(u.id)}>
                      <div className="user-avatar">{initial}</div>
                      <div className="conversation-details">
                        <div className="conversation-header">
                          <span className="conversation-name">{uDisplayName}</span>
                        </div>
                        <div className="conversation-last-msg">
                          <span>{uDisplayName !== u.phone_number ? u.phone_number : ''}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            );
          } else {
            const archivedCount = [...conversations, ...groups].filter(c => c.is_archived).length;
            return (
              <>
                {showArchived ? (
                  <div className="conversation-item" style={{ padding: '15px 20px', cursor: 'pointer', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }} onClick={() => setShowArchived(false)}>
                    <div style={{ width: '44px', display: 'flex', justifyContent: 'center', color: 'var(--primary-color)' }}>
                      <ArrowLeft size={20} strokeWidth={2.2} />
                    </div>
                    <div className="conversation-details" style={{ justifyContent: 'center' }}>
                      <span className="conversation-name" style={{ color: 'var(--primary-color)' }}>Back to Chats</span>
                    </div>
                  </div>
                ) : (
                  archivedCount > 0 && (
                    <div className="conversation-item" style={{ padding: '15px 20px', cursor: 'pointer' }} onClick={() => setShowArchived(true)}>
                      <div style={{ width: '44px', display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        <Archive size={20} strokeWidth={2.2} />
                      </div>
                      <div className="conversation-details" style={{ justifyContent: 'center' }}>
                        <div className="conversation-header">
                          <span className="conversation-name">Archived</span>
                          <span className="conversation-time" style={{ color: 'var(--primary-color)' }}>{archivedCount}</span>
                        </div>
                      </div>
                    </div>
                  )
                )}
                {allChats.map(renderChat)}
              </>
            );
          }
        })()}
      </div>
      
      {dropdownPos && (
        <>
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }} 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDropdownPos(null); }}
            onTouchStart={(e) => { e.stopPropagation(); setDropdownPos(null); }}
            onTouchEnd={(e) => { e.stopPropagation(); setDropdownPos(null); }}
          />
          <div style={{
            position: 'fixed', left: dropdownPos.x, top: dropdownPos.y, backgroundColor: 'var(--bg-secondary)', borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)', padding: '10px 0', minWidth: '180px', zIndex: 10000
          }}>
            {[
              { label: dropdownPos.chat.is_pinned ? 'Unpin chat' : 'Pin chat', onClick: () => {
                 const endpoint = dropdownPos.chat.isGroup ? `chat/groups/${dropdownPos.chat.id}/toggle_pin/` : `chat/conversations/${dropdownPos.chat.id}/toggle_pin/`;
                 api.post(endpoint).then(() => refreshChats());
              } },
              { label: dropdownPos.chat.is_archived ? 'Unarchive chat' : 'Archive chat', onClick: () => {
                 const endpoint = dropdownPos.chat.isGroup ? `chat/groups/${dropdownPos.chat.id}/toggle_archive/` : `chat/conversations/${dropdownPos.chat.id}/toggle_archive/`;
                 api.post(endpoint).then(() => refreshChats());
              } },
              { label: dropdownPos.chat.is_favourite ? 'Remove from favourites' : 'Add to favourites', onClick: () => {
                 const endpoint = dropdownPos.chat.isGroup ? `chat/groups/${dropdownPos.chat.id}/toggle_favourite/` : `chat/conversations/${dropdownPos.chat.id}/toggle_favourite/`;
                 api.post(endpoint).then(() => refreshChats());
              } },
              { label: dropdownPos.chat.is_muted ? 'Unmute notifications' : 'Mute notifications', onClick: () => {
                 const endpoint = dropdownPos.chat.isGroup ? `chat/groups/${dropdownPos.chat.id}/toggle_mute/` : `chat/conversations/${dropdownPos.chat.id}/toggle_mute/`;
                 api.post(endpoint).then(() => refreshChats());
              } },
              { label: dropdownPos.chat.isGroup ? 'Exit group' : 'Delete chat', onClick: () => handleDeleteChat(dropdownPos.chat) }
            ].map((item, i) => (
              <div 
                key={i}
                style={{ padding: '12px 24px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '15px' }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'var(--bg-sidebar)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                onClick={(e) => { e.stopPropagation(); setDropdownPos(null); item.onClick(); }}
              >
                {item.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Sidebar;

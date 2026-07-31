import { useState, useMemo } from 'react';
import api, { getMediaUrl } from '../api';
import { useContacts } from '../contexts/ContactsContext';

function Sidebar({ user, onLogout, conversations, groups, activeChat, onSelectChat, refreshChats, onRequestAppLock, onCreateGroup, activeTab, className = '' }) {
  const { getDisplayName } = useContacts();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState([]);
  
  const [hoveredChatId, setHoveredChatId] = useState(null);
  const [dropdownPos, setDropdownPos] = useState(null); // { x, y, chat }
  const [showArchived, setShowArchived] = useState(false);

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
    if (!window.confirm(`Are you sure you want to delete ${selectedChats.length} chats?`)) return;
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
      alert("Some chats could not be deleted.");
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
    if (!window.confirm(`Are you sure you want to ${chat.isGroup ? 'exit this group' : 'delete this chat'}?`)) return;
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
            <button style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { setSelectionMode(false); setSelectedChats([]); }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19.1 17.2l-5.3-5.3 5.3-5.3-1.8-1.8-5.3 5.3-5.3-5.3-1.8 1.8 5.3 5.3-5.3 5.3 1.8 1.8 5.3-5.3 5.3 5.3z"></path></svg>
            </button>
            <span style={{ fontSize: '18px', color: 'var(--text-primary)' }}>{selectedChats.length} Selected</span>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={handleBulkRead} title="Mark as Read">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20.293 5.293l-11 11L5 12V9.586l4.293 4.293 9.586-9.586h1.414z"></path></svg>
            </button>
            <button style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={handleBulkDelete} title="Delete">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>WhatsApp</span>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ position: 'relative' }}>
              <button style={{ color: 'var(--text-secondary)' }} onClick={() => setShowMenu(!showMenu)}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"></path></svg>
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
          <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.009 13.805H14.374L14.149 13.588C15.326 12.221 16.037 10.435 16.037 8.5C16.037 4.358 12.679 1 8.518 1C4.358 1 1 4.358 1 8.5C1 12.642 4.358 16 8.518 16C10.453 16 12.239 15.289 13.606 14.112L13.823 14.337V14.972L19.61 20.75L21.36 19L15.582 13.213V13.805ZM8.518 13.805C5.589 13.805 3.212 11.428 3.212 8.5C3.212 5.572 5.589 3.195 8.518 3.195C11.447 3.195 13.824 5.572 13.824 8.5C13.824 11.428 11.447 13.805 8.518 13.805Z"></path></svg>
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
                       {chat.is_pinned && <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--text-secondary)"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"></path></svg>}
                       {chat.is_favourite && <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--primary-color)"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>}
                       {chat.is_muted && <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--text-secondary)"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"></path></svg>}
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
                           {chat.last_message.content}
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
                           <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M7.41,8.59L12,13.17l4.59-4.58L18,10l-6,6l-6-6L7.41,8.59z"></path></svg>
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
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>
                    </div>
                    <div className="conversation-details" style={{ justifyContent: 'center' }}>
                      <span className="conversation-name" style={{ color: 'var(--primary-color)' }}>Back to Chats</span>
                    </div>
                  </div>
                ) : (
                  archivedCount > 0 && (
                    <div className="conversation-item" style={{ padding: '15px 20px', cursor: 'pointer' }} onClick={() => setShowArchived(true)}>
                      <div style={{ width: '44px', display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM6.24 5h11.52l.83 1H5.42l.82-1zM5 19V8h14v11H5zm6-5.5l-4-4h2.5V6h3v3.5H15l-4 4z"></path></svg>
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

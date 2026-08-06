import { useState, useEffect } from 'react';
import { Star, X, Search, Clock } from 'lucide-react';
import api from '../api';
import { useContacts } from '../contexts/ContactsContext';

function StarredMessagesModal({ isOpen, onClose }) {
  const { getDisplayName } = useContacts();
  const [starredMessages, setStarredMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchStarredMessages();
    }
  }, [isOpen]);

  const fetchStarredMessages = async () => {
    setLoading(true);
    try {
      const res = await api.get('chat/starred/');
      setStarredMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch starred messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstar = async (msg, e) => {
    e.stopPropagation();
    try {
      await api.post('chat/messages/star/', {
        message_id: msg.id,
        is_group: msg.is_group
      });
      setStarredMessages(prev => prev.filter(m => m.id !== msg.id || m.is_group !== msg.is_group));
    } catch (err) {
      console.error('Failed to unstar message:', err);
    }
  };

  if (!isOpen) return null;

  const filteredMessages = starredMessages.filter(msg => {
    const q = searchQuery.toLowerCase();
    const content = (msg.content || '').toLowerCase();
    const sender = (msg.sender?.username || '').toLowerCase();
    return content.includes(q) || sender.includes(q);
  });

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        width: '450px', maxHeight: '80vh', backgroundColor: 'var(--bg-secondary)',
        borderRadius: '12px', border: '1px solid var(--border-color)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', backgroundColor: 'var(--bg-header)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Star size={22} color="#eab308" fill="#eab308" />
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px' }}>Starred Messages</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            backgroundColor: 'var(--bg-primary)', padding: '8px 12px', borderRadius: '8px'
          }}>
            <Search size={16} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search starred messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: 'var(--text-primary)', width: '100%', fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0' }}>Loading starred messages...</p>
          ) : filteredMessages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              <Star size={48} color="var(--text-secondary)" style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ margin: '0 0 6px 0', fontWeight: '500' }}>No starred messages</p>
              <small>Tap the context menu on any message to star it for quick reference.</small>
            </div>
          ) : (
            filteredMessages.map(msg => (
              <div
                key={`${msg.is_group ? 'g' : 'd'}_${msg.id}`}
                style={{
                  padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary-color, #00a884)' }}>
                    {getDisplayName(msg.sender)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={(e) => handleUnstar(msg, e)}
                      title="Unstar message"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#eab308', padding: '2px' }}
                    >
                      <Star size={16} fill="#eab308" />
                    </button>
                  </div>
                </div>

                <div style={{ color: 'var(--text-primary)', fontSize: '14px', wordBreak: 'break-word' }}>
                  {msg.is_deleted ? (
                    <em style={{ color: 'var(--text-secondary)' }}>🚫 This message was deleted</em>
                  ) : (
                    msg.content || (msg.file ? `📎 ${msg.file.split('/').pop()}` : `[${msg.message_type}]`)
                  )}
                </div>

                {msg.is_edited && (
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>(Edited)</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default StarredMessagesModal;

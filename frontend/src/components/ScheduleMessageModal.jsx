import { useState, useEffect } from 'react';
import { Clock, X, Send, Calendar, Trash2 } from 'lucide-react';
import api from '../api';

function ScheduleMessageModal({ isOpen, onClose, chat, isGroup, onScheduled }) {
  const [content, setContent] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [pendingMessages, setPendingMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Set default date & time (10 minutes from now)
      const now = new Date(Date.now() + 10 * 60 * 1000);
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');

      setScheduledDate(`${year}-${month}-${day}`);
      setScheduledTime(`${hours}:${minutes}`);
      fetchPendingScheduled();
    }
  }, [isOpen]);

  const fetchPendingScheduled = async () => {
    try {
      const res = await api.get('chat/schedule/');
      setPendingMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch pending scheduled messages', err);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !scheduledDate || !scheduledTime) return;

    setLoading(true);
    try {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
      if (scheduledDateTime <= new Date()) {
        alert('Please select a future time for your scheduled message (e.g. 10 minutes from now).');
        setLoading(false);
        return;
      }
      
      await api.post('chat/schedule/', {
        target_id: chat.id,
        is_group: isGroup,
        content: content.trim(),
        scheduled_at: scheduledDateTime.toISOString()
      });

      setContent('');
      if (onScheduled) onScheduled();
      fetchPendingScheduled();
      onClose();
    } catch (err) {
      console.error('Failed to schedule message', err);
      alert(err.response?.data?.error || 'Failed to schedule message. Please pick a future date and time.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelScheduled = async (id) => {
    try {
      await api.delete(`chat/schedule/${id}/`);
      setPendingMessages(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Failed to cancel scheduled message', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        width: '420px', backgroundColor: 'var(--bg-secondary)', borderRadius: '14px',
        padding: '24px', border: '1px solid var(--border-color)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '16px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={22} color="#00a884" />
            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Schedule Message</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Schedule Form */}
        <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
              Message
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type message to schedule..."
              rows={3}
              required
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)', fontSize: '14px', outline: 'none', resize: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
                Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
                Time
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !content.trim()}
            style={{
              marginTop: '6px', padding: '12px', borderRadius: '24px', border: 'none',
              backgroundColor: '#00a884', color: 'white', fontWeight: '700', fontSize: '14px',
              cursor: loading || !content.trim() ? 'not-allowed' : 'pointer', opacity: loading || !content.trim() ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <Clock size={18} /> Schedule Send
          </button>
        </form>

        {/* Pending Scheduled List */}
        {pendingMessages.length > 0 && (
          <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Pending Scheduled ({pendingMessages.length})</h4>
            <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendingMessages.map(m => (
                <div key={m.id} style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                      {m.content}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      🕒 {new Date(m.scheduled_at).toLocaleString()}
                    </div>
                  </div>
                  <button onClick={() => handleCancelScheduled(m.id)} title="Cancel scheduled message" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScheduleMessageModal;

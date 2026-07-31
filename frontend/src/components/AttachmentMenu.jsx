import React from 'react';

const menuItems = [
  { id: 'document', label: 'Document', color: '#7f66ff', icon: '📄' },
  { id: 'photos', label: 'Photos & videos', color: '#007bfc', icon: '🖼️' },
  { id: 'camera', label: 'Camera', color: '#ff2e74', icon: '📷' },
  { id: 'contact', label: 'Contact', color: '#009de2', icon: '👤' },
  { id: 'poll', label: 'Poll', color: '#ffbc38', icon: '📊' },
  { id: 'event', label: 'Event', color: '#00a884', icon: '📅' },
  { id: 'sticker', label: 'New sticker', color: '#02a698', icon: '⭐' },
];

export default function AttachmentMenu({ onSelect, onClose }) {
  return (
    <>
      <div 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
        onClick={onClose}
      />
      <div style={{
        position: 'absolute',
        bottom: '60px',
        left: '20px',
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '16px',
        padding: '12px 0',
        width: '240px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {menuItems.map(item => (
          <div 
            key={item.id}
            onClick={() => { onSelect(item.id); onClose(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 20px',
              cursor: 'pointer',
              gap: '15px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '18px',
              color: item.color
            }}>
              {item.icon}
            </div>
            <span style={{ color: 'var(--text-primary)', fontSize: '15px' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

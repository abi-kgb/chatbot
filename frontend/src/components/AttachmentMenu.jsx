import React from 'react';
import { FileText, Image, Camera, User, BarChart2, Calendar, Sparkles } from 'lucide-react';

const menuItems = [
  { id: 'document', label: 'Document', color: '#7f66ff', icon: <FileText size={22} color="#7f66ff" /> },
  { id: 'photos', label: 'Photos & videos', color: '#007bfc', icon: <Image size={22} color="#007bfc" /> },
  { id: 'camera', label: 'Camera', color: '#ff2e74', icon: <Camera size={22} color="#ff2e74" /> },
  { id: 'contact', label: 'Contact', color: '#009de2', icon: <User size={22} color="#009de2" /> },
  { id: 'poll', label: 'Poll', color: '#ffbc38', icon: <BarChart2 size={22} color="#ffbc38" /> },
  { id: 'event', label: 'Event', color: '#00a884', icon: <Calendar size={22} color="#00a884" /> },
  { id: 'sticker', label: 'New sticker', color: '#02a698', icon: <Sparkles size={22} color="#02a698" /> },
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
              alignItems: 'center'
            }}>
              {item.icon}
            </div>
            <span style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '500' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}


import React from 'react';
import { FileText, Image, Camera, User, BarChart2, Calendar, Sparkles } from 'lucide-react';

const menuItems = [
  { id: 'document', label: 'Document', inputId: 'hidden-document-input', icon: <FileText size={22} color="#7f66ff" /> },
  { id: 'photos', label: 'Photos & videos', inputId: 'hidden-photo-input', icon: <Image size={22} color="#007bfc" /> },
  { id: 'camera', label: 'Camera', inputId: 'hidden-camera-input', icon: <Camera size={22} color="#ff2e74" /> },
  { id: 'contact', label: 'Contact', icon: <User size={22} color="#009de2" /> },
  { id: 'poll', label: 'Poll', icon: <BarChart2 size={22} color="#ffbc38" /> },
  { id: 'event', label: 'Event', icon: <Calendar size={22} color="#00a884" /> },
  { id: 'sticker', label: 'New sticker', icon: <Sparkles size={22} color="#02a698" /> },
];

export default function AttachmentMenu({ onSelect, onFileSelect, onClose }) {
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
        {menuItems.map(item => {
          const isDocument = item.id === 'document';
          const isPhotos = item.id === 'photos';
          const isCamera = item.id === 'camera';
          const isFileOption = isDocument || isPhotos || isCamera;

          return (
            <div 
              key={item.id}
              onClick={() => {
                if (!isFileOption) {
                  onSelect(item.id);
                  onClose();
                }
              }}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                padding: '10px 20px',
                cursor: 'pointer',
                gap: '15px',
                transition: 'background-color 0.2s',
                userSelect: 'none',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {isDocument && (
                <input 
                  type="file" 
                  accept="*/*" 
                  onChange={(e) => {
                    if (onFileSelect) onFileSelect(e);
                    onClose();
                  }}
                  style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }} 
                />
              )}
              {isPhotos && (
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  onChange={(e) => {
                    if (onFileSelect) onFileSelect(e);
                    onClose();
                  }}
                  style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }} 
                />
              )}
              {isCamera && (
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={(e) => {
                    if (onFileSelect) onFileSelect(e);
                    onClose();
                  }}
                  style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }} 
                />
              )}

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
          );
        })}
      </div>
    </>
  );
}




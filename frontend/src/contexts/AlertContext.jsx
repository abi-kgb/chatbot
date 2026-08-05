import { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, HelpCircle, MessageSquare } from 'lucide-react';

const AlertContext = createContext();

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    // Fallback if used outside provider
    return {
      showAlert: (msg, details) => alert(details ? `${msg}\n\n${details}` : msg),
      showConfirm: async (msg, details) => window.confirm(details ? `${msg}\n\n${details}` : msg),
      showToast: (msg) => console.log('Toast:', msg)
    };
  }
  return context;
};

export const AlertProvider = ({ children }) => {
  const [modalConfig, setModalConfig] = useState(null); // { type: 'alert' | 'confirm', title, message, onConfirm, onCancel, confirmText, isDanger }
  const [toasts, setToasts] = useState([]);

  const showAlert = useCallback((titleOrMsg, message = null, confirmText = 'OK') => {
    return new Promise((resolve) => {
      let title = 'Notice';
      let content = titleOrMsg;

      if (message) {
        title = titleOrMsg;
        content = message;
      } else if (titleOrMsg && typeof titleOrMsg === 'string' && titleOrMsg.includes('!')) {
        const parts = titleOrMsg.split('!');
        if (parts[0].length < 35) {
          title = parts[0] + '!';
          content = parts.slice(1).join('!').trim() || title;
        }
      }

      setModalConfig({
        type: 'alert',
        title,
        message: content,
        confirmText,
        onConfirm: () => {
          setModalConfig(null);
          resolve(true);
        }
      });
    });
  }, []);

  const showConfirm = useCallback((titleOrMsg, message = null, confirmText = 'Confirm', isDanger = false) => {
    return new Promise((resolve) => {
      let title = 'Please Confirm';
      let content = titleOrMsg;

      if (message) {
        title = titleOrMsg;
        content = message;
      }

      // Auto-detect danger actions like Delete, Block, Clear, Remove, Exit
      const dangerKeywords = ['delete', 'remove', 'block', 'clear', 'exit'];
      const combinedText = `${title} ${content}`.toLowerCase();
      const detectedDanger = isDanger || dangerKeywords.some(kw => combinedText.includes(kw));
      const finalConfirmText = confirmText === 'Confirm' && detectedDanger && combinedText.includes('delete') ? 'Delete' : confirmText;

      setModalConfig({
        type: 'confirm',
        title,
        message: content,
        confirmText: finalConfirmText,
        isDanger: detectedDanger,
        onConfirm: () => {
          setModalConfig(null);
          resolve(true);
        },
        onCancel: () => {
          setModalConfig(null);
          resolve(false);
        }
      });
    });
  }, []);

  const showToast = useCallback((msg, duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, showToast }}>
      {children}

      {/* Custom Modal Dialog Overlay */}
      {modalConfig && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(5px)',
          zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '20px', boxSizing: 'border-box', animation: 'fadeIn 0.2s'
        }}
        onClick={modalConfig.type === 'confirm' ? modalConfig.onCancel : modalConfig.onConfirm}
        >
          <div style={{
            backgroundColor: 'var(--bg-primary, #111b21)', color: 'var(--text-primary, #e9edef)',
            borderRadius: '16px', padding: '24px 28px', width: '440px', maxWidth: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)', border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            transform: 'scale(1)', transition: 'transform 0.2s', zIndex: 1000000
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Title & Icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '50%',
                backgroundColor: modalConfig.isDanger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 168, 132, 0.15)',
                color: modalConfig.isDanger ? '#ef4444' : '#00a884',
                display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
                border: `1px solid ${modalConfig.isDanger ? 'rgba(239,68,68,0.3)' : 'rgba(0,168,132,0.3)'}`
              }}>
                {modalConfig.isDanger ? <AlertTriangle size={22} /> : modalConfig.type === 'confirm' ? <HelpCircle size={22} /> : <MessageSquare size={22} />}
              </div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--text-primary, #ffffff)' }}>
                {modalConfig.title}
              </h3>
            </div>

            {/* Message Body */}
            <div style={{
              fontSize: '15px', color: 'var(--text-secondary, #8696a0)', lineHeight: '1.6',
              marginBottom: '24px', whiteSpace: 'pre-line', wordBreak: 'break-word', maxHeight: '50vh', overflowY: 'auto'
            }}>
              {modalConfig.message}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {modalConfig.type === 'confirm' && (
                <button
                  type="button"
                  onClick={modalConfig.onCancel}
                  style={{
                    padding: '10px 22px', backgroundColor: 'transparent', color: 'var(--text-secondary, #8696a0)',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.2))', borderRadius: '25px',
                    fontWeight: '600', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={modalConfig.onConfirm}
                style={{
                  padding: '10px 26px',
                  backgroundColor: modalConfig.isDanger ? '#ef4444' : '#00a884',
                  color: 'white', border: 'none', borderRadius: '25px',
                  fontWeight: '700', cursor: 'pointer', fontSize: '14px',
                  boxShadow: modalConfig.isDanger ? '0 4px 14px rgba(239,68,68,0.4)' : '0 4px 14px rgba(0,168,132,0.4)',
                  transition: 'transform 0.2s, background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {modalConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notifications */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999999, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            backgroundColor: '#00a884', color: 'white', padding: '12px 22px', borderRadius: '25px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.4)', fontWeight: '600', fontSize: '14px',
            display: 'flex', alignItems: 'center', gap: '8px', animation: 'slideInRight 0.3s'
          }}>
            ✅ {t.msg}
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
};

export default AlertContext;

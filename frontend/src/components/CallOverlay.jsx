import { useEffect, useRef, useState } from 'react';

function CallOverlay({ 
  user, 
  chatName, 
  callState, 
  isVideo, 
  isIncoming, 
  onAccept, 
  onDecline, 
  onEnd, 
  localStream, 
  remoteStream 
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let interval;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      // Force play to ensure audio starts, catching any autoplay errors
      remoteVideoRef.current.play().catch(e => console.warn('Autoplay blocked:', e));
    }
  }, [remoteStream, callState]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      color: 'white'
    }}>
      {/* Remote Media Element (Video for video calls, Audio for voice calls) */}
      {isVideo && (
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          controls
          style={{ 
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover',
            opacity: callState === 'connected' ? 1 : 0,
            pointerEvents: 'auto'
          }} 
        />
      )}
      
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '40px 20px' }}>
        
        {/* Header Info */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '28px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            {chatName}
          </h2>
          <div style={{ color: '#ccc', fontSize: '18px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
            {callState === 'calling' && 'Calling...'}
            {callState === 'incoming' && `Incoming ${isVideo ? 'Video' : 'Voice'} Call`}
            {callState === 'connecting' && 'Connecting...'}
            {callState === 'connected' && formatTime(callDuration)}
          </div>
        </div>

        {/* Local Video Thumbnail */}
        {isVideo && localStream && (
          <div style={{
            position: 'absolute', top: '40px', right: '20px',
            width: '120px', height: '160px',
            backgroundColor: '#333', borderRadius: '12px', overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: '2px solid rgba(255,255,255,0.2)'
          }}>
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
            />
          </div>
        )}

        {/* Placeholder Avatar if not video or not connected yet */}
        {(!isVideo || callState !== 'connected') && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{
              width: '150px', height: '150px', borderRadius: '50%', backgroundColor: 'var(--primary-color)',
              display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '60px',
              boxShadow: '0 0 40px rgba(0,0,0,0.5)',
              animation: callState === 'calling' || callState === 'incoming' ? 'pulse 2s infinite' : 'none',
              marginBottom: '30px'
            }}>
              {chatName?.charAt(0).toUpperCase()}
            </div>
            {/* Show explicit audio controls for voice calls when connected */}
            {!isVideo && callState === 'connected' && (
              <audio 
                ref={remoteVideoRef} 
                autoPlay 
                controls 
                style={{ width: '300px', zIndex: 100 }}
              />
            )}
          </div>
        )}

        {/* Controls Container at the bottom */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginTop: 'auto', marginBottom: '40px' }}>
          
          {callState === 'incoming' && (
            <button 
              onClick={onAccept}
              style={{
                width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#25D366',
                border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)',
                animation: 'bounce 1s infinite alternate'
              }}
            >
              {isVideo ? '📹' : '📞'}
            </button>
          )}

          <button 
            onClick={onDecline || onEnd}
            style={{
              width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#f03e3e',
              border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              boxShadow: '0 4px 15px rgba(240, 62, 62, 0.4)'
            }}
          >
            📞
            {/* The phone down emoji would be better, but this will do with a rotation */}
            <span style={{ position: 'absolute', transform: 'rotate(135deg)', pointerEvents: 'none' }}></span>
          </button>
          
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.4); }
          70% { box-shadow: 0 0 0 30px rgba(37, 211, 102, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
        }
        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}

export default CallOverlay;

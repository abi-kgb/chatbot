import { useState, useRef, useEffect } from 'react';

function VoiceMessagePlayer({ src }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
    };

    const setAudioTime = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    const newTime = (e.target.value / 100) * duration;
    audio.currentTime = newTime;
    setProgress(e.target.value);
  };

  const formatTime = (time) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px', 
      padding: '5px 0', 
      minWidth: '240px',
      maxWidth: '300px'
    }}>
      <button 
        onClick={togglePlayPause}
        style={{ 
          background: 'none', 
          border: 'none', 
          cursor: 'pointer', 
          color: 'var(--text-secondary)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          fontSize: '28px',
          padding: 0
        }}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', top: '2px' }}>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={progress || 0} 
          onChange={handleSeek}
          style={{ 
            width: '100%', 
            cursor: 'pointer', 
            height: '4px', 
            accentColor: 'var(--primary-color)',
            margin: '0 0 5px 0'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
          <span>{formatTime(currentTime)}</span>
          {/* Display duration on the right, or 'Voice message' if we don't have duration yet */}
          <span>{duration ? formatTime(duration) : '...'}</span>
        </div>
      </div>
      
      <div style={{ 
        width: '40px', 
        height: '40px', 
        borderRadius: '50%', 
        overflow: 'hidden',
        flexShrink: 0,
        backgroundColor: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px'
      }}>
        🎤
      </div>
      
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}

export default VoiceMessagePlayer;

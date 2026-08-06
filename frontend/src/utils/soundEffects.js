// Web Audio API synthesizer for chat notifications & call ringtones with customizable tones & settings

let audioCtx = null;
let activeRingtoneInterval = null;

const getAudioContext = () => {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  window.addEventListener('touchstart', unlockAudio);
}

export const getSoundSettings = () => ({
  chatEnabled: localStorage.getItem('chatbox_sound_chat_enabled') !== 'false',
  chatTone: localStorage.getItem('chatbox_chat_tone') || 'classic',
  callEnabled: localStorage.getItem('chatbox_sound_call_enabled') !== 'false',
  callTone: localStorage.getItem('chatbox_call_tone') || 'whatsapp',
});

// 🔔 Play selected incoming chat notification tone
export const playMessageNotificationSound = (customTone) => {
  const settings = getSoundSettings();
  if (!settings.chatEnabled && !customTone) return;

  const tone = customTone || settings.chatTone;
  if (tone === 'off') return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (tone === 'marimba') {
      // Soft Marimba (E5 ➔ G5 ➔ B5)
      [659.25, 783.99, 987.77].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.2, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.15);
      });
    } else if (tone === 'pop') {
      // Crisp Pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (tone === 'pulse') {
      // Double Pulse (C5 ➔ E5)
      [523.25, 659.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.2, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.12);
      });
    } else {
      // Classic WhatsApp Chime (D5 ➔ A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.08);
      gain2.gain.setValueAtTime(0.22, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.25);
    }
  } catch (err) {
    console.warn('Could not play message sound:', err);
  }
};

// 📤 Play subtle pop sound when user sends a message
export const playSentMessageSound = () => {
  const settings = getSoundSettings();
  if (!settings.chatEnabled) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  } catch (err) {
    console.warn('Could not play sent sound:', err);
  }
};

// 📞 Play selected incoming call ringtone
export const startCallRingtone = (customTone) => {
  stopCallRingtone();

  const settings = getSoundSettings();
  if (!settings.callEnabled && !customTone) return () => {};

  const tone = customTone || settings.callTone;
  if (tone === 'off') return () => {};

  const playRingPulse = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (tone === 'digital') {
        // Classic Digital Chirp (850Hz + 950Hz)
        [0, 0.2].forEach(offset => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.type = 'square';
          osc2.type = 'square';
          osc1.frequency.setValueAtTime(850, now + offset);
          osc2.frequency.setValueAtTime(950, now + offset);
          gain.gain.setValueAtTime(0.08, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          osc1.start(now + offset);
          osc2.start(now + offset);
          osc1.stop(now + offset + 0.12);
          osc2.stop(now + offset + 0.12);
        });
      } else if (tone === 'gentle') {
        // Gentle Melody (C5 ➔ E5 ➔ G5)
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.15);
          gain.gain.setValueAtTime(0.2, now + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.15);
          osc.stop(now + i * 0.15 + 0.3);
        });
      } else if (tone === 'beat') {
        // Marimba Rhythm
        [659.25, 880, 659.25, 880].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          gain.gain.setValueAtTime(0.22, now + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.15);
        });
      } else {
        // WhatsApp Ringtone (440Hz + 480Hz)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.setValueAtTime(0.22, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.5);
        osc2.stop(now + 1.5);
      }
    } catch (err) {
      console.warn('Could not play ringtone:', err);
    }
  };

  playRingPulse();
  activeRingtoneInterval = setInterval(playRingPulse, 2600);

  return stopCallRingtone;
};

export const stopCallRingtone = () => {
  if (activeRingtoneInterval) {
    clearInterval(activeRingtoneInterval);
    activeRingtoneInterval = null;
  }
};

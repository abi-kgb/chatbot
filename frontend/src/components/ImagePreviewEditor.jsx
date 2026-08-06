import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Type, Smile, Pen, Eraser, RotateCcw, Send, ChevronDown } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

const COLORS = ['#ffffff', '#000000', '#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#ff6b81', '#eccc68', '#a29bfe', '#fd79a8'];
const BRUSH_SIZES = [3, 6, 12, 20];

export default function ImagePreviewEditor({ file, onSend, onCancel }) {
  const [mode, setMode] = useState('view'); // 'view' | 'text' | 'emoji' | 'draw' | 'erase'
  const [caption, setCaption] = useState('');
  const [overlays, setOverlays] = useState([]); // { id, type: 'text'|'emoji', x, y, content, color, size }
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState(null);
  const [brushSize, setBrushSize] = useState(6);
  const [isDrawing, setIsDrawing] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });

  const [isHD, setIsHD] = useState(false); // false = Standard, true = HD

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const lastPos = useRef(null);
  const draggingOverlay = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const textInputRef = useRef(null);

  // Load image into URL
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Fit canvas to image
  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const maxW = Math.min(window.innerWidth * 0.85, 720);
      const maxH = window.innerHeight * 0.7;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const ratio = w / h;
      if (w > maxW) { w = maxW; h = w / ratio; }
      if (h > maxH) { h = maxH; w = h * ratio; }
      setImageSize({ w: Math.round(w), h: Math.round(h) });
      const canvas = canvasRef.current;
      canvas.width = Math.round(w);
      canvas.height = Math.round(h);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Drawing helpers
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (e) => {
    if (mode !== 'draw' && mode !== 'erase') return;
    e.preventDefault();
    setIsDrawing(true);
    lastPos.current = getPos(e);
  };

  const draw = (e) => {
    if (!isDrawing || (mode !== 'draw' && mode !== 'erase')) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = mode === 'erase' ? 'rgba(0,0,0,1)' : selectedColor;
    ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    lastPos.current = pos;
  };

  const endDraw = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  // Resize overlay with mouse wheel
  const handleOverlayWheel = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 4 : -4;
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, size: Math.max(10, Math.min(120, o.size + delta)) } : o));
  };

  // Resize selected overlay
  const resizeSelectedOverlay = (delta) => {
    if (!selectedOverlayId) return;
    setOverlays(prev => prev.map(o => o.id === selectedOverlayId ? { ...o, size: Math.max(10, Math.min(120, o.size + delta)) } : o));
  };

  const selectedOverlay = overlays.find(o => o.id === selectedOverlayId);

  // Click on canvas for text placement
  const handleCanvasClick = (e) => {
    setSelectedOverlayId(null);
    if (mode === 'text') {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setTextPos({ x, y });
      setTextInput('');
      setTimeout(() => textInputRef.current?.focus(), 50);
    }
  };

  const commitText = () => {
    if (!textInput.trim() || !textPos) return;
    setOverlays(prev => [...prev, {
      id: Date.now(),
      type: 'text',
      x: textPos.x,
      y: textPos.y,
      content: textInput,
      color: selectedColor,
      size: 22,
    }]);
    setTextInput('');
    setTextPos(null);
  };

  const addEmoji = (emojiData) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setOverlays(prev => [...prev, {
      id: Date.now(),
      type: 'emoji',
      x: 50 + (Math.random() - 0.5) * 20,
      y: 50 + (Math.random() - 0.5) * 20,
      content: emojiData.emoji,
      size: 36,
    }]);
    setShowEmojiPicker(false);
  };

  // Drag overlays
  const startDragOverlay = (e, id) => {
    e.stopPropagation();
    const overlay = overlays.find(o => o.id === id);
    if (!overlay) return;
    draggingOverlay.current = id;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    dragOffset.current = {
      x: touch.clientX - rect.left - (overlay.x / 100 * rect.width),
      y: touch.clientY - rect.top - (overlay.y / 100 * rect.height),
    };
    e.preventDefault();
  };

  const moveDragOverlay = useCallback((e) => {
    if (!draggingOverlay.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left - dragOffset.current.x) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top - dragOffset.current.y) / rect.height) * 100));
    setOverlays(prev => prev.map(o => o.id === draggingOverlay.current ? { ...o, x, y } : o));
  }, []);

  const endDragOverlay = useCallback(() => {
    draggingOverlay.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', moveDragOverlay);
    window.addEventListener('mouseup', endDragOverlay);
    window.addEventListener('touchmove', moveDragOverlay, { passive: false });
    window.addEventListener('touchend', endDragOverlay);
    return () => {
      window.removeEventListener('mousemove', moveDragOverlay);
      window.removeEventListener('mouseup', endDragOverlay);
      window.removeEventListener('touchmove', moveDragOverlay);
      window.removeEventListener('touchend', endDragOverlay);
    };
  }, [moveDragOverlay, endDragOverlay]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Flatten and export final image
  const handleSend = async () => {
    const canvas = canvasRef.current;
    const w = canvas.width;
    const h = canvas.height;

    // Create final canvas: image + drawings + overlays
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = w;
    finalCanvas.height = h;
    const ctx = finalCanvas.getContext('2d');

    // Draw base image
    const img = new Image();
    await new Promise(res => { img.onload = res; img.src = imageUrl; });
    ctx.drawImage(img, 0, 0, w, h);

    // Draw canvas (scribbles) on top
    ctx.drawImage(canvas, 0, 0);

    // Draw overlays (text / emoji)
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    for (const ov of overlays) {
      const px = (ov.x / 100) * w;
      const py = (ov.y / 100) * h;
      ctx.font = `bold ${Math.round(ov.size * (w / rect.width))}px sans-serif`;
      if (ov.type === 'text') {
        ctx.fillStyle = ov.color || '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(ov.content, px, py);
      } else {
        ctx.textAlign = 'center';
        ctx.fillText(ov.content, px, py);
      }
    }

    finalCanvas.toBlob(blob => {
      const finalFile = new File([blob], file.name.replace(/\.[^.]+$/, '_edited.png'), { type: 'image/png' });
      onSend(finalFile, caption, isHD);
    }, 'image/png', isHD ? 0.98 : 0.75);
  };

  const toolBtn = (id, icon, label) => (
    <button
      title={label}
      onClick={() => { setMode(mode === id ? 'view' : id); setTextPos(null); setShowEmojiPicker(id === 'emoji'); }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
        background: mode === id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
        border: mode === id ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.15)',
        borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', color: 'white',
        fontSize: '11px', fontWeight: '600', transition: 'all 0.2s',
      }}
    >
      {icon}
      {label}
    </button>
  );

  const isDrawMode = mode === 'draw' || mode === 'erase';

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 12000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Top bar */}
      <div style={{
        width: '100%', maxWidth: '760px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', marginBottom: '8px',
      }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
          <X size={22} /> Cancel
        </button>
        
        <button
          onClick={() => setIsHD(prev => !prev)}
          title={isHD ? "HD Quality Enabled (Full Resolution)" : "Standard Quality (Optimized)"}
          style={{
            background: isHD ? '#00a884' : 'rgba(255,255,255,0.12)',
            border: isHD ? 'none' : '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            borderRadius: '20px',
            padding: '5px 14px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            boxShadow: isHD ? '0 0 12px rgba(0,168,132,0.5)' : 'none'
          }}
        >
          <span style={{ border: '1.5px solid white', borderRadius: '4px', padding: '0px 4px', fontSize: '10px', fontWeight: '900', letterSpacing: '0.5px' }}>HD</span>
          <span>{isHD ? 'HD Quality ✨' : 'Standard Quality'}</span>
        </button>

        <button onClick={clearCanvas} title="Clear drawing" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', borderRadius: '8px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
          <RotateCcw size={16} /> Clear
        </button>
      </div>

      {/* Tool bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', justifyContent: 'center', padding: '0 10px' }}>
        {toolBtn('text', <Type size={18} />, 'Text')}
        {toolBtn('emoji', <Smile size={18} />, 'Emoji')}
        {toolBtn('draw', <Pen size={18} />, 'Draw')}
        {toolBtn('erase', <Eraser size={18} />, 'Erase')}
      </div>

      {/* Color + Brush size (draw/erase/text modes) */}
      {(isDrawMode || mode === 'text') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {COLORS.map(c => (
            <div
              key={c}
              onClick={() => setSelectedColor(c)}
              style={{
                width: selectedColor === c ? '30px' : '22px',
                height: selectedColor === c ? '30px' : '22px',
                borderRadius: '50%',
                backgroundColor: c,
                border: selectedColor === c ? '3px solid white' : '2px solid rgba(255,255,255,0.3)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: selectedColor === c ? '0 0 0 2px #00a884' : 'none',
              }}
            />
          ))}
          {isDrawMode && (
            <select
              value={brushSize}
              onChange={e => setBrushSize(Number(e.target.value))}
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: '6px', padding: '4px 8px', fontSize: '13px', cursor: 'pointer', outline: 'none' }}
            >
              {BRUSH_SIZES.map(s => <option key={s} value={s} style={{ color: '#111' }}>{s}px</option>)}
            </select>
          )}
        </div>
      )}

      {/* Size slider for selected overlay */}
      {selectedOverlay && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', padding: '6px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>
            {selectedOverlay.type === 'emoji' ? '😊' : 'T'} Size:
          </span>
          <button
            onClick={() => resizeSelectedOverlay(-4)}
            style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
          >−</button>
          <input
            type="range"
            min="10"
            max="120"
            value={selectedOverlay.size}
            onChange={e => setOverlays(prev => prev.map(o => o.id === selectedOverlayId ? { ...o, size: Number(e.target.value) } : o))}
            style={{ flex: 1, accentColor: '#00a884', cursor: 'pointer', height: '6px' }}
          />
          <button
            onClick={() => resizeSelectedOverlay(4)}
            style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
          >+</button>
          <span style={{ color: '#00a884', fontSize: '13px', fontWeight: 'bold', minWidth: '35px', textAlign: 'center' }}>{selectedOverlay.size}px</span>
        </div>
      )}

      {/* Image + canvas + overlays */}
      <div
        ref={containerRef}
        style={{ position: 'relative', display: 'inline-block', cursor: mode === 'text' ? 'crosshair' : (isDrawMode ? 'crosshair' : 'default') }}
        onClick={handleCanvasClick}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt="preview"
            style={{ display: 'block', maxWidth: '85vw', maxHeight: '60vh', borderRadius: '10px', userSelect: 'none', pointerEvents: 'none' }}
            draggable={false}
          />
        )}

        {/* Drawing canvas (transparent overlay) */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            borderRadius: '10px',
            cursor: isDrawMode ? 'crosshair' : 'default',
            pointerEvents: isDrawMode ? 'auto' : 'none',
            touchAction: 'none',
          }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />

        {/* Text overlays + emoji overlays */}
        {overlays.map(ov => {
          const isSelected = selectedOverlayId === ov.id;
          return (
            <div
              key={ov.id}
              onMouseDown={(e) => { setSelectedOverlayId(ov.id); startDragOverlay(e, ov.id); }}
              onTouchStart={(e) => { setSelectedOverlayId(ov.id); startDragOverlay(e, ov.id); }}
              onWheel={(e) => handleOverlayWheel(e, ov.id)}
              style={{
                position: 'absolute',
                left: `${ov.x}%`,
                top: `${ov.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: `${ov.size}px`,
                color: ov.color || 'white',
                fontWeight: 'bold',
                cursor: 'grab',
                userSelect: 'none',
                textShadow: ov.type === 'text' ? '1px 1px 3px rgba(0,0,0,0.8)' : 'none',
                zIndex: isSelected ? 15 : 10,
                whiteSpace: 'nowrap',
                pointerEvents: mode === 'view' || mode === 'text' || mode === 'emoji' ? 'auto' : 'none',
                border: isSelected ? '2px dashed #00a884' : '2px dashed transparent',
                borderRadius: '6px',
                padding: '4px',
                transition: 'border 0.15s',
              }}
            >
              {ov.content}
              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); setOverlays(prev => prev.filter(o => o.id !== ov.id)); if (isSelected) setSelectedOverlayId(null); }}
                style={{
                  position: 'absolute', top: '-12px', right: '-12px',
                  background: '#ef4444', border: 'none', borderRadius: '50%',
                  width: '20px', height: '20px', cursor: 'pointer', color: 'white', fontSize: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                  pointerEvents: 'auto', boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                }}
              >×</button>
              {/* Resize handle indicators */}
              {isSelected && (
                <div style={{
                  position: 'absolute', bottom: '-14px', left: '50%', transform: 'translateX(-50%)',
                  display: 'flex', gap: '2px', pointerEvents: 'auto',
                }}>
                  <button onClick={(e) => { e.stopPropagation(); resizeSelectedOverlay(-4); }} style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.7)', color: 'white', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', lineHeight: 1 }}>−</button>
                  <button onClick={(e) => { e.stopPropagation(); resizeSelectedOverlay(4); }} style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.7)', color: 'white', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', lineHeight: 1 }}>+</button>
                </div>
              )}
            </div>
          );
        })}

        {/* Inline text input on canvas click */}
        {mode === 'text' && textPos && (
          <div
            style={{
              position: 'absolute',
              left: `${textPos.x}%`,
              top: `${textPos.y}%`,
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 20,
            }}
            onClick={e => e.stopPropagation()}
          >
            <input
              ref={textInputRef}
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitText(); if (e.key === 'Escape') { setTextPos(null); setTextInput(''); } }}
              placeholder="Type here…"
              style={{
                background: 'rgba(0,0,0,0.6)',
                border: `2px solid ${selectedColor}`,
                borderRadius: '6px',
                color: selectedColor,
                fontSize: '18px',
                fontWeight: 'bold',
                padding: '4px 8px',
                outline: 'none',
                minWidth: '120px',
                textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
              }}
            />
            <button
              onClick={commitText}
              style={{ background: '#00a884', border: 'none', borderRadius: '6px', color: 'white', padding: '4px 8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
            >Add</button>
          </div>
        )}
      </div>

      {/* Emoji picker floating */}
      {showEmojiPicker && mode === 'emoji' && (
        <div style={{ position: 'fixed', bottom: '160px', left: '50%', transform: 'translateX(-50%)', zIndex: 13000 }}>
          <EmojiPicker onEmojiClick={addEmoji} theme="dark" height={350} width={320} />
        </div>
      )}

      {/* Caption + Send */}
      <div style={{ width: '100%', maxWidth: '760px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
        <input
          type="text"
          placeholder="Add a caption…"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          style={{
            flex: 1, padding: '10px 16px', borderRadius: '24px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white', fontSize: '15px', outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          style={{
            backgroundColor: '#00a884', color: 'white', border: 'none',
            borderRadius: '50%', width: '48px', height: '48px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,168,132,0.4)',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Send size={22} />
        </button>
      </div>

      {/* Hint */}
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px' }}>
        {mode === 'text' && '👆 Click anywhere on the image to place text'}
        {mode === 'emoji' && '👆 Pick an emoji — drag it anywhere on the image'}
        {mode === 'draw' && '✏️ Click and drag to draw on the image'}
        {mode === 'erase' && '🧹 Click and drag to erase drawings'}
        {mode === 'view' && '🖼️ Use the tools above to annotate before sending'}
      </div>
    </div>
  );
}

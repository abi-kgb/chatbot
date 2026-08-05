import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Crop, Pencil, Smile, Type, Check, Undo, RotateCw, Trash2, Send, Play, Pause, Scissors, Sparkles } from 'lucide-react';
import MediaPicker from './MediaPicker';

const COLORS = [
  '#FFFFFF', '#EF4444', '#10B981', '#3B82F6', '#EAB308', 
  '#A855F7', '#EC4899', '#F97316', '#000000', '#06B6D4', '#84CC16'
];

const STROKE_WIDTHS = [
  { label: 'Thin', value: 3 },
  { label: 'Medium', value: 7 },
  { label: 'Thick', value: 14 },
  { label: 'Marker', value: 24 }
];

function StatusMediaEditorModal({ file, onClose, onComplete }) {
  const isVideo = Boolean(file && (file.type?.startsWith('video/') || file.name?.match(/\.(mp4|webm|mov|ogg|mkv|avi|3gp|flv)$/i)));
  const [mediaUrl, setMediaUrl] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Editor mode: 'draw', 'crop', 'text', 'emoji', 'trim', or null (neutral)
  const [activeMode, setActiveMode] = useState(null);
  
  // Drawing state
  const [drawingColor, setDrawingColor] = useState('#EF4444');
  const [strokeWidth, setStrokeWidth] = useState(7);
  const [strokes, setStrokes] = useState([]); // Array of { color, width, points: [{x, y}] }
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const currentStroke = useRef([]);
  const mediaContainerRef = useRef(null);
  
  // Crop & Rotate state (for images)
  const [cropMode, setCropMode] = useState('original'); // 'original', '9:16', '1:1', '4:3'
  const [rotation, setRotation] = useState(0); // in degrees: 0, 90, 180, 270
  
  // Video Trim state
  const [videoDuration, setVideoDuration] = useState(30);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);
  const [isPlaying, setIsPlaying] = useState(true);
  
  // Overlays (Emojis and Text)
  const [overlays, setOverlays] = useState([]); // { id, type, text/emoji, color, x, y, size, bgStyle }
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);
  const [draggingOverlayId, setDraggingOverlayId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // New text modal state
  const [showTextInput, setShowTextInput] = useState(false);
  const [newTextValue, setNewTextValue] = useState('');
  const [newTextColor, setNewTextColor] = useState('#FFFFFF');
  const [newTextBg, setNewTextBg] = useState('transparent'); // 'transparent', 'dark', 'light'

  // Caption state
  const [caption, setCaption] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  // Manage URL creation & cleanup
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setMediaUrl(url);
    }
  }, [file]);

  // Load image object once
  useEffect(() => {
    if (!isVideo && mediaUrl) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setImageLoaded(true);
      };
      img.src = mediaUrl;
    }
  }, [isVideo, mediaUrl]);

  // Redraw canvas on tool edits or initial load
  useEffect(() => {
    if (imageLoaded && imageRef.current && canvasRef.current) {
      redrawCanvas();
    }
  }, [imageLoaded, cropMode, rotation, strokes]);

  // Handle video trimming playback loop
  useEffect(() => {
    if (isVideo && videoRef.current) {
      const vid = videoRef.current;
      const handleTimeUpdate = () => {
        if (vid.currentTime >= endTime) {
          vid.currentTime = startTime;
          if (isPlaying) vid.play();
        }
      };
      vid.addEventListener('timeupdate', handleTimeUpdate);
      return () => vid.removeEventListener('timeupdate', handleTimeUpdate);
    }
  }, [isVideo, startTime, endTime, isPlaying]);

  const handleVideoLoadedMetadata = (e) => {
    const dur = e.target.duration || 30;
    setVideoDuration(dur);
    setStartTime(0);
    setEndTime(Math.min(dur, 30)); // WhatsApp default status max 30s
  };

  const getTargetDimensions = (imgWidth, imgHeight, mode) => {
    if (mode === '1:1') {
      const side = Math.min(imgWidth, imgHeight);
      return { width: side, height: side, cropX: (imgWidth - side)/2, cropY: (imgHeight - side)/2 };
    }
    if (mode === '9:16') {
      let targetW = imgWidth;
      let targetH = (imgWidth * 16) / 9;
      if (targetH > imgHeight) {
        targetH = imgHeight;
        targetW = (imgHeight * 9) / 16;
      }
      return { width: targetW, height: targetH, cropX: (imgWidth - targetW)/2, cropY: (imgHeight - targetH)/2 };
    }
    if (mode === '4:3') {
      let targetW = imgWidth;
      let targetH = (imgWidth * 3) / 4;
      if (targetH > imgHeight) {
        targetH = imgHeight;
        targetW = (imgHeight * 4) / 3;
      }
      return { width: targetW, height: targetH, cropX: (imgWidth - targetW)/2, cropY: (imgHeight - targetH)/2 };
    }
    return { width: imgWidth, height: imgHeight, cropX: 0, cropY: 0 };
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    const isRotated = rotation === 90 || rotation === 270;
    
    const naturalW = isRotated ? img.naturalHeight : img.naturalWidth;
    const naturalH = isRotated ? img.naturalWidth : img.naturalHeight;

    const { width: finalW, height: finalH, cropX, cropY } = getTargetDimensions(naturalW, naturalH, cropMode);
    
    // Set max working dimensions to avoid huge memory usage while retaining high quality
    const scaleFactor = Math.min(1, 1200 / Math.max(finalW, finalH));
    canvas.width = finalW * scaleFactor;
    canvas.height = finalH * scaleFactor;

    ctx.save();
    ctx.scale(scaleFactor, scaleFactor);
    ctx.translate(-cropX, -cropY);

    if (rotation !== 0) {
      ctx.translate(naturalW / 2, naturalH / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    } else {
      ctx.drawImage(img, 0, 0);
    }
    ctx.restore();

    // Draw doodle strokes
    strokes.forEach(stroke => {
      if (!stroke || !stroke.points || stroke.points.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.width * (canvas.width / 500);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (stroke.points.length === 1) {
        ctx.arc(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
        }
        ctx.stroke();
      }
    });
  };

  // Doodle Handlers
  const handlePointerDown = (e) => {
    if (activeMode !== 'draw' || isVideo || !canvasRef.current) return;
    if (e.cancelable && e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    if (e.target && e.target.setPointerCapture && e.pointerId) {
      try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
    }
    isDrawingRef.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : (e.clientX || 0);
    const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : (e.clientY || 0);
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    currentStroke.current = [{ x, y }];
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current || activeMode !== 'draw' || isVideo || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : (e.clientX || 0);
    const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : (e.clientY || 0);
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    
    currentStroke.current.push({ x, y });
    
    // Quick preview draw of current stroke
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pts = currentStroke.current;
    if (pts.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = drawingColor;
      ctx.lineWidth = strokeWidth * (canvas.width / 500);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(pts[pts.length - 2].x * canvas.width, pts[pts.length - 2].y * canvas.height);
      ctx.lineTo(pts[pts.length - 1].x * canvas.width, pts[pts.length - 1].y * canvas.height);
      ctx.stroke();
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawingRef.current) return;
    if (e && e.target && e.target.releasePointerCapture && e.pointerId) {
      try { e.target.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    isDrawingRef.current = false;
    if (currentStroke.current && currentStroke.current.length >= 1) {
      setStrokes(prev => [...prev, { color: drawingColor, width: strokeWidth, points: [...currentStroke.current] }]);
    }
    currentStroke.current = [];
  };

  const handleUndoStroke = () => {
    setStrokes(prev => prev.slice(0, -1));
  };

  // Overlays addition (Emojis & Text)
  const addOverlay = (type, content, color = '#FFFFFF', bgStyle = 'transparent') => {
    setActiveMode(null);
    const newId = Date.now().toString();
    const newOverlay = {
      id: newId,
      type, // 'text' or 'emoji'
      content,
      color,
      bgStyle,
      x: 0.4,
      y: 0.4,
      size: type === 'emoji' ? 48 : 26
    };
    setOverlays(prev => [...prev, newOverlay]);
    setSelectedOverlayId(newId);
  };

  const removeOverlay = (id) => {
    setOverlays(prev => prev.filter(o => o.id !== id));
    if (selectedOverlayId === id) setSelectedOverlayId(null);
  };

  const updateOverlaySize = (id, delta) => {
    setOverlays(prev => prev.map(o => {
      if (o.id === id) {
        const newSize = Math.max(12, Math.min(130, o.size + delta));
        return { ...o, size: newSize };
      }
      return o;
    }));
  };

  // Overlay Dragging
  const handleOverlayMouseDown = (e, id, itemX, itemY) => {
    e.stopPropagation();
    if (activeMode === 'draw') return;
    setSelectedOverlayId(id);
    setDraggingOverlayId(id);
    const rect = mediaContainerRef.current ? mediaContainerRef.current.getBoundingClientRect() : containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragOffset({
      x: (clientX - rect.left) / rect.width - itemX,
      y: (clientY - rect.top) / rect.height - itemY
    });
  };

  const handleContainerMouseMove = (e) => {
    if (draggingOverlayId) {
      const targetBox = mediaContainerRef.current || containerRef.current;
      if (targetBox) {
        const rect = targetBox.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const newX = Math.max(-0.1, Math.min(0.9, (clientX - rect.left) / rect.width - dragOffset.x));
        const newY = Math.max(-0.1, Math.min(0.9, (clientY - rect.top) / rect.height - dragOffset.y));
        setOverlays(prev => prev.map(o => o.id === draggingOverlayId ? { ...o, x: newX, y: newY } : o));
      }
    }
    handlePointerMove(e);
  };

  const handleContainerMouseUp = (e) => {
    setDraggingOverlayId(null);
    handlePointerUp();
  };

  // Export & Submit Status
  const handlePostStatus = async () => {
    setIsExporting(true);
    if (!isVideo && canvasRef.current) {
      // For images: bake overlays into final canvas blob
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Draw all overlays onto canvas before export
      overlays.forEach(ov => {
        const xPos = ov.x * canvas.width;
        const yPos = ov.y * canvas.height;
        const fontSize = ov.size * (canvas.width / 400);
        ctx.save();
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textBaseline = 'top';
        if (ov.type === 'emoji') {
          ctx.fillText(ov.content, xPos, yPos);
        } else {
          const padding = fontSize * 0.3;
          const textWidth = ctx.measureText(ov.content).width;
          if (ov.bgStyle === 'dark') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.fillRect(xPos - padding, yPos - padding, textWidth + padding * 2, fontSize + padding * 2);
          } else if (ov.bgStyle === 'light') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fillRect(xPos - padding, yPos - padding, textWidth + padding * 2, fontSize + padding * 2);
          }
          ctx.fillStyle = ov.color;
          ctx.fillText(ov.content, xPos, yPos);
        }
        ctx.restore();
      });

      canvas.toBlob((blob) => {
        if (!blob) {
          setIsExporting(false);
          return;
        }
        const editedFile = new File([blob], file.name || 'status_edit.jpg', { type: 'image/jpeg' });
        onComplete({ file: editedFile, caption: caption.trim(), metadata: { is_video: false } });
        setIsExporting(false);
      }, 'image/jpeg', 0.92);
    } else {
      // For videos: retain quality without freezing CPU, pass trim points & overlay JSON to display during story playback!
      const metadata = {
        is_video: true,
        startTime: Number(startTime.toFixed(2)),
        endTime: Number(endTime.toFixed(2)),
        duration: Number(videoDuration.toFixed(2)),
        overlays: overlays.map(o => ({ ...o }))
      };
      onComplete({ file: file, caption: caption.trim(), metadata });
      setIsExporting(false);
    }
  };

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh',
      backgroundColor: '#0b141a', zIndex: 9999999, display: 'flex', flexDirection: 'column',
      color: '#FFFFFF', userSelect: 'none', overflow: 'hidden'
    }} 
    onMouseMove={handleContainerMouseMove} 
    onTouchMove={handleContainerMouseMove}
    onPointerMove={handleContainerMouseMove}
    onMouseUp={handleContainerMouseUp}
    onTouchEnd={handleContainerMouseUp}
    onPointerUp={handleContainerMouseUp}>
      
      {/* Top Controls Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 20px', backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 10,
        backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <button 
          onClick={onClose} 
          style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          title="Cancel"
        >
          <X size={26} />
          <span style={{ fontSize: '15px', fontWeight: '500' }}>Cancel</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {!isVideo && (
            <>
              <button 
                onClick={() => setActiveMode(activeMode === 'crop' ? null : 'crop')} 
                style={{ background: activeMode === 'crop' ? '#00a884' : 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#FFF', cursor: 'pointer', transition: 'all 0.2s' }}
                title="Crop and Rotate"
              >
                <Crop size={20} />
              </button>
              <button 
                onClick={() => setActiveMode(activeMode === 'draw' ? null : 'draw')} 
                style={{ background: activeMode === 'draw' ? '#EF4444' : 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#FFF', cursor: 'pointer', transition: 'all 0.2s' }}
                title="Pencil Doodle"
              >
                <Pencil size={20} />
              </button>
            </>
          )}
          
          {isVideo && (
            <button 
              onClick={() => setActiveMode(activeMode === 'trim' ? null : 'trim')} 
              style={{ background: activeMode === 'trim' ? '#00a884' : 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '20px', padding: '0 15px', height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#FFF', cursor: 'pointer', gap: '6px', fontWeight: 'bold' }}
              title="Trim Video"
            >
              <Scissors size={18} />
              <span>Trim</span>
            </button>
          )}

          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
            style={{ background: showEmojiPicker ? '#EAB308' : 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#FFF', cursor: 'pointer', transition: 'all 0.2s' }}
            title="Add Emoji Sticker"
          >
            <Smile size={22} />
          </button>

          <button 
            onClick={() => { setShowTextInput(true); setNewTextValue(''); }} 
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#FFF', cursor: 'pointer', transition: 'all 0.2s' }}
            title="Add Text"
          >
            <Type size={22} />
          </button>
        </div>
      </div>

      {/* Sub-toolbars based on active tool */}
      {!isVideo && activeMode === 'draw' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 20px', backgroundColor: 'rgba(0, 0, 0, 0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', marginRight: '4px', color: '#ccc' }}>COLOR:</span>
              {COLORS.map((c) => (
                <div 
                  key={c}
                  onClick={() => setDrawingColor(c)}
                  style={{
                    width: '26px', height: '26px', borderRadius: '50%', backgroundColor: c,
                    border: drawingColor === c ? '3px solid #FFF' : '2px solid transparent',
                    cursor: 'pointer', transform: drawingColor === c ? 'scale(1.2)' : 'scale(1)',
                    transition: 'all 0.15s', boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ccc' }}>SIZE:</span>
              {STROKE_WIDTHS.map((sw) => (
                <button
                  key={sw.value}
                  onClick={() => setStrokeWidth(sw.value)}
                  style={{
                    background: strokeWidth === sw.value ? '#EF4444' : 'rgba(255,255,255,0.15)',
                    border: 'none', borderRadius: '14px', padding: '4px 12px', color: '#FFF',
                    fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                  }}
                >
                  {sw.label}
                </button>
              ))}
              {strokes.length > 0 && (
                <button
                  onClick={handleUndoStroke}
                  style={{ background: '#374151', border: 'none', borderRadius: '6px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#FFF', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginLeft: '10px' }}
                >
                  <Undo size={15} /> Undo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!isVideo && activeMode === 'crop' && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', padding: '10px', backgroundColor: 'rgba(0, 0, 0, 0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ccc' }}>RATIO:</span>
          {['original', '9:16', '1:1', '4:3'].map(ratio => (
            <button
              key={ratio}
              onClick={() => setCropMode(ratio)}
              style={{
                background: cropMode === ratio ? '#00a884' : 'rgba(255,255,255,0.15)',
                border: 'none', borderRadius: '16px', padding: '6px 14px', color: '#FFF',
                fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px', cursor: 'pointer'
              }}
            >
              {ratio === 'original' ? 'Free / Original' : ratio}
            </button>
          ))}
          <button
            onClick={() => setRotation((prev) => (prev + 90) % 360)}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', padding: '6px 12px', color: '#FFF', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginLeft: '10px' }}
          >
            <RotateCw size={15} /> Rotate 90°
          </button>
        </div>
      )}

      {isVideo && activeMode === 'trim' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 30px', backgroundColor: 'rgba(0, 0, 0, 0.85)', borderBottom: '1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', color: '#10b981' }}>
            <span>Start: {startTime.toFixed(1)}s</span>
            <span>Selected Duration: {(endTime - startTime).toFixed(1)}s (Max 30s)</span>
            <span>End: {endTime.toFixed(1)}s</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '12px', width: '60px', color: '#aaa' }}>Start Cut</span>
            <input 
              type="range" min={0} max={Math.max(0, endTime - 1)} step={0.5} value={startTime}
              onChange={(e) => {
                const val = Number(e.target.value);
                setStartTime(val);
                if (videoRef.current) videoRef.current.currentTime = val;
              }}
              style={{ flex: 1, accentColor: '#10b981', cursor: 'pointer' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '12px', width: '60px', color: '#aaa' }}>End Cut</span>
            <input 
              type="range" min={Math.min(videoDuration, startTime + 1)} max={videoDuration} step={0.5} value={endTime}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val - startTime <= 30) setEndTime(val);
              }}
              style={{ flex: 1, accentColor: '#EF4444', cursor: 'pointer' }}
            />
          </div>
        </div>
      )}

      {/* Main Studio Workspace */}
      <div 
        ref={containerRef}
        style={{
          flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center',
          backgroundColor: '#060a0d', overflow: 'hidden', padding: '20px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget || e.target === mediaContainerRef.current || e.target === canvasRef.current) {
            setSelectedOverlayId(null);
          }
        }}
      >
        {/* Media Layer (Canvas for image, Video for video) */}
        <div ref={mediaContainerRef} style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.6)' }}>
          {!isVideo ? (
            <canvas 
              ref={canvasRef} 
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              style={{
                maxHeight: 'calc(100vh - 220px)', maxWidth: '85vw', display: 'block',
                cursor: activeMode === 'draw' ? 'crosshair' : 'default', borderRadius: '8px', touchAction: 'none'
              }}
            />
          ) : (
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <video
                ref={videoRef}
                src={mediaUrl}
                onLoadedMetadata={handleVideoLoadedMetadata}
                autoPlay
                loop
                controls
                playsInline
                style={{ maxHeight: 'calc(100vh - 220px)', maxWidth: '85vw', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
              />
              <button 
                onClick={() => {
                  if (videoRef.current) {
                    if (isPlaying) videoRef.current.pause();
                    else videoRef.current.play();
                    setIsPlaying(!isPlaying);
                  }
                }}
                style={{
                  position: 'absolute', bottom: '15px', left: '15px', background: 'rgba(0,0,0,0.6)', border: 'none',
                  borderRadius: '50%', width: '40px', height: '40px', color: '#FFF', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)'
                }}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
            </div>
          )}

          {/* Draggable Emojis and Text Overlays */}
          {overlays.map((ov) => {
            const isSelected = ov.id === selectedOverlayId;
            return (
              <div
                key={ov.id}
                onMouseDown={(e) => handleOverlayMouseDown(e, ov.id, ov.x, ov.y)}
                onTouchStart={(e) => handleOverlayMouseDown(e, ov.id, ov.x, ov.y)}
                onClick={(e) => { e.stopPropagation(); setSelectedOverlayId(ov.id); }}
                onWheel={(e) => {
                  if (isSelected) {
                    e.stopPropagation();
                    const delta = e.deltaY < 0 ? 5 : -5;
                    updateOverlaySize(ov.id, delta);
                  }
                }}
                style={{
                  position: 'absolute',
                  left: `${ov.x * 100}%`,
                  top: `${ov.y * 100}%`,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'move',
                  userSelect: 'none',
                  border: isSelected ? '2px dashed #00a884' : '1px solid transparent',
                  backgroundColor: ov.bgStyle === 'dark' ? 'rgba(0,0,0,0.7)' : (ov.bgStyle === 'light' ? 'rgba(255,255,255,0.85)' : 'transparent'),
                  color: ov.color,
                  fontSize: `${ov.size}px`,
                  fontWeight: ov.type === 'text' ? 'bold' : 'normal',
                  transition: isSelected ? 'none' : 'transform 0.1s',
                  transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                  zIndex: isSelected ? 50 : 20,
                  touchAction: 'none',
                  pointerEvents: activeMode === 'draw' ? 'none' : 'auto'
                }}
              >
                <span>{ov.content}</span>
                
                {isSelected && (
                  <div 
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute', top: '-48px', left: '50%', transform: 'translateX(-50%)',
                      display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#111b21',
                      padding: '6px 12px', borderRadius: '24px', boxShadow: '0 6px 16px rgba(0,0,0,0.85)',
                      border: '1px solid #2a3942', zIndex: 99999, whiteSpace: 'nowrap'
                    }}
                  >
                    <button
                      type="button"
                      onPointerDown={(e) => { e.stopPropagation(); updateOverlaySize(ov.id, -6); }}
                      onClick={(e) => { e.stopPropagation(); updateOverlaySize(ov.id, -6); }}
                      style={{ background: '#202c33', color: '#FFF', border: 'none', borderRadius: '50%', width: '30px', height: '30px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.4)' }}
                      title="Decrease Size"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => { e.stopPropagation(); updateOverlaySize(ov.id, 6); }}
                      onClick={(e) => { e.stopPropagation(); updateOverlaySize(ov.id, 6); }}
                      style={{ background: '#202c33', color: '#FFF', border: 'none', borderRadius: '50%', width: '30px', height: '30px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.4)' }}
                      title="Increase Size"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => { e.stopPropagation(); removeOverlay(ov.id); }}
                      onClick={(e) => { e.stopPropagation(); removeOverlay(ov.id); }}
                      style={{ background: '#ef4444', color: '#FFF', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', marginLeft: '4px', boxShadow: '0 2px 5px rgba(0,0,0,0.4)' }}
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Emoji Picker Popup Modal */}
        {showEmojiPicker && (
          <div style={{ position: 'absolute', top: '20px', right: '30px', zIndex: 100, backgroundColor: '#111b21', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', overflow: 'hidden', width: '320px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', background: '#202c33', borderBottom: '1px solid #2a3942', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Pick an Emoji to Add</span>
              <button onClick={() => setShowEmojiPicker(false)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '15px', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
              {['😍', '😂', '🔥', '❤️', '👏', '🎉', '🌟', '😮', '😎', '😜', '💖', '👑', '💯', '✨', '🌹', '🦋', '🥳', '🙌', '💪', '🎈', '⚡', '🌈', '🍭', '🍔'].map((em) => (
                <button
                  key={em}
                  onClick={() => {
                    addOverlay('emoji', em);
                    setShowEmojiPicker(false);
                  }}
                  style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', transition: 'transform 0.15s' }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.3)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add Text Dialog */}
        {showTextInput && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#111b21', padding: '25px', borderRadius: '14px', width: '380px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}><Type size={18} color="#00a884" /> Add Text Overlay</h3>
                <button onClick={() => setShowTextInput(false)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <input
                type="text"
                placeholder="Type something..."
                value={newTextValue}
                onChange={(e) => setNewTextValue(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '2px solid #202c33', backgroundColor: '#202c33', color: newTextColor, fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', outline: 'none' }}
              />
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px', fontWeight: '600' }}>TEXT COLOR:</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <div
                      key={c}
                      onClick={() => setNewTextColor(c)}
                      style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: c, border: newTextColor === c ? '3px solid #00a884' : '1px solid #555', cursor: 'pointer' }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px', fontWeight: '600' }}>BACKGROUND STYLE:</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { id: 'transparent', label: 'None' },
                    { id: 'dark', label: 'Dark Box' },
                    { id: 'light', label: 'Light Box' }
                  ].map(bg => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => setNewTextBg(bg.id)}
                      style={{ flex: 1, padding: '8px', borderRadius: '6px', border: newTextBg === bg.id ? '2px solid #00a884' : '1px solid #333', background: '#202c33', color: '#FFF', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowTextInput(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #333', background: 'transparent', color: '#ccc', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newTextValue.trim()) {
                      addOverlay('text', newTextValue.trim(), newTextColor, newTextBg);
                      setShowTextInput(false);
                    }
                  }}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#00a884', color: '#FFF', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Add to Story
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Caption & Post Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 24px',
        backgroundColor: '#111b21', borderTop: '1px solid rgba(255,255,255,0.08)', zIndex: 10
      }}>
        <input
          type="text"
          placeholder="Add a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          style={{
            flex: 1, padding: '12px 18px', borderRadius: '24px', border: 'none',
            backgroundColor: '#202c33', color: '#FFFFFF', fontSize: '15px', outline: 'none'
          }}
        />
        <button
          onClick={handlePostStatus}
          disabled={isExporting}
          style={{
            backgroundColor: isExporting ? '#555' : '#00a884',
            color: '#FFF', border: 'none', borderRadius: '50%', width: '48px', height: '48px',
            display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: isExporting ? 'wait' : 'pointer',
            boxShadow: '0 4px 12px rgba(0, 168, 132, 0.4)', transition: 'transform 0.2s',
            transform: isExporting ? 'scale(0.95)' : 'scale(1)'
          }}
          title="Post Status"
          onMouseOver={(e) => { if (!isExporting) e.currentTarget.style.transform = 'scale(1.06)'; }}
          onMouseOut={(e) => { if (!isExporting) e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <Send size={22} style={{ marginLeft: '2px' }} strokeWidth={2.5} />
        </button>
      </div>
    </div>,
    document.body
  );
}

export default StatusMediaEditorModal;

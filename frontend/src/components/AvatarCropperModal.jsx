import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';
import './AvatarCropperModal.css';

const AvatarCropperModal = ({ imageSrc, onComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      setIsProcessing(true);
      const croppedImageFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      onComplete(croppedImageFile);
    } catch (e) {
      console.error(e);
      onCancel();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="cropper-modal-overlay">
      <div className="cropper-modal-container">
        <div className="cropper-header">
          <div className="cropper-close" onClick={onCancel}>✕</div>
          <div className="cropper-title">Drag the image to adjust</div>
          <div className="cropper-upload" onClick={handleSave}>
            {isProcessing ? 'Saving...' : 'Upload'}
          </div>
        </div>
        
        <div className="cropper-body">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div className="cropper-footer">
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(e.target.value)}
            className="zoom-slider"
          />
        </div>

        <button className="cropper-fab" onClick={handleSave} disabled={isProcessing}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AvatarCropperModal;

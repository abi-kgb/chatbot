import { useState, useEffect } from 'react';
import { X, Download, FileText, FileSpreadsheet, FileCode, Send, Eye } from 'lucide-react';
import { getMediaUrl } from '../api';

function DocumentPreviewModal({ file, fileUrl, fileName, onClose, onSend }) {
  const [caption, setCaption] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileSizeStr, setFileSizeStr] = useState('');
  const [textContent, setTextContent] = useState(null);
  const [loadingText, setLoadingText] = useState(false);

  // Mode: 'presend' (if file Object passed) or 'view' (if fileUrl string passed)
  const isPreSend = Boolean(file);

  const actualFileName = fileName || (file ? file.name : (fileUrl ? fileUrl.split('/').pop() : 'Document'));
  const ext = actualFileName.split('.').pop().toLowerCase();

  const isPdf = ext === 'pdf';
  const isTxt = ['txt', 'csv', 'json', 'log', 'md', 'js', 'py', 'html', 'css', 'xml'].includes(ext);
  const isExcel = ['xls', 'xlsx', 'csv'].includes(ext);
  const isWord = ['doc', 'docx', 'rtf', 'odt', 'ppt', 'pptx'].includes(ext);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      const bytes = file.size || 0;
      if (bytes < 1024) setFileSizeStr(`${bytes} B`);
      else if (bytes < 1024 * 1024) setFileSizeStr(`${(bytes / 1024).toFixed(1)} KB`);
      else setFileSizeStr(`${(bytes / (1024 * 1024)).toFixed(1)} MB`);

      if (isTxt) {
        setLoadingText(true);
        const reader = new FileReader();
        reader.onload = (e) => {
          setTextContent(e.target.result);
          setLoadingText(false);
        };
        reader.readAsText(file);
      }

      return () => URL.revokeObjectURL(url);
    } else if (fileUrl) {
      const fullUrl = getMediaUrl(fileUrl);
      setPreviewUrl(fullUrl);

      if (isTxt) {
        setLoadingText(true);
        fetch(fullUrl)
          .then(res => res.text())
          .then(text => {
            setTextContent(text);
            setLoadingText(false);
          })
          .catch(() => setLoadingText(false));
      }
    }
  }, [file, fileUrl, isTxt]);

  if (!file && !fileUrl) return null;

  const getFileIcon = () => {
    if (isExcel) return <FileSpreadsheet size={44} color="#22c55e" />;
    if (isWord || isTxt) return <FileText size={44} color="#3b82f6" />;
    return <FileCode size={44} color="#eab308" />;
  };

  const handleSend = () => {
    if (onSend && file) {
      onSend(file, caption);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.88)', zIndex: 12000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)', padding: '20px'
    }} onClick={onClose}>
      
      {/* Modal Box */}
      <div 
        style={{
          width: '92vw', maxWidth: '920px', height: '84vh',
          backgroundColor: 'var(--bg-secondary)', borderRadius: '16px',
          border: '1px solid var(--border-color)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', backgroundColor: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-color)', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {getFileIcon()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '480px' }}>
                {actualFileName}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                {ext.toUpperCase()} Document {fileSizeStr && `• ${fileSizeStr}`} {isPreSend ? '(Preview Before Send)' : ''}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!isPreSend && (
              <a
                href={previewUrl}
                download={actualFileName}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '20px', backgroundColor: '#00a884',
                  color: 'white', fontWeight: '600', fontSize: '13px', textDecoration: 'none'
                }}
              >
                <Download size={16} /> Download
              </a>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex'
              }}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Preview Viewport */}
        <div style={{ flex: 1, backgroundColor: '#0b141a', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {isPdf ? (
            <object
              data={previewUrl}
              type="application/pdf"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            >
              <iframe
                src={previewUrl}
                title="PDF Document Preview"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </object>
          ) : isTxt ? (
            <div style={{ width: '100%', height: '100%', overflowY: 'auto', padding: '20px', backgroundColor: '#0f172a', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.6' }}>
              {loadingText ? (
                <p style={{ textAlign: 'center', color: '#94a3b8' }}>Loading document text...</p>
              ) : textContent ? (
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{textContent}</pre>
              ) : (
                <p style={{ textAlign: 'center', color: '#94a3b8' }}>No text preview available.</p>
              )}
            </div>
          ) : (
            /* Document Card Preview Container for Word / Excel / Office Files */
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
              padding: '40px 32px', backgroundColor: 'var(--bg-primary)', borderRadius: '16px',
              border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              textAlign: 'center', maxWidth: '460px'
            }}>
              <div style={{ padding: '22px', borderRadius: '50%', backgroundColor: 'rgba(0,168,132,0.1)' }}>
                {getFileIcon()}
              </div>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {actualFileName}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {ext.toUpperCase()} Document {fileSizeStr && `• ${fileSizeStr}`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <a
                  href={previewUrl}
                  download={actualFileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 18px', borderRadius: '20px', backgroundColor: '#00a884',
                    color: 'white', fontWeight: '600', fontSize: '13px', textDecoration: 'none'
                  }}
                >
                  <Download size={16} /> Download File
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar (For Pre-Send Mode) */}
        {isPreSend && (
          <div style={{
            padding: '14px 20px', backgroundColor: 'var(--bg-primary)',
            borderTop: '1px solid var(--border-color)', display: 'flex',
            alignItems: 'center', gap: '12px'
          }}>
            <input
              type="text"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Add a caption..."
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: '24px',
                border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontSize: '14px', outline: 'none'
              }}
            />
            <button
              onClick={handleSend}
              style={{
                width: '46px', height: '46px', borderRadius: '50%',
                backgroundColor: '#00a884', color: 'white', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,168,132,0.4)'
              }}
              title="Send Document"
            >
              <Send size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentPreviewModal;

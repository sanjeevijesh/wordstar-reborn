import { useState, useRef, useEffect } from 'react';
import './Dialog.css';

export function ImportLegacyDialog({ onClose, file, onImport }) {
  const [cleanupMode, setCleanupMode] = useState(true);

  if (!file) return null;

  return (
    <div className="dialog-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="dialog-box" role="dialog" aria-modal="true">
        <div className="dialog-title-bar">
          <span>═ LEGACY FILE IMPORTER ═</span>
          <button className="dialog-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="dialog-body">
          <div className="dialog-info-text" style={{ marginBottom: '12px' }}>
            <strong>Choose file:</strong> {file.name}<br />
            <strong>Size:</strong> {(file.size / 1024).toFixed(1)} KB<br />
            <strong>Detected:</strong> {file.name.match(/\.(ws|doc|txt|asc)$/i) ? 'DOS / WordStar Encoding' : 'Unknown Encoding'}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="dialog-checkbox-row">
              <input 
                type="radio" 
                name="importMode" 
                checked={!cleanupMode} 
                onChange={() => setCleanupMode(false)} 
              />
              <span style={{ color: !cleanupMode ? 'var(--text-highlight)' : 'inherit' }}>
                Classic Fidelity Mode
              </span>
            </label>
            <div className="dialog-info-text" style={{ marginLeft: '22px', fontSize: '11px', marginBottom: '8px' }}>
              Keep exact spacing, original line endings, and tabs.
            </div>

            <label className="dialog-checkbox-row">
              <input 
                type="radio" 
                name="importMode" 
                checked={cleanupMode} 
                onChange={() => setCleanupMode(true)} 
              />
              <span style={{ color: cleanupMode ? 'var(--text-highlight)' : 'inherit' }}>
                Modern Cleanup Mode
              </span>
            </label>
            <div className="dialog-info-text" style={{ marginLeft: '22px', fontSize: '11px' }}>
              Strip high-bit characters, normalize spacing, and clean formatting codes.
            </div>
          </div>

          <div className="dialog-actions">
            <button className="dialog-btn primary" onClick={() => onImport(cleanupMode)}>Import File</button>
            <button className="dialog-btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

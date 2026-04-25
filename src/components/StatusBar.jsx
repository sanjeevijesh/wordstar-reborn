import { useState, useEffect } from 'react';
import './StatusBar.css';

export default function StatusBar({
  line, col, mode, saveState, fileName,
  wordWrap, lineNumbers, blockActive,
  charCount, wordCount,
}) {
  const [time, setTime] = useState('');
  const [autosaveFlash, setAutosaveFlash] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const t = setInterval(update, 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (saveState === 'saved') {
      setAutosaveFlash(true);
      const t = setTimeout(() => setAutosaveFlash(false), 2000);
      return () => clearTimeout(t);
    }
  }, [saveState]);

  const getSaveLabel = () => {
    if (saveState === 'saving') return { cls: 'saving', text: 'SAVING...' };
    if (saveState === 'modified') return { cls: 'modified', text: 'MODIFIED' };
    return { cls: 'saved', text: 'Saved' };
  };

  const { cls, text } = getSaveLabel();

  return (
    <div className="status-bar">
      <div className="status-segment">
        <span className="label">Ln:</span>
        <span className="value">{line}</span>
        <span className="label">Col:</span>
        <span className="value">{col}</span>
      </div>

      <div className="status-segment mode">
        <span className="value">{mode === 'insert' ? 'INS' : 'OVR'}</span>
      </div>

      <div className="status-segment save-state">
        <span className={`value ${cls}`}>{text}</span>
      </div>

      <div className="status-segment file">
        <span className="label">File:</span>
        <span className="value">{fileName || 'untitled.txt'}</span>
      </div>

      <div className="status-segment">
        <span className="label">W:</span>
        <span className="value">{wordCount}</span>
        <span className="label"> Ch:</span>
        <span className="value">{charCount}</span>
      </div>

      {wordWrap && (
        <div className="status-segment">
          <span className="value" style={{ color: 'var(--text-dim)', fontSize: '11px' }}>WRAP</span>
        </div>
      )}

      {blockActive && (
        <div className="status-segment">
          <span className="value" style={{ color: 'var(--text-highlight)', fontSize: '11px' }}>BLOCK</span>
        </div>
      )}

      <div className="status-spacer" />

      {autosaveFlash && (
        <span className="status-autosave-flash">✓ Auto-saved</span>
      )}

      <div className="status-time">{time}</div>
    </div>
  );
}

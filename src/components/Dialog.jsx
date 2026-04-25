import { useEffect, useRef, useState } from 'react';
import './Dialog.css';

/* ─── Generic Dialog Wrapper ───────────────────────────── */
export function Dialog({ title, onClose, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="dialog-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="dialog-box" role="dialog" aria-modal="true">
        <div className="dialog-title-bar">
          <span>{title}</span>
          <button className="dialog-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  );
}

/* ─── Find Dialog ───────────────────────────────────────── */
export function FindDialog({ onClose, onFind, onFindNext, onFindPrev, content }) {
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [resultInfo, setResultInfo] = useState('');
  const inputRef = useRef(null);

  useEffect(() => inputRef.current?.focus(), []);

  const countMatches = (q) => {
    if (!q) return 0;
    const text = caseSensitive ? content : content.toLowerCase();
    const search = caseSensitive ? q : q.toLowerCase();
    let count = 0;
    let idx = 0;
    while ((idx = text.indexOf(search, idx)) !== -1) { count++; idx++; }
    return count;
  };

  const handleFind = (dir = 1) => {
    if (!query) return;
    const count = countMatches(query);
    if (count === 0) {
      setResultInfo('not-found:Not found');
    } else {
      setResultInfo(`found:${count} match${count !== 1 ? 'es' : ''} found`);
      dir === 1 ? onFindNext?.(query, caseSensitive) : onFindPrev?.(query, caseSensitive);
    }
  };

  const [infoClass, infoText] = resultInfo.split(':');

  return (
    <Dialog title="═ FIND TEXT ═" onClose={onClose}>
      <div className="dialog-field">
        <label>Search for:</label>
        <input
          ref={inputRef}
          id="find-input"
          className="dialog-input"
          value={query}
          onChange={e => { setQuery(e.target.value); setResultInfo(''); }}
          onKeyDown={e => { if (e.key === 'Enter') handleFind(1); }}
          placeholder="Enter search text..."
        />
        <div className={`find-result-info ${infoClass || ''}`}>{infoText || ' '}</div>
      </div>
      <label className="dialog-checkbox-row">
        <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} />
        Case sensitive
      </label>
      <div className="dialog-actions">
        <button className="dialog-btn" onClick={() => handleFind(-1)}>◀ Prev</button>
        <button className="dialog-btn primary" onClick={() => handleFind(1)}>Find Next ▶</button>
        <button className="dialog-btn" onClick={onClose}>Cancel</button>
      </div>
    </Dialog>
  );
}

/* ─── Replace Dialog ────────────────────────────────────── */
export function ReplaceDialog({ onClose, onReplace, onReplaceAll, content }) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [resultInfo, setResultInfo] = useState('');
  const inputRef = useRef(null);

  useEffect(() => inputRef.current?.focus(), []);

  const handleReplace = () => {
    if (!query) return;
    onReplace?.(query, replacement, caseSensitive);
    setResultInfo('found:Replaced next match');
  };

  const handleReplaceAll = () => {
    if (!query) return;
    const count = onReplaceAll?.(query, replacement, caseSensitive);
    setResultInfo(`found:Replaced ${count ?? 0} occurrence(s)`);
  };

  const [infoClass, infoText] = resultInfo.split(':');

  return (
    <Dialog title="═ FIND & REPLACE ═" onClose={onClose}>
      <div className="dialog-field">
        <label>Find:</label>
        <input ref={inputRef} id="replace-find-input" className="dialog-input" value={query}
          onChange={e => setQuery(e.target.value)} placeholder="Search text..." />
      </div>
      <div className="dialog-field">
        <label>Replace with:</label>
        <input id="replace-with-input" className="dialog-input" value={replacement}
          onChange={e => setReplacement(e.target.value)} placeholder="Replacement..." />
        <div className={`find-result-info ${infoClass || ''}`}>{infoText || ' '}</div>
      </div>
      <label className="dialog-checkbox-row">
        <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} />
        Case sensitive
      </label>
      <div className="dialog-actions">
        <button className="dialog-btn" onClick={handleReplace}>Replace</button>
        <button className="dialog-btn primary" onClick={handleReplaceAll}>Replace All</button>
        <button className="dialog-btn" onClick={onClose}>Cancel</button>
      </div>
    </Dialog>
  );
}

/* ─── Go To Line Dialog ─────────────────────────────────── */
export function GoToLineDialog({ onClose, onGo, lineCount }) {
  const [lineNum, setLineNum] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => inputRef.current?.focus(), []);

  const handleGo = () => {
    const n = parseInt(lineNum, 10);
    if (isNaN(n) || n < 1 || n > lineCount) {
      setError(`Enter a line between 1 and ${lineCount}`);
      return;
    }
    onGo?.(n);
    onClose?.();
  };

  return (
    <Dialog title="═ GO TO LINE ═" onClose={onClose}>
      <div className="dialog-field">
        <label>Line number (1–{lineCount}):</label>
        <input
          ref={inputRef}
          id="goto-line-input"
          className="dialog-input"
          type="number"
          min="1"
          max={lineCount}
          value={lineNum}
          onChange={e => { setLineNum(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') handleGo(); }}
        />
        {error && <div className="find-result-info not-found">{error}</div>}
      </div>
      <div className="dialog-actions">
        <button className="dialog-btn primary" onClick={handleGo}>Go</button>
        <button className="dialog-btn" onClick={onClose}>Cancel</button>
      </div>
    </Dialog>
  );
}

/* ─── Shortcuts Help Dialog ─────────────────────────────── */
const SHORTCUT_SECTIONS = [
  {
    title: 'CURSOR MOVEMENT (WordStar Diamond)',
    rows: [
      ['Ctrl+E', 'Move up'],
      ['Ctrl+X', 'Move down'],
      ['Ctrl+S', 'Move left'],
      ['Ctrl+D', 'Move right'],
      ['Ctrl+A', 'Word left'],
      ['Ctrl+F', 'Word right'],
      ['Ctrl+Q S', 'Start of line'],
      ['Ctrl+Q D', 'End of line'],
      ['Ctrl+Q R', 'Top of file'],
      ['Ctrl+Q C', 'End of file'],
      ['Ctrl+Q I', 'Go to line'],
    ]
  },
  {
    title: 'EDITING',
    rows: [
      ['Ctrl+Y', 'Delete current line'],
      ['Ctrl+G', 'Delete character at cursor'],
      ['Ctrl+T', 'Delete word right'],
      ['Ctrl+H', 'Backspace'],
      ['Ctrl+I', 'Tab'],
      ['Ctrl+M', 'Enter (new line)'],
      ['Ctrl+Z / Ctrl+U', 'Undo'],
      ['Ins', 'Toggle Insert/Overwrite'],
    ]
  },
  {
    title: 'FILE OPERATIONS',
    rows: [
      ['Ctrl+K S', 'Save file'],
      ['Ctrl+K D', 'Open file'],
      ['Ctrl+K Q', 'Quit'],
      ['Ctrl+N', 'New file'],
    ]
  },
  {
    title: 'BLOCK OPERATIONS',
    rows: [
      ['Ctrl+K B', 'Begin block mark'],
      ['Ctrl+K K', 'End block mark'],
      ['Ctrl+K C', 'Copy block'],
      ['Ctrl+K V', 'Move block'],
      ['Ctrl+K Y', 'Delete block'],
    ]
  },
  {
    title: 'SEARCH',
    rows: [
      ['Ctrl+Q F', 'Find text'],
      ['Ctrl+Q A', 'Find & Replace'],
      ['Ctrl+L', 'Find next'],
    ]
  },
  {
    title: 'DISPLAY',
    rows: [
      ['Ctrl+W', 'Toggle word wrap'],
      ['Ctrl+P', 'Print'],
    ]
  },
];

export function ShortcutsDialog({ onClose }) {
  return (
    <Dialog title="═ KEYBOARD SHORTCUTS ═" onClose={onClose}>
      <div className="dialog-scrollable">
        {SHORTCUT_SECTIONS.map(section => (
          <div key={section.title} className="shortcuts-section">
            <div className="shortcuts-section-title">{section.title}</div>
            <table className="shortcuts-table">
              <tbody>
                {section.rows.map(([key, desc]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <div className="dialog-actions" style={{ marginTop: '12px' }}>
        <button className="dialog-btn primary" onClick={onClose}>Close</button>
      </div>
    </Dialog>
  );
}

/* ─── Save As Dialog ────────────────────────────────────── */
export function SaveAsDialog({ onClose, onSave, currentName }) {
  const [name, setName] = useState(currentName || 'document.txt');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave?.(name.trim());
    onClose?.();
  };

  return (
    <Dialog title="═ SAVE AS ═" onClose={onClose}>
      <div className="dialog-field">
        <label>File name:</label>
        <input
          ref={inputRef}
          id="save-as-input"
          className="dialog-input"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
        />
      </div>
      <div className="dialog-actions">
        <button className="dialog-btn primary" onClick={handleSave}>Save</button>
        <button className="dialog-btn" onClick={onClose}>Cancel</button>
      </div>
    </Dialog>
  );
}

/* ─── Confirm Dialog ────────────────────────────────────── */
export function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <Dialog title={title || '═ CONFIRM ═'} onClose={onCancel}>
      <div className="dialog-info-text" style={{ marginBottom: '16px' }}>{message}</div>
      <div className="dialog-actions">
        <button className="dialog-btn primary" onClick={onConfirm}>Yes</button>
        <button className="dialog-btn" onClick={onCancel}>No</button>
      </div>
    </Dialog>
  );
}

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import './Editor.css';
import { playKeyClick } from '../utils/audio';

const Editor = forwardRef(function Editor(
  { content, onChange, wordWrap, lineNumbers, mode, currentLine, onCursorChange, soundEnabled, margin = 78, onMarginChange },
  ref
) {
  const textareaRef = useRef(null);
  const lineNumRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    getTextarea: () => textareaRef.current,
    insertText: (text) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = content.slice(0, start) + text + content.slice(end);
      onChange(newVal);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + text.length;
      }, 0);
    },
    moveCursor: (pos) => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.selectionStart = ta.selectionEnd = pos;
      ta.focus();
    },
    getSelection: () => {
      const ta = textareaRef.current;
      return { start: ta?.selectionStart ?? 0, end: ta?.selectionEnd ?? 0 };
    },
    setSelection: (start, end) => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.selectionStart = start;
      ta.selectionEnd = end ?? start;
    },
  }), [content, onChange]);

  // Sync line numbers scroll
  useEffect(() => {
    const ta = textareaRef.current;
    const ln = lineNumRef.current;
    if (!ta || !ln) return;
    const handler = () => { ln.scrollTop = ta.scrollTop; };
    ta.addEventListener('scroll', handler);
    return () => ta.removeEventListener('scroll', handler);
  }, []);

  // Report cursor position
  const reportCursor = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const text = ta.value.slice(0, pos);
    const lines = text.split('\n');
    const ln = lines.length;
    const col = lines[lines.length - 1].length + 1;
    onCursorChange?.(ln, col, pos);
  }, [onCursorChange]);

  const handleSelect = () => reportCursor();
  const handleClick = () => reportCursor();
  const handleKeyUp = () => reportCursor();
  const handleKeyDown = (e) => {
    // Exclude modifiers
    if (!['Control', 'Shift', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
      if (soundEnabled) playKeyClick();
    }
  };

  const handleChange = (e) => {
    const ta = e.target;
    let val = ta.value;
    let pos = ta.selectionStart;

    // WordStar Hard Auto-Wrap Logic
    if (wordWrap) {
      // Find start and end of the current line being edited
      let lineStart = val.lastIndexOf('\n', pos - 1);
      lineStart = lineStart === -1 ? 0 : lineStart + 1;
      
      let lineEnd = val.indexOf('\n', pos);
      lineEnd = lineEnd === -1 ? val.length : lineEnd;
      
      const currentLine = val.slice(lineStart, lineEnd);
      
      // If the line exceeds margin chars, wrap the last word to the next line
      if (currentLine.length > margin) {
        // Find the last space within the margin limit
        const spaceIdx = currentLine.lastIndexOf(' ', margin);
        
        if (spaceIdx > 0) {
          // Swap the space for a newline
          val = val.substring(0, lineStart + spaceIdx) + '\n' + val.substring(lineStart + spaceIdx + 1);
        }
      }
    }

    onChange(val);
    
    // Ensure cursor stays in the right place after React re-renders
    setTimeout(() => {
      if (ta) {
        ta.selectionStart = ta.selectionEnd = pos;
        reportCursor();
      }
    }, 0);
  };

  // Build ruler
  const buildRuler = () => {
    const maxCols = 150;
    const elements = [];
    for (let i = 1; i <= maxCols; i++) {
      let char = '-';
      if (i === 1) char = 'L';
      else if (i === margin) char = 'R';
      else if ((i - 1) % 5 === 0) char = '!';

      elements.push(
        <span 
          key={i} 
          onClick={() => {
             if (i === margin) {
                const newMarg = prompt("Set right margin:", margin);
                if (newMarg && !isNaN(newMarg)) {
                   onMarginChange?.(parseInt(newMarg, 10));
                }
             } else {
                onMarginChange?.(i);
             }
          }}
          style={{ 
            cursor: 'pointer', 
            color: i > margin ? 'var(--text-dim)' : 'inherit',
            opacity: i > margin ? 0.5 : 1
          }}
          title={`Click to set margin to ${i}`}
        >
          {char}
        </span>
      );
    }
    return elements;
  };

  // Line numbers
  const lines = content.split('\n');
  const lineCount = lines.length;

  return (
    <div className="editor-container">
      {lineNumbers && (
        <div className="line-numbers-wrapper" style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, width: '48px', background: 'var(--bg-secondary)', borderRight: '1px solid var(--text-dim)' }}>
          {/* Fake ruler header to perfectly align with textarea's real ruler */}
          <div style={{ height: '18px', borderBottom: '1px solid var(--text-dim)', flexShrink: 0 }} />
          <div className="line-numbers" ref={lineNumRef} style={{ width: '100%', borderRight: 'none' }}>
            {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              className={`line-number ${i + 1 === currentLine ? 'current' : ''}`}
            >
              {i + 1}
            </div>
          ))}
          </div>
        </div>
      )}

      <div className="editor-main">
        <div className="editor-ruler" aria-hidden="true">
          {buildRuler()}
        </div>
        <textarea
          ref={textareaRef}
          id="main-editor"
          className={`editor-textarea ${wordWrap ? 'wrap' : 'no-wrap'} ${mode === 'overwrite' ? 'overwrite' : ''}`}
          value={content}
          onChange={handleChange}
          onSelect={handleSelect}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          aria-label="Text editor"
          aria-multiline="true"
        />
      </div>
    </div>
  );
});

export default Editor;

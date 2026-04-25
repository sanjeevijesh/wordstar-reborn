import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import './Editor.css';

const Editor = forwardRef(function Editor(
  { content, onChange, wordWrap, lineNumbers, mode, currentLine, onCursorChange },
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

  const handleChange = (e) => {
    onChange(e.target.value);
    reportCursor();
  };

  // Build ruler
  const buildRuler = () => {
    const cols = 80;
    let ruler = '';
    for (let i = 1; i <= cols; i++) {
      if (i % 10 === 0) ruler += String(i / 10);
      else if (i % 5 === 0) ruler += '+';
      else ruler += '·';
    }
    return ruler;
  };

  // Line numbers
  const lines = content.split('\n');
  const lineCount = lines.length;

  return (
    <div className="editor-container">
      {lineNumbers && (
        <div className="line-numbers" ref={lineNumRef}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              className={`line-number ${i + 1 === currentLine ? 'current' : ''}`}
            >
              {i + 1}
            </div>
          ))}
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

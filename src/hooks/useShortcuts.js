/* ─────────────────────────────────────────────────────────
   useShortcuts.js — WordStar Keyboard Shortcut Engine
   Handles single-key Ctrl shortcuts AND sequential prefix
   shortcuts (Ctrl+K then S, Ctrl+Q then F, etc.)
───────────────────────────────────────────────────────── */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Move cursor by lines/cols within a textarea
 * Returns the new cursor position index
 */
function moveCursorInTextarea(ta, direction) {
  const value = ta.value;
  const pos = ta.selectionStart;

  switch (direction) {
    case 'left': return Math.max(0, pos - 1);
    case 'right': return Math.min(value.length, pos + 1);
    case 'up': {
      const before = value.slice(0, pos);
      const lines = before.split('\n');
      if (lines.length <= 1) return 0;
      const col = lines[lines.length - 1].length;
      const prevLine = lines[lines.length - 2];
      const newCol = Math.min(col, prevLine.length);
      return before.lastIndexOf('\n', pos - 1) - prevLine.length + newCol;
    }
    case 'down': {
      const after = value.slice(pos);
      const nlPos = after.indexOf('\n');
      if (nlPos === -1) return value.length;
      const before = value.slice(0, pos);
      const lines = before.split('\n');
      const col = lines[lines.length - 1].length;
      const afterNl = value.slice(pos + nlPos + 1);
      const nextLineLen = afterNl.indexOf('\n') === -1
        ? afterNl.length
        : afterNl.indexOf('\n');
      return pos + nlPos + 1 + Math.min(col, nextLineLen);
    }
    case 'word-left': {
      let i = pos - 1;
      while (i > 0 && /\s/.test(value[i])) i--;
      while (i > 0 && !/\s/.test(value[i - 1])) i--;
      return i;
    }
    case 'word-right': {
      let i = pos;
      while (i < value.length && !/\s/.test(value[i])) i++;
      while (i < value.length && /\s/.test(value[i])) i++;
      return i;
    }
    case 'line-start': {
      const before = value.slice(0, pos);
      const nl = before.lastIndexOf('\n');
      return nl === -1 ? 0 : nl + 1;
    }
    case 'line-end': {
      const after = value.slice(pos);
      const nl = after.indexOf('\n');
      return nl === -1 ? value.length : pos + nl;
    }
    case 'file-start': return 0;
    case 'file-end': return value.length;
    default: return pos;
  }
}

export default function useShortcuts({
  editorRef,
  content,
  onChange,
  onSave,
  onOpen,
  onNew,
  onQuit,
  onFind,
  onReplace,
  onGoToLine,
  onToggleWordWrap,
  onToggleInsert,
  onPrint,
  onUndo,
  onRedo,
  onBlockBegin,
  onBlockEnd,
  onBlockCopy,
  onBlockMove,
  onBlockDelete,
  onFindNext,
  onSetPrefixKey,
  insertMode,
  onFormatCenter,
  onFormatBold,
  onFormatUnderline,
  onFormatTotal,
  onFormatGST,
}) {
  const prefixRef = useRef(null); // 'K' or 'Q'
  const prefixTimeout = useRef(null);

  const clearPrefix = useCallback(() => {
    prefixRef.current = null;
    onSetPrefixKey?.(null);
    clearTimeout(prefixTimeout.current);
  }, [onSetPrefixKey]);

  const setPrefix = useCallback((key) => {
    prefixRef.current = key;
    onSetPrefixKey?.(key);
    // Auto-clear prefix if no second key in 3 seconds
    clearTimeout(prefixTimeout.current);
    prefixTimeout.current = setTimeout(clearPrefix, 3000);
  }, [clearPrefix, onSetPrefixKey]);

  const getTA = () => editorRef.current?.getTextarea();

  const deleteLine = useCallback(() => {
    const ta = getTA();
    if (!ta) return;
    const value = ta.value;
    const pos = ta.selectionStart;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const lineStart = before.lastIndexOf('\n') + 1;
    const lineEnd = after.indexOf('\n');
    const newVal =
      value.slice(0, lineStart) +
      (lineEnd === -1 ? '' : value.slice(pos + lineEnd + 1));
    onChange(newVal);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = lineStart; }, 0);
  }, [onChange]);

  const deleteChar = useCallback(() => {
    const ta = getTA();
    if (!ta) return;
    const pos = ta.selectionStart;
    if (pos >= ta.value.length) return;
    const newVal = ta.value.slice(0, pos) + ta.value.slice(pos + 1);
    onChange(newVal);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = pos; }, 0);
  }, [onChange]);

  const deleteWord = useCallback(() => {
    const ta = getTA();
    if (!ta) return;
    const pos = ta.selectionStart;
    const value = ta.value;
    let end = pos;
    while (end < value.length && !/\s/.test(value[end])) end++;
    while (end < value.length && /\s/.test(value[end])) end++;
    const newVal = value.slice(0, pos) + value.slice(end);
    onChange(newVal);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = pos; }, 0);
  }, [onChange]);

  useEffect(() => {
    const ta = getTA();
    if (!ta) return;

    const handleKeyDown = (e) => {
      const ctrl = e.ctrlKey && !e.altKey;
      const key = e.key.toUpperCase();

      // ── Sequential prefix: Ctrl+K or Ctrl+Q ──────────────────
      if (prefixRef.current) {
        const prefix = prefixRef.current;
        clearPrefix();
        e.preventDefault();

        if (prefix === 'K') {
          switch (key) {
            case 'S': onSave?.(); break;
            case 'D': onOpen?.(); break;
            case 'Q': onQuit?.(); break;
            case 'B': onBlockBegin?.(); break;
            case 'K': onBlockEnd?.(); break;
            case 'C': onBlockCopy?.(); break;
            case 'V': onBlockMove?.(); break;
            case 'Y': onBlockDelete?.(); break;
            case 'N': onNew?.(); break;
            default: break;
          }
        } else if (prefix === 'Q') {
          switch (key) {
            case 'S': {
              const ta2 = getTA();
              if (ta2) {
                const pos = moveCursorInTextarea(ta2, 'line-start');
                ta2.selectionStart = ta2.selectionEnd = pos;
              }
              break;
            }
            case 'D': {
              const ta2 = getTA();
              if (ta2) {
                const pos = moveCursorInTextarea(ta2, 'line-end');
                ta2.selectionStart = ta2.selectionEnd = pos;
              }
              break;
            }
            case 'R': {
              const ta2 = getTA();
              if (ta2) ta2.selectionStart = ta2.selectionEnd = 0;
              break;
            }
            case 'C': {
              const ta2 = getTA();
              if (ta2) ta2.selectionStart = ta2.selectionEnd = ta2.value.length;
              break;
            }
            case 'F': onFind?.(); break;
            case 'A': onReplace?.(); break;
            case 'I': onGoToLine?.(); break;
            default: break;
          }
        }
        return;
      }

      // ── Single Ctrl shortcuts ─────────────────────────────────
      if (ctrl) {
        switch (key) {
          // Modern Formatting
          case 'C': 
            if (e.shiftKey) { e.preventDefault(); onFormatCenter?.(); return; }
            break;
          case 'G':
            if (e.shiftKey) { e.preventDefault(); onFormatGST?.(); return; }
            e.preventDefault(); deleteChar(); return;
          case 'T':
            if (e.shiftKey) { e.preventDefault(); onFormatTotal?.(); return; }
            e.preventDefault(); deleteWord(); return;
          case 'B': e.preventDefault(); onFormatBold?.(); return;
          case 'U': e.preventDefault(); onFormatUnderline?.(); return;

          // Prefix keys
          case 'K': e.preventDefault(); setPrefix('K'); return;
          case 'Q': e.preventDefault(); setPrefix('Q'); return;

          // WordStar diamond movement
          case 'E': {
            e.preventDefault();
            const ta2 = getTA();
            if (ta2) { const p = moveCursorInTextarea(ta2, 'up'); ta2.selectionStart = ta2.selectionEnd = p; }
            return;
          }
          case 'X': {
            e.preventDefault();
            const ta2 = getTA();
            if (ta2) { const p = moveCursorInTextarea(ta2, 'down'); ta2.selectionStart = ta2.selectionEnd = p; }
            return;
          }
          case 'S': {
            e.preventDefault();
            const ta2 = getTA();
            if (ta2) { const p = moveCursorInTextarea(ta2, 'left'); ta2.selectionStart = ta2.selectionEnd = p; }
            return;
          }
          case 'D': {
            e.preventDefault();
            const ta2 = getTA();
            if (ta2) { const p = moveCursorInTextarea(ta2, 'right'); ta2.selectionStart = ta2.selectionEnd = p; }
            return;
          }
          case 'A': {
            e.preventDefault();
            const ta2 = getTA();
            if (ta2) { const p = moveCursorInTextarea(ta2, 'word-left'); ta2.selectionStart = ta2.selectionEnd = p; }
            return;
          }
          case 'F': {
            e.preventDefault();
            const ta2 = getTA();
            if (ta2) { const p = moveCursorInTextarea(ta2, 'word-right'); ta2.selectionStart = ta2.selectionEnd = p; }
            return;
          }

          // Editing
          case 'Y': e.preventDefault(); deleteLine(); return;
          case 'G': if (e.shiftKey) return; e.preventDefault(); deleteChar(); return;
          case 'H': {
            e.preventDefault();
            const ta2 = getTA();
            if (!ta2) return;
            const pos = ta2.selectionStart;
            if (pos === 0) return;
            const newVal = ta2.value.slice(0, pos - 1) + ta2.value.slice(pos);
            onChange(newVal);
            setTimeout(() => { ta2.selectionStart = ta2.selectionEnd = pos - 1; }, 0);
            return;
          }
          case 'I': {
            // Tab
            e.preventDefault();
            const ta2 = getTA();
            if (!ta2) return;
            const pos = ta2.selectionStart;
            const newVal = ta2.value.slice(0, pos) + '\t' + ta2.value.slice(pos);
            onChange(newVal);
            setTimeout(() => { ta2.selectionStart = ta2.selectionEnd = pos + 1; }, 0);
            return;
          }
          case 'M': {
            // Enter
            e.preventDefault();
            const ta2 = getTA();
            if (!ta2) return;
            const pos = ta2.selectionStart;
            const newVal = ta2.value.slice(0, pos) + '\n' + ta2.value.slice(pos);
            onChange(newVal);
            setTimeout(() => { ta2.selectionStart = ta2.selectionEnd = pos + 1; }, 0);
            return;
          }

          // Word wrap
          case 'W': e.preventDefault(); onToggleWordWrap?.(); return;

          // Undo/Redo
          case 'Z': /* let browser handle */ return;

          // Find next
          case 'L': e.preventDefault(); onFindNext?.(); return;

          // Print
          case 'P': e.preventDefault(); onPrint?.(); return;

          // New file
          case 'N': e.preventDefault(); onNew?.(); return;

          default: break;
        }
      }

      // Insert key — toggle insert/overwrite
      if (e.key === 'Insert') {
        e.preventDefault();
        onToggleInsert?.();
        return;
      }

      // F1 — shortcuts help
      if (e.key === 'F1') {
        e.preventDefault();
        onFind?.(); // reuse to open shortcuts dialog (handled in App)
        return;
      }
    };

    ta.addEventListener('keydown', handleKeyDown);
    return () => ta.removeEventListener('keydown', handleKeyDown);
  }, [
    content, onChange,
    onSave, onOpen, onNew, onQuit,
    onFind, onReplace, onGoToLine,
    onToggleWordWrap, onToggleInsert,
    onPrint, onUndo, onRedo,
    onBlockBegin, onBlockEnd, onBlockCopy, onBlockMove, onBlockDelete,
    onFindNext,
    deleteLine, deleteChar, deleteWord,
    setPrefix, clearPrefix, insertMode,
    onFormatCenter, onFormatBold, onFormatUnderline, onFormatTotal, onFormatGST
  ]);

  return null;
}

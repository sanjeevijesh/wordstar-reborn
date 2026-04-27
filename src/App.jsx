import { useState, useCallback, useRef, useEffect } from 'react';
import './App.css';

import BootScreen from './components/BootScreen';
import MenuBar from './components/MenuBar';
import Editor from './components/Editor';
import StatusBar from './components/StatusBar';
import {
  FindDialog, ReplaceDialog, GoToLineDialog,
  ShortcutsDialog, SaveAsDialog, ConfirmDialog,
} from './components/Dialog';
import { ImportLegacyDialog } from './components/ImportDialog';
import Sidebar from './components/Sidebar';
import FormattingBar from './components/FormattingBar';
import useShortcuts from './hooks/useShortcuts';
import useAutosave, { saveToStorage, loadFromStorage, clearStorage } from './hooks/useAutosave';
import useUndoHistory from './hooks/useUndoHistory';
import { parseLegacyFile } from './utils/legacyParser';
import { TEMPLATES } from './utils/templates';
import { initAudio, playSaveBeep, playBootSound } from './utils/audio';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

// ── Welcome text shown on fresh start ─────────────────────
const WELCOME_TEXT = `  WORDSTAR REBORN — Classic Editor for Modern Browser
  ═══════════════════════════════════════════════════════

  Welcome! You are now running WordStar by Sanjeev.

  This editor faithfully recreates the classic WordStar 4.0
  keyboard experience in your browser.

  QUICK START:
  ────────────
  • Type anywhere to begin editing
  • Press Ctrl+K S to save your file
  • Press F1 or use Help menu for all keyboard shortcuts
  • Use the View menu to switch themes (Green, Amber, Blue)

  WORDSTAR DIAMOND (cursor movement):
  ────────────────────────────────────
        Ctrl+E (Up)
        Ctrl+S (Left)  
        Ctrl+D (Right)
        Ctrl+X (Down)

  FAMOUS SHORTCUTS:
  ─────────────────
  Ctrl+K S ........... Save
  Ctrl+K D ........... Open
  Ctrl+Q F ........... Find
  Ctrl+Q A ........... Replace
  Ctrl+Y  ............ Delete line
  Ctrl+K B / Ctrl+K K  Begin/End block

  Start typing below this line or open a file.
  ═══════════════════════════════════════════════════════

  Personal Edition for JEYAPRAGASH NARAYANAN AUDITOR OFFICE
`;

// ── Toast helper ──────────────────────────────────────────
let toastId = 0;

export default function App() {
  const [booted, setBooted] = useState(false);
  const [theme, setTheme] = useState('');
  const [content, setContent] = useState(WELCOME_TEXT);
  const [fileName, setFileName] = useState('untitled.txt');
  const [saveState, setSaveState] = useState('saved'); // saved | modified | saving
  const [wordWrap, setWordWrap] = useState(true);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [insertMode, setInsertMode] = useState(true); // true=insert, false=overwrite
  const [margin, setMargin] = useState(78);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [prefixKey, setPrefixKey] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [recovery, setRecovery] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [archiveFiles, setArchiveFiles] = useState([]);
  const [pendingImportFile, setPendingImportFile] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Dialogs
  const [dialog, setDialog] = useState(null);
  // dialog types: 'find' | 'replace' | 'goto' | 'shortcuts' | 'saveAs' | 'confirmNew' | 'confirmQuit' | 'import'

  // Block selection
  const [blockStart, setBlockStart] = useState(null);
  const [blockEnd, setBlockEnd] = useState(null);

  // Find state
  const lastFindRef = useRef({ query: '', caseSensitive: false, pos: 0 });

  const editorRef = useRef(null);
  const { push: historyPush, undo: historyUndo, redo: historyRedo } = useUndoHistory();
  const changeThrottle = useRef(null);

  // ── Check for crash recovery on mount ─────────────────
  useEffect(() => {
    const { content: saved, meta } = loadFromStorage();
    if (saved && saved !== WELCOME_TEXT && saved.trim().length > 0) {
      setRecovery({ content: saved, meta });
    }
  }, []);

  // ── Toast notifications ────────────────────────────────
  const showToast = useCallback((message, type = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // ── Content change handler with undo ──────────────────
  const handleContentChange = useCallback((newContent) => {
    setContent(newContent);
    setSaveState('modified');
    // Throttle history push to avoid flooding
    clearTimeout(changeThrottle.current);
    changeThrottle.current = setTimeout(() => {
      historyPush(newContent);
    }, 500);
  }, [historyPush]);

  // ── Save file ─────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (fileName === 'untitled.txt') {
      setDialog('saveAs');
      return;
    }
    setSaveState('saving');
    saveToStorage(content, fileName);
    // Download as .txt
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, fileName);
    if (soundEnabled) playSaveBeep();
    setTimeout(() => setSaveState('saved'), 600);
    showToast(`Saved: ${fileName}`, 'success');
  }, [content, fileName, showToast, soundEnabled]);

  // ── Save As ───────────────────────────────────────────
  const handleSaveAs = useCallback((name) => {
    setFileName(name);
    setSaveState('saving');
    saveToStorage(content, name);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, name);
    if (soundEnabled) playSaveBeep();
    setTimeout(() => setSaveState('saved'), 600);
    showToast(`Saved as: ${name}`, 'success');
  }, [content, showToast, soundEnabled]);

  // ── Open file ─────────────────────────────────────────
  const handleOpen = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.text,.md,.log,.csv,.js,.py,.html,.css,.json,.ws,.doc,.asc';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // If it's a legacy extension, trigger import dialog instead
      if (file.name.match(/\.(ws|doc|asc)$/i)) {
        setPendingImportFile(file);
        setDialog('import');
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target.result;
        setContent(text);
        setFileName(file.name);
        setSaveState('saved');
        historyPush(text);
        showToast(`Opened: ${file.name}`, 'success');
        setTimeout(() => editorRef.current?.focus(), 100);
      };
      reader.readAsText(file);
    };
    input.click();
  }, [historyPush, showToast]);

  // ── Legacy Import ─────────────────────────────────────
  const executeImport = useCallback(async (cleanupMode) => {
    if (!pendingImportFile) return;
    try {
      const text = await parseLegacyFile(pendingImportFile, { cleanupMode });
      setContent(text);
      setFileName(pendingImportFile.name);
      setSaveState('saved');
      historyPush(text);
      setArchiveFiles(prev => {
        const existing = prev.filter(f => f.name !== pendingImportFile.name);
        return [{ name: pendingImportFile.name, content: text }, ...existing];
      });
      showToast(`Imported legacy file: ${pendingImportFile.name}`, 'success');
      if (!showSidebar) setShowSidebar(true);
    } catch (err) {
      showToast('Error importing file', 'error');
    }
    setDialog(null);
    setPendingImportFile(null);
    setTimeout(() => editorRef.current?.focus(), 100);
  }, [pendingImportFile, historyPush, showToast, showSidebar]);

  const loadFromArchive = useCallback((fileObj) => {
    setContent(fileObj.content);
    setFileName(fileObj.name);
    setSaveState('saved');
    historyPush(fileObj.content);
    showToast(`Loaded: ${fileObj.name}`, 'info');
  }, [historyPush, showToast]);

  // ── Drag & Drop ───────────────────────────────────────
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    if (file.name.match(/\.(ws|doc|asc)$/i)) {
      setPendingImportFile(file);
      setDialog('import');
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target.result;
        setContent(text);
        setFileName(file.name);
        setSaveState('saved');
        historyPush(text);
        showToast(`Opened: ${file.name}`, 'success');
      };
      reader.readAsText(file);
    }
  };

  // ── New file ──────────────────────────────────────────
  const handleNew = useCallback(() => {
    if (saveState === 'modified') {
      setDialog('confirmNew');
    } else {
      doNewFile();
    }
  }, [saveState]);

  const doNewFile = () => {
    setContent('');
    setFileName('untitled.txt');
    setSaveState('saved');
    historyPush('');
    setDialog(null);
    setTimeout(() => editorRef.current?.focus(), 50);
  };

  // ── Templates ─────────────────────────────────────────
  const handleTemplate = useCallback((templateKey) => {
    const templateContent = TEMPLATES[templateKey];
    if (saveState === 'modified') {
      // Instead of making a complex dialog system, just do a simple confirm for now if modified
      if (!window.confirm("You have unsaved changes. Discard and load template?")) return;
    }
    
    // Drop first newline if it exists for cleaner insertion
    const text = templateContent.replace(/^\n/, '');
    setContent(text);
    setFileName(`${templateKey}.txt`);
    setSaveState('saved');
    historyPush(text);
    showToast(`Loaded template: ${templateKey}`, 'success');
    setTimeout(() => editorRef.current?.focus(), 100);
  }, [saveState, historyPush, showToast]);

  // ── Export PDF ────────────────────────────────────────
  const handleExportPdf = useCallback(() => {
    try {
      const doc = new jsPDF();
      const lines = doc.splitTextToSize(content, 180);
      doc.setFont('Courier');
      doc.setFontSize(11);
      doc.text(lines, 15, 20);
      doc.save(fileName.replace(/\.[^.]+$/, '') + '.pdf');
      showToast('Exported as PDF', 'success');
    } catch {
      showToast('PDF export failed', 'error');
    }
  }, [content, fileName, showToast]);

  // ── Export TXT ────────────────────────────────────────
  const handleExportTxt = useCallback(() => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, fileName.endsWith('.txt') ? fileName : fileName + '.txt');
    showToast('Exported as .txt', 'success');
  }, [content, fileName, showToast]);

  // ── Print ─────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>${fileName}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12pt;
               white-space: pre-wrap; margin: 2cm; color: #000; background: #fff; }
      </style></head>
      <body>${content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</body>
      </html>`);
    win.document.close();
    win.print();
  }, [content, fileName]);

  // ── Undo / Redo ───────────────────────────────────────
  const handleUndo = useCallback(() => {
    const prev = historyUndo();
    if (prev !== null) { setContent(prev); setSaveState('modified'); }
  }, [historyUndo]);

  const handleRedo = useCallback(() => {
    const next = historyRedo();
    if (next !== null) { setContent(next); setSaveState('modified'); }
  }, [historyRedo]);

  // ── Cursor position ───────────────────────────────────
  const handleCursorChange = useCallback((ln, col) => {
    setCursorLine(ln);
    setCursorCol(col);
  }, []);

  // ── Find / Replace ────────────────────────────────────
  const handleFindNext = useCallback((query, caseSensitive) => {
    const ta = editorRef.current?.getTextarea();
    if (!ta || !query) return;
    const text = caseSensitive ? ta.value : ta.value.toLowerCase();
    const search = caseSensitive ? query : query.toLowerCase();
    const start = ta.selectionEnd || 0;
    let idx = text.indexOf(search, start);
    if (idx === -1) idx = text.indexOf(search, 0); // wrap around
    if (idx !== -1) {
      ta.selectionStart = idx;
      ta.selectionEnd = idx + query.length;
      ta.focus();
      lastFindRef.current = { query, caseSensitive, pos: idx };
    }
  }, []);

  const handleFindPrev = useCallback((query, caseSensitive) => {
    const ta = editorRef.current?.getTextarea();
    if (!ta || !query) return;
    const text = caseSensitive ? ta.value : ta.value.toLowerCase();
    const search = caseSensitive ? query : query.toLowerCase();
    const end = (ta.selectionStart || 1) - 1;
    let idx = text.lastIndexOf(search, end);
    if (idx === -1) idx = text.lastIndexOf(search);
    if (idx !== -1) {
      ta.selectionStart = idx;
      ta.selectionEnd = idx + query.length;
      ta.focus();
    }
  }, []);

  const handleReplace = useCallback((query, replacement, caseSensitive) => {
    const ta = editorRef.current?.getTextarea();
    if (!ta || !query) return;
    const pos = ta.selectionStart;
    const selected = ta.value.slice(pos, pos + query.length);
    const matches = caseSensitive
      ? selected === query
      : selected.toLowerCase() === query.toLowerCase();
    if (matches) {
      const newVal = ta.value.slice(0, pos) + replacement + ta.value.slice(pos + query.length);
      handleContentChange(newVal);
      setTimeout(() => {
        ta.selectionStart = pos;
        ta.selectionEnd = pos + replacement.length;
      }, 0);
    }
    handleFindNext(query, caseSensitive);
  }, [handleContentChange, handleFindNext]);

  const handleReplaceAll = useCallback((query, replacement, caseSensitive) => {
    if (!query) return 0;
    let newContent = content;
    if (caseSensitive) {
      const count = (content.split(query)).length - 1;
      newContent = content.split(query).join(replacement);
      handleContentChange(newContent);
      return count;
    } else {
      const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      let count = 0;
      newContent = content.replace(regex, () => { count++; return replacement; });
      handleContentChange(newContent);
      return count;
    }
  }, [content, handleContentChange]);

  // ── Go To Line ────────────────────────────────────────
  const handleGoToLine = useCallback((lineNum) => {
    const ta = editorRef.current?.getTextarea();
    if (!ta) return;
    const lines = ta.value.split('\n');
    let pos = 0;
    for (let i = 0; i < Math.min(lineNum - 1, lines.length); i++) {
      pos += lines[i].length + 1;
    }
    ta.selectionStart = ta.selectionEnd = pos;
    ta.focus();
    showToast(`Jumped to line ${lineNum}`, 'info');
  }, [showToast]);

  // ── Block operations ──────────────────────────────────
  const handleBlockBegin = useCallback(() => {
    const ta = editorRef.current?.getTextarea();
    if (ta) { setBlockStart(ta.selectionStart); showToast('Block begin marked', 'info'); }
  }, [showToast]);

  const handleBlockEnd = useCallback(() => {
    const ta = editorRef.current?.getTextarea();
    if (ta) { setBlockEnd(ta.selectionStart); showToast('Block end marked', 'info'); }
  }, [showToast]);

  const handleBlockCopy = useCallback(() => {
    if (blockStart == null || blockEnd == null) return;
    const ta = editorRef.current?.getTextarea();
    if (!ta) return;
    const s = Math.min(blockStart, blockEnd);
    const e = Math.max(blockStart, blockEnd);
    const block = content.slice(s, e);
    const cur = ta.selectionStart;
    const newContent = content.slice(0, cur) + block + content.slice(cur);
    handleContentChange(newContent);
    showToast('Block copied', 'success');
  }, [blockStart, blockEnd, content, handleContentChange, showToast]);

  const handleBlockMove = useCallback(() => {
    if (blockStart == null || blockEnd == null) return;
    const ta = editorRef.current?.getTextarea();
    if (!ta) return;
    const s = Math.min(blockStart, blockEnd);
    const e = Math.max(blockStart, blockEnd);
    const block = content.slice(s, e);
    const cur = ta.selectionStart;
    let newContent = content.slice(0, s) + content.slice(e);
    const insertAt = cur > e ? cur - (e - s) : cur;
    newContent = newContent.slice(0, insertAt) + block + newContent.slice(insertAt);
    handleContentChange(newContent);
    setBlockStart(null); setBlockEnd(null);
    showToast('Block moved', 'success');
  }, [blockStart, blockEnd, content, handleContentChange, showToast]);

  const handleBlockDelete = useCallback(() => {
    if (blockStart == null || blockEnd == null) return;
    const s = Math.min(blockStart, blockEnd);
    const e = Math.max(blockStart, blockEnd);
    const newContent = content.slice(0, s) + content.slice(e);
    handleContentChange(newContent);
    setBlockStart(null); setBlockEnd(null);
    showToast('Block deleted', 'success');
  }, [blockStart, blockEnd, content, handleContentChange, showToast]);

  // ── Modern Formatting ──────────────────────────────────
  const handleFormatCenter = useCallback(() => {
    const ta = editorRef.current?.getTextarea();
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const text = ta.value;

    const startLinePos = text.lastIndexOf('\n', s - 1) + 1;
    const endLinePos = text.indexOf('\n', e);
    const endLinePosFixed = endLinePos === -1 ? text.length : endLinePos;

    const lines = text.slice(startLinePos, endLinePosFixed).split('\n');
    const newLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return '';
      const pad = Math.max(0, Math.floor((margin - trimmed.length) / 2));
      return ' '.repeat(pad) + trimmed;
    });

    const newContent = text.slice(0, startLinePos) + newLines.join('\n') + text.slice(endLinePosFixed);
    handleContentChange(newContent);
    showToast('Centered text', 'info');
    setTimeout(() => {
      ta.selectionStart = startLinePos;
      ta.selectionEnd = startLinePos + newLines.join('\n').length;
    }, 0);
  }, [handleContentChange, showToast]);

  const handleFormatBold = useCallback(() => {
    const ta = editorRef.current?.getTextarea();
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const text = ta.value;

    if (s !== e) {
      const selected = text.slice(s, e);
      const newContent = text.slice(0, s) + `**${selected}**` + text.slice(e);
      handleContentChange(newContent);
      showToast('Bold applied', 'info');
      setTimeout(() => { ta.selectionStart = s; ta.selectionEnd = e + 4; }, 0);
    } else {
      const newContent = text.slice(0, s) + `****` + text.slice(s);
      handleContentChange(newContent);
      showToast('BOLD mode', 'info');
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + 2; }, 0);
    }
  }, [handleContentChange, showToast]);

  const handleFormatUnderline = useCallback(() => {
    const ta = editorRef.current?.getTextarea();
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const text = ta.value;

    if (s !== e) {
      const startLinePos = text.lastIndexOf('\n', s - 1) + 1;
      const endLinePos = text.indexOf('\n', e);
      const endLinePosFixed = endLinePos === -1 ? text.length : endLinePos;

      const block = text.slice(startLinePos, endLinePosFixed);
      const lines = block.split('\n');
      const maxLength = Math.max(...lines.map(l => l.length));
      const underline = '─'.repeat(maxLength || 10);
      
      const newContent = text.slice(0, endLinePosFixed) + '\n' + underline + text.slice(endLinePosFixed);
      handleContentChange(newContent);
      showToast('Underline applied', 'info');
    } else {
      const startLinePos = text.lastIndexOf('\n', s - 1) + 1;
      const endLinePos = text.indexOf('\n', s);
      const endLinePosFixed = endLinePos === -1 ? text.length : endLinePos;
      const currentLine = text.slice(startLinePos, endLinePosFixed);
      const underline = '─'.repeat(currentLine.length || 10);
      const newContent = text.slice(0, endLinePosFixed) + '\n' + underline + text.slice(endLinePosFixed);
      handleContentChange(newContent);
      showToast('UNDERLINE mode', 'info');
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = endLinePosFixed + underline.length + 1; }, 0);
    }
  }, [handleContentChange, showToast]);

  const handleFormatTotal = useCallback(() => {
    const ta = editorRef.current?.getTextarea();
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const text = ta.value;

    let targetText = '';
    let insertPos = 0;

    if (s !== e) {
      targetText = text.slice(s, e);
      insertPos = e;
    } else {
      let blockStart = s;
      while (blockStart > 0 && text.slice(blockStart - 2, blockStart) !== '\n\n') {
        blockStart--;
      }
      let blockEnd = s;
      while (blockEnd < text.length && text.slice(blockEnd, blockEnd + 2) !== '\n\n') {
        blockEnd++;
      }
      targetText = text.slice(blockStart, blockEnd);
      insertPos = blockEnd;
    }

    const lines = targetText.split('\n');
    let sum = 0;
    let maxEndIndex = 0;

    lines.forEach(line => {
      const regex = /-?[\d,]+\.?\d*/g;
      let match;
      let lastMatch = null;
      while ((match = regex.exec(line)) !== null) {
        lastMatch = match;
      }
      
      if (lastMatch) {
        const numStr = lastMatch[0].replace(/,/g, '');
        const num = parseFloat(numStr);
        if (!isNaN(num)) {
          sum += num;
          const endIndex = lastMatch.index + lastMatch[0].length;
          if (endIndex > maxEndIndex) {
            maxEndIndex = endIndex;
          }
        }
      }
    });

    // Format the total sum
    let sumFormatted = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(sum);
    // Remove .00 if it's a whole number for cleaner look in plain text
    if (sumFormatted.endsWith('.00')) {
      sumFormatted = sumFormatted.slice(0, -3);
    }

    const prefix = 'Total:';
    let paddingLen = maxEndIndex - prefix.length - sumFormatted.length;
    if (paddingLen < 1) paddingLen = 1;

    const resultStr = '\n' + prefix + ' '.repeat(paddingLen) + sumFormatted;

    const newContent = text.slice(0, insertPos) + resultStr + text.slice(insertPos);
    handleContentChange(newContent);
    showToast(`Total = ${sumFormatted}`, 'success');
  }, [handleContentChange, showToast]);

  const handleFormatGST = useCallback(() => {
    const ta = editorRef.current?.getTextarea();
    if (!ta) return;
    const s = ta.selectionStart;
    const text = ta.value;

    const lastTotalIdx = text.lastIndexOf('Total:', s);
    if (lastTotalIdx === -1) {
      showToast('Calculate Total first!', 'info');
      return;
    }
    
    const lineEnd = text.indexOf('\n', lastTotalIdx);
    const lineEndFixed = lineEnd === -1 ? text.length : lineEnd;
    const totalLine = text.slice(lastTotalIdx, lineEndFixed);
    
    const numMatch = totalLine.match(/-?[\d,]+\.?\d*/g);
    if (!numMatch) return;
    
    const totalValue = parseFloat(numMatch[numMatch.length - 1].replace(/,/g, ''));
    if (isNaN(totalValue)) return;
    
    const gst = totalValue * 0.18;
    const final = totalValue + gst;
    
    const gstFormatted = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(gst);
    const finalFormatted = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(final);
    
    const gstPrefix = 'GST (18%):';
    const gstPad = totalLine.length - gstPrefix.length - gstFormatted.length;
    const gstStr = `\n${gstPrefix}${' '.repeat(Math.max(1, gstPad))}${gstFormatted}`;

    const grandPrefix = 'Grand Total:';
    const grandPad = totalLine.length - grandPrefix.length - finalFormatted.length;
    const grandStr = `\n${grandPrefix}${' '.repeat(Math.max(1, grandPad))}${finalFormatted}`;

    const newContent = text.slice(0, lineEndFixed) + gstStr + grandStr + text.slice(lineEndFixed);
    handleContentChange(newContent);
    showToast('GST Added', 'success');
  }, [handleContentChange, showToast]);

  // ── Autosave ──────────────────────────────────────────
  useAutosave({
    content,
    fileName,
    enabled: true,
    onAutosaved: useCallback(() => {
      setSaveState(prev => prev === 'modified' ? 'modified' : 'saved');
    }, []),
  });

  // ── WordStar keyboard shortcuts ───────────────────────
  useShortcuts({
    editorRef,
    content,
    onChange: handleContentChange,
    onSave: handleSave,
    onOpen: handleOpen,
    onNew: handleNew,
    onQuit: () => setDialog('confirmQuit'),
    onFind: () => setDialog('find'),
    onReplace: () => setDialog('replace'),
    onGoToLine: () => setDialog('goto'),
    onToggleWordWrap: () => setWordWrap(w => !w),
    onToggleInsert: () => setInsertMode(m => !m),
    onPrint: handlePrint,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onBlockBegin: handleBlockBegin,
    onBlockEnd: handleBlockEnd,
    onBlockCopy: handleBlockCopy,
    onBlockMove: handleBlockMove,
    onBlockDelete: handleBlockDelete,
    onFindNext: () => {
      const { query, caseSensitive } = lastFindRef.current;
      if (query) handleFindNext(query, caseSensitive);
    },
    onSetPrefixKey: setPrefixKey,
    insertMode,
    onFormatCenter: handleFormatCenter,
    onFormatBold: handleFormatBold,
    onFormatUnderline: handleFormatUnderline,
    onFormatTotal: handleFormatTotal,
    onFormatGST: handleFormatGST,
  });

  // ── Word / char count ─────────────────────────────────
  const wordCount = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
  const charCount = content.length;
  const lineCount = content.split('\n').length;

  // ── Theme class ───────────────────────────────────────
  const themeClass = theme ? ` ${theme}` : '';

  if (!booted) return <BootScreen onComplete={() => setBooted(true)} soundEnabled={soundEnabled} />;

  return (
    <div 
      className={`app-wrapper${themeClass}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => { if (soundEnabled) initAudio(); }}
    >
      {/* Recovery banner */}
      {recovery && (
        <div className="recovery-banner" role="alert">
          <strong>⚠ Unsaved session found</strong>
          <span>"{recovery.meta.fileName || 'untitled'}" — {recovery.meta.savedAt ? new Date(recovery.meta.savedAt).toLocaleString() : ''}</span>
          <button
            className="recovery-btn"
            onClick={() => {
              setContent(recovery.content);
              setFileName(recovery.meta.fileName || 'recovered.txt');
              setSaveState('modified');
              historyPush(recovery.content);
              setRecovery(null);
              showToast('Session restored!', 'success');
            }}
          >
            Restore
          </button>
          <button
            className="recovery-btn"
            onClick={() => { clearStorage(); setRecovery(null); }}
          >
            Discard
          </button>
        </div>
      )}

      {/* Background Watermark */}
      <div className="watermark" aria-hidden="true">SANJEEVIJESH</div>

      {/* Menu bar */}
      <MenuBar
        onNew={handleNew}
        onTemplate={handleTemplate}
        onOpen={handleOpen}
        onImportLegacy={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.onchange = (e) => {
            if (e.target.files[0]) {
              setPendingImportFile(e.target.files[0]);
              setDialog('import');
            }
          };
          input.click();
        }}
        onSave={handleSave}
        onSaveAs={() => setDialog('saveAs')}
        onExportTxt={handleExportTxt}
        onExportPdf={handleExportPdf}
        onFind={() => setDialog('find')}
        onReplace={() => setDialog('replace')}
        onGoToLine={() => setDialog('goto')}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleWordWrap={() => setWordWrap(w => !w)}
        onToggleLineNumbers={() => setLineNumbers(l => !l)}
        currentTheme={theme}
        onThemeChange={setTheme}
        onPrint={handlePrint}
        onAbout={() => setDialog('shortcuts')}
        wordWrap={wordWrap}
        lineNumbers={lineNumbers}
        prefixKey={prefixKey}
        modified={saveState === 'modified'}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          setSoundEnabled(s => {
            const next = !s;
            if (next) {
              initAudio();
              playBootSound();
            }
            return next;
          });
        }}
      />

      <FormattingBar 
        onCenter={handleFormatCenter} 
        onBold={handleFormatBold} 
        onUnderline={handleFormatUnderline} 
        onTotal={handleFormatTotal} 
        onGST={handleFormatGST}
      />

      {/* Hidden button for toggling sidebar from menu */}
      <button 
        id="toggle-archive-btn" 
        style={{ display: 'none' }} 
        onClick={() => setShowSidebar(!showSidebar)} 
      />

      {/* Quick-help strip */}
      <div className="help-bar" aria-label="Quick shortcuts reference">
        {[
          ['^KS', 'Save'], ['^KD', 'Open'], ['^KQ', 'Quit'],
          ['^QF', 'Find'], ['^QA', 'Repl'], ['^Y', 'Del Ln'],
          ['^KB', 'Blk↑'], ['^KK', 'Blk↓'], ['^Z', 'Undo'],
          ['F1', 'Help'], ['Ins', 'Ins/Ovr'],
        ].map(([key, desc]) => (
          <div key={key} className="help-item">
            <span className="help-key">{key}</span>
            <span className="help-desc">{desc}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        {showSidebar && (
          <Sidebar 
            files={archiveFiles}
            currentFile={fileName}
            onSelectFile={loadFromArchive}
            onClose={() => setShowSidebar(false)}
            onImportClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                  setPendingImportFile(file);
                  setDialog('import');
                }
              };
              input.click();
            }}
          />
        )}

        {/* Main editor */}
        <Editor
          ref={editorRef}
          content={content}
          onChange={handleContentChange}
          wordWrap={wordWrap}
          lineNumbers={lineNumbers}
          mode={insertMode ? 'insert' : 'overwrite'}
          currentLine={cursorLine}
          onCursorChange={handleCursorChange}
          soundEnabled={soundEnabled}
          margin={margin}
          onMarginChange={setMargin}
        />
      </div>

      {/* Status bar */}
      <StatusBar
        line={cursorLine}
        col={cursorCol}
        mode={insertMode ? 'insert' : 'overwrite'}
        saveState={saveState}
        fileName={fileName}
        wordWrap={wordWrap}
        lineNumbers={lineNumbers}
        blockActive={blockStart !== null}
        charCount={charCount}
        wordCount={wordCount}
      />

      {/* ── Dialogs ─────────────────────────────────── */}
      {dialog === 'find' && (
        <FindDialog
          content={content}
          onClose={() => { setDialog(null); editorRef.current?.focus(); }}
          onFindNext={handleFindNext}
          onFindPrev={handleFindPrev}
        />
      )}
      {dialog === 'replace' && (
        <ReplaceDialog
          content={content}
          onClose={() => { setDialog(null); editorRef.current?.focus(); }}
          onReplace={handleReplace}
          onReplaceAll={handleReplaceAll}
        />
      )}
      {dialog === 'goto' && (
        <GoToLineDialog
          lineCount={lineCount}
          onClose={() => { setDialog(null); editorRef.current?.focus(); }}
          onGo={handleGoToLine}
        />
      )}
      {dialog === 'shortcuts' && (
        <ShortcutsDialog onClose={() => { setDialog(null); editorRef.current?.focus(); }} />
      )}
      {dialog === 'saveAs' && (
        <SaveAsDialog
          currentName={fileName}
          onClose={() => { setDialog(null); editorRef.current?.focus(); }}
          onSave={handleSaveAs}
        />
      )}
      {dialog === 'confirmNew' && (
        <ConfirmDialog
          title="═ NEW FILE ═"
          message="You have unsaved changes. Start a new file anyway?"
          onConfirm={doNewFile}
          onCancel={() => { setDialog(null); editorRef.current?.focus(); }}
        />
      )}
      {dialog === 'confirmQuit' && (
        <ConfirmDialog
          title="═ QUIT ═"
          message="Save your work before quitting? Your browser tab will close."
          onConfirm={() => { handleSave(); window.close(); }}
          onCancel={() => { setDialog(null); editorRef.current?.focus(); }}
        />
      )}
      {dialog === 'import' && (
        <ImportLegacyDialog
          file={pendingImportFile}
          onClose={() => { setDialog(null); setPendingImportFile(null); editorRef.current?.focus(); }}
          onImport={executeImport}
        />
      )}

      {/* Toast notifications */}
      {toasts.map(toast => (
        <div key={toast.id} className={`toast ${toast.type}`} role="status">
          {toast.message}
        </div>
      ))}
    </div>
  );
}

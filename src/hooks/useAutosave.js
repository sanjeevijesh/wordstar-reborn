/* ─────────────────────────────────────────────────────────
   useAutosave.js — Autosave to localStorage every 10s
   Also handles crash recovery / session restore
───────────────────────────────────────────────────────── */

import { useEffect, useRef } from 'react';

const AUTOSAVE_KEY = 'wordstar_reborn_autosave';
const AUTOSAVE_META_KEY = 'wordstar_reborn_meta';
const AUTOSAVE_INTERVAL = 10000; // 10 seconds

export function saveToStorage(content, fileName) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, content);
    localStorage.setItem(AUTOSAVE_META_KEY, JSON.stringify({
      fileName,
      savedAt: new Date().toISOString(),
      length: content.length,
    }));
    return true;
  } catch {
    return false;
  }
}

export function loadFromStorage() {
  try {
    const content = localStorage.getItem(AUTOSAVE_KEY);
    const meta = JSON.parse(localStorage.getItem(AUTOSAVE_META_KEY) || '{}');
    return { content, meta };
  } catch {
    return { content: null, meta: {} };
  }
}

export function clearStorage() {
  localStorage.removeItem(AUTOSAVE_KEY);
  localStorage.removeItem(AUTOSAVE_META_KEY);
}

export default function useAutosave({ content, fileName, enabled, onAutosaved }) {
  const contentRef = useRef(content);
  const fileNameRef = useRef(fileName);

  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { fileNameRef.current = fileName; }, [fileName]);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const ok = saveToStorage(contentRef.current, fileNameRef.current);
      if (ok) onAutosaved?.();
    }, AUTOSAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, onAutosaved]);
}

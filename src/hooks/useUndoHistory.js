/* useUndoHistory.js — Simple undo/redo stack */
import { useRef, useCallback } from 'react';

const MAX_HISTORY = 200;

export default function useUndoHistory() {
  const history = useRef(['']);
  const pointer = useRef(0);

  const push = useCallback((value) => {
    // Trim forward history on new change
    history.current = history.current.slice(0, pointer.current + 1);
    history.current.push(value);
    if (history.current.length > MAX_HISTORY) {
      history.current.shift();
    } else {
      pointer.current++;
    }
  }, []);

  const undo = useCallback(() => {
    if (pointer.current > 0) {
      pointer.current--;
      return history.current[pointer.current];
    }
    return null;
  }, []);

  const redo = useCallback(() => {
    if (pointer.current < history.current.length - 1) {
      pointer.current++;
      return history.current[pointer.current];
    }
    return null;
  }, []);

  const canUndo = () => pointer.current > 0;
  const canRedo = () => pointer.current < history.current.length - 1;

  return { push, undo, redo, canUndo, canRedo };
}

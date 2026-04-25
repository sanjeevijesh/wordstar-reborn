import { useState, useEffect } from 'react';
import './BootScreen.css';
import { playBootSound } from '../utils/audio';

const BOOT_LINES = [
  { text: 'BIOS v2.0 — Memory check...', delay: 200, cls: '' },
  { text: 'RAM: 640K OK                        [ OK ]', delay: 600, cls: 'ok' },
  { text: 'Keyboard controller...              [ OK ]', delay: 900, cls: 'ok' },
  { text: 'Loading WORDSTAR.SYS...', delay: 1200, cls: '' },
  { text: 'Initializing text buffer...         [ OK ]', delay: 1500, cls: 'ok' },
  { text: 'Loading shortcut engine...          [ OK ]', delay: 1800, cls: 'ok' },
  { text: 'Mounting file system...             [ OK ]', delay: 2100, cls: 'ok' },
  { text: 'Autosave daemon started             [ OK ]', delay: 2400, cls: 'ok' },
  { text: 'CRT display driver loaded           [ WARN ] — using emulation', delay: 2700, cls: 'warn' },
  { text: 'WORDSTAR REBORN ready.', delay: 3100, cls: 'ok' },
];

export default function BootScreen({ onComplete, soundEnabled }) {
  const [visibleLines, setVisibleLines] = useState([]);
  const [progress, setProgress] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showPressKey, setShowPressKey] = useState(false);

  useEffect(() => {
    if (soundEnabled) playBootSound();
    const timers = [];

    BOOT_LINES.forEach((line, i) => {
      timers.push(
        setTimeout(() => {
          setVisibleLines(prev => [...prev, line]);
          setProgress(Math.round(((i + 1) / BOOT_LINES.length) * 100));
        }, line.delay)
      );
    });

    timers.push(setTimeout(() => setShowPrompt(true), 3400));
    timers.push(setTimeout(() => setShowPressKey(true), 3600));

    // Auto-advance after 5 seconds
    timers.push(setTimeout(() => onComplete(), 5200));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const handleClick = () => onComplete();
  const handleKey = () => onComplete();

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="boot-screen" onClick={handleClick}>
      <div className="boot-logo">
        <div className="boot-logo-title">WORDSTAR</div>
        <div className="boot-logo-sub">★ REBORN ★</div>
        <div className="boot-version">Version 4.0 Web Edition — by SANJEEVIJESH</div>
      </div>

      <div className="boot-divider" />

      <div className="boot-lines">
        {visibleLines.map((line, i) => (
          <div
            key={i}
            className={`boot-line ${line.cls}`}
            style={{ animationDelay: '0ms' }}
          >
            {line.text}
          </div>
        ))}
      </div>

      <div className="boot-progress-bar">
        <div className="boot-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {showPrompt && (
        <div className="boot-prompt">C:\WORDSTAR&gt; _</div>
      )}

      {showPressKey && (
        <div className="boot-press-key">Press any key to continue...</div>
      )}

      <div className="boot-copyright">
        © 2024 WordStar Reborn — Built with ♥ by SANJEEVIJESH
      </div>
    </div>
  );
}

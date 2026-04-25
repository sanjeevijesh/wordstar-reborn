import './FormattingBar.css';

export default function FormattingBar({ onCenter, onBold, onUnderline, onTotal }) {
  return (
    <div className="format-bar">
      <button className="format-btn" onClick={onBold} title="Bold (Ctrl+B)">
        <strong>[B] Bold</strong> <span className="shortcut">^B</span>
      </button>
      <button className="format-btn" onClick={onUnderline} title="Underline (Ctrl+U)">
        <span style={{ textDecoration: 'underline' }}>[U] Underline</span> <span className="shortcut">^U</span>
      </button>
      <button className="format-btn" onClick={onCenter} title="Center Align (Ctrl+Shift+C)">
        <span>[≡] Center</span> <span className="shortcut">^+C</span>
      </button>
      <button className="format-btn" onClick={onTotal} title="Column Total (Ctrl+Shift+T)">
        <span>[Σ] Total</span> <span className="shortcut">^+T</span>
      </button>
    </div>
  );
}

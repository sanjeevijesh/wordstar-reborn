import './Sidebar.css';

export default function Sidebar({ files, currentFile, onSelectFile, onClose, onImportClick }) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">ARCHIVE</span>
        <button className="sidebar-close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="sidebar-content">
        <button className="sidebar-btn" onClick={onImportClick}>
          [ Import Legacy File ]
        </button>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Imported Files</div>
          {files.length === 0 ? (
            <div className="sidebar-empty">No files imported yet.</div>
          ) : (
            files.map((f, i) => (
              <div 
                key={i} 
                className={`sidebar-item ${currentFile === f.name ? 'active' : ''}`}
                onClick={() => onSelectFile(f)}
                title={f.name}
              >
                {f.name}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

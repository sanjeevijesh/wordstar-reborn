import { useState, useEffect, useRef } from 'react';
import './MenuBar.css';

export default function MenuBar({
  onNew, onOpen, onSave, onSaveAs, onExportTxt, onExportPdf,
  onFind, onReplace, onGoToLine,
  onUndo, onRedo,
  onToggleWordWrap, onToggleLineNumbers,
  currentTheme, onThemeChange,
  onPrint, onAbout, onImportLegacy,
  wordWrap, lineNumbers,
  prefixKey,
  modified,
}) {
  const [activeMenu, setActiveMenu] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (name) => setActiveMenu(prev => prev === name ? null : name);

  const doAction = (fn) => {
    setActiveMenu(null);
    fn?.();
  };

  const menus = [
    {
      id: 'file', label: ['F', 'ile'],
      items: [
        { label: 'New', hotkey: 'Ctrl+N', action: onNew },
        { label: 'Open...', hotkey: 'Ctrl+K D', action: onOpen },
        { label: 'Import Legacy File...', hotkey: '', action: onImportLegacy },
        { separator: true },
        { label: 'Save', hotkey: 'Ctrl+K S', action: onSave },
        { label: 'Save As...', hotkey: '', action: onSaveAs },
        { separator: true },
        { label: 'Export as .txt', hotkey: '', action: onExportTxt },
        { label: 'Export as PDF', hotkey: '', action: onExportPdf },
        { separator: true },
        { label: 'Print', hotkey: 'Ctrl+P', action: onPrint },
        { separator: true },
        { label: 'Quit', hotkey: 'Ctrl+K Q', action: () => window.close() },
      ]
    },
    {
      id: 'edit', label: ['E', 'dit'],
      items: [
        { label: 'Undo', hotkey: 'Ctrl+Z', action: onUndo },
        { label: 'Redo', hotkey: 'Ctrl+Y (menu)', action: onRedo },
        { separator: true },
        { label: 'Find...', hotkey: 'Ctrl+Q F', action: onFind },
        { label: 'Replace...', hotkey: 'Ctrl+Q A', action: onReplace },
        { label: 'Go to Line...', hotkey: 'Ctrl+Q I', action: onGoToLine },
      ]
    },
    {
      id: 'view', label: ['V', 'iew'],
      items: [
        { label: `Word Wrap: ${wordWrap ? 'ON' : 'OFF'}`, hotkey: 'Ctrl+W', action: onToggleWordWrap },
        { label: `Line Numbers: ${lineNumbers ? 'ON' : 'OFF'}`, hotkey: '', action: onToggleLineNumbers },
        { separator: true },
        { label: 'Toggle Legacy Archive', hotkey: '', action: () => doAction(() => document.getElementById('toggle-archive-btn')?.click()) },
        { separator: true },
        { label: 'Theme: Cyan DOS', hotkey: '', action: () => doAction(() => onThemeChange('')) },
        { label: 'Theme: Green Monitor', hotkey: '', action: () => doAction(() => onThemeChange('theme-green')) },
        { label: 'Theme: Amber CRT', hotkey: '', action: () => doAction(() => onThemeChange('theme-amber')) },
        { label: 'Theme: Blue DOS', hotkey: '', action: () => doAction(() => onThemeChange('theme-blue')) },
      ]
    },
    {
      id: 'help', label: ['H', 'elp'],
      items: [
        { label: 'Keyboard Shortcuts', hotkey: 'F1', action: onAbout },
        { label: 'About WordStar Reborn', hotkey: '', action: onAbout },
      ]
    },
  ];

  return (
    <div className="menu-bar" ref={menuRef}>
      <div className="menu-bar-left">
        <div className="menu-title">WS★</div>
        {menus.map(menu => (
          <div key={menu.id} className="menu-item">
            <button
              className={`menu-button ${activeMenu === menu.id ? 'active' : ''}`}
              onClick={() => toggleMenu(menu.id)}
            >
              <span>{menu.label[0]}</span>
              <span className="hotkey">{menu.label[1]}</span>
            </button>

            {activeMenu === menu.id && (
              <div className="menu-dropdown">
                {menu.items.map((item, i) =>
                  item.separator ? (
                    <div key={i} className="menu-separator" />
                  ) : (
                    <button
                      key={i}
                      className="menu-dropdown-item"
                      onClick={() => doAction(item.action)}
                    >
                      <span>{item.label}</span>
                      {item.hotkey && (
                        <span className="item-hotkey">{item.hotkey}</span>
                      )}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="menu-bar-right">
        <span style={{ opacity: 0.6, marginRight: '16px', letterSpacing: '1px' }}>SANJEEVIJESH</span>
        {modified && <span style={{ color: 'var(--text-highlight)' }}>●</span>}
      </div>

      {prefixKey && (
        <div className="prefix-indicator">
          Prefix: Ctrl+{prefixKey} — waiting for next key...
        </div>
      )}
    </div>
  );
}

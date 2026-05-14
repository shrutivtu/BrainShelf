import { useCallback, useRef, useState } from 'react';
import { parseFiles, parseMarkdown } from '../utils/importParser.js';

export default function NoteImport({ onImportNotes, onClose }) {
  const [mode, setMode] = useState(null);
  const [pasteText, setPasteText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const handleFiles = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const items = await parseFiles(files);
    setParsedItems(items);
    setMode('preview');
  }, []);

  const handlePaste = useCallback(() => {
    if (!pasteText.trim()) return;
    const items = pasteText.trim().split('\n---\n').map((chunk) => parseMarkdown(chunk));
    setParsedItems(items);
    setMode('preview');
  }, [pasteText]);

  const handleConfirm = useCallback(() => {
    setImporting(true);
    onImportNotes(parsedItems);
    onClose();
  }, [parsedItems, onImportNotes, onClose]);

  return (
    <div className="ni-overlay" onClick={onClose}>
      <div className="ni-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ni-header">
          <h3 className="ni-header__title">Import Notes</h3>
          <button type="button" className="ni-close" onClick={onClose}>×</button>
        </div>

        {!mode && (
          <div className="ni-choices">
            <button
              type="button"
              className="ni-choice"
              onClick={() => setMode('paste')}
            >
              <span className="ni-choice__icon">📋</span>
              <span className="ni-choice__label">Paste from clipboard</span>
              <span className="ni-choice__desc">Copy text from Apple Notes or anywhere and paste here</span>
            </button>
            <button
              type="button"
              className="ni-choice"
              onClick={() => fileRef.current?.click()}
            >
              <span className="ni-choice__icon">📁</span>
              <span className="ni-choice__label">Upload files</span>
              <span className="ni-choice__desc">.html, .txt, or .md files</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".html,.htm,.txt,.md,.markdown"
              multiple
              hidden
              onChange={handleFiles}
            />
          </div>
        )}

        {mode === 'paste' && (
          <div className="ni-paste">
            <textarea
              className="ni-paste__input"
              placeholder="Paste your notes here. Separate multiple notes with a line containing only ---"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={10}
              autoFocus
            />
            <div className="ni-paste__actions">
              <button type="button" className="ni-btn" onClick={() => setMode(null)}>Back</button>
              <button type="button" className="ni-btn ni-btn--primary" onClick={handlePaste} disabled={!pasteText.trim()}>
                Preview
              </button>
            </div>
          </div>
        )}

        {mode === 'preview' && (
          <div className="ni-preview">
            <p className="ni-preview__count">{parsedItems.length} note{parsedItems.length !== 1 ? 's' : ''} ready to import</p>
            <ul className="ni-preview__list">
              {parsedItems.map((item, i) => (
                <li key={i} className="ni-preview__item">
                  <span className="ni-preview__title">{item.title}</span>
                  <span className="ni-preview__snippet">{item.preview || ''}…</span>
                </li>
              ))}
            </ul>
            <div className="ni-paste__actions">
              <button type="button" className="ni-btn" onClick={() => { setMode(null); setParsedItems([]); }}>Back</button>
              <button type="button" className="ni-btn ni-btn--primary" onClick={handleConfirm} disabled={importing}>
                {importing ? 'Importing…' : `Import ${parsedItems.length} note${parsedItems.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

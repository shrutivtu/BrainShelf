import { useState } from 'react';

export default function NoteFolders({
  folders,
  activeFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const startRename = (folder) => {
    setEditingId(folder.id);
    setEditName(folder.name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      onRenameFolder(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="nf-panel">
      <p className="nf-panel__heading">Folders</p>
      <ul className="nf-list">
        <li>
          <button
            type="button"
            className={`nf-item${!activeFolderId ? ' is-active' : ''}`}
            onClick={() => onSelectFolder(null)}
          >
            All Notes
          </button>
        </li>
        {folders.map((f) => (
          <li key={f.id} className="nf-item-row">
            {editingId === f.id ? (
              <input
                className="nf-item__edit"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null); }}
                autoFocus
              />
            ) : (
              <>
                <button
                  type="button"
                  className={`nf-item${activeFolderId === f.id ? ' is-active' : ''}`}
                  onClick={() => onSelectFolder(f.id)}
                >
                  {f.name}
                </button>
                <div className="nf-item__actions">
                  <button type="button" className="nf-item__action" onClick={() => startRename(f)} title="Rename">✎</button>
                  <button type="button" className="nf-item__action nf-item__action--del" onClick={() => onDeleteFolder(f.id)} title="Delete">×</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <button type="button" className="nf-add" onClick={onCreateFolder}>
        + New folder
      </button>
    </div>
  );
}

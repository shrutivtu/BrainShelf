import { useMemo, useState } from 'react';

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getPreview(content) {
  if (!content || !content.content) return '';
  const walk = (nodes) => {
    let text = '';
    for (const node of nodes) {
      if (node.text) text += node.text;
      if (node.content) text += walk(node.content);
      if (node.type === 'paragraph' || node.type === 'heading') text += ' ';
    }
    return text;
  };
  return walk(content.content).trim().slice(0, 120);
}

export default function NotesList({
  notes,
  activeNoteId,
  searchQuery,
  onSearchChange,
  activeFolderId,
  folders,
  onFolderChange,
  allTags,
  activeTag,
  onTagChange,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onImport,
}) {
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let list = [...notes];
    if (activeFolderId) {
      list = list.filter((n) => n.folderId === activeFolderId);
    }
    if (activeTag) {
      list = list.filter((n) => (n.tags || []).includes(activeTag));
    }
    const q = (searchQuery || '').trim().toLowerCase();
    if (q) {
      list = list.filter((n) => {
        if ((n.title || '').toLowerCase().includes(q)) return true;
        const preview = getPreview(n.content).toLowerCase();
        if (preview.includes(q)) return true;
        if ((n.tags || []).some((t) => t.toLowerCase().includes(q))) return true;
        return false;
      });
    }
    list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    return list;
  }, [notes, activeFolderId, activeTag, searchQuery]);

  const folderName = activeFolderId
    ? folders.find((f) => f.id === activeFolderId)?.name || 'Folder'
    : 'All Notes';

  return (
    <div className="nl-panel">
      <div className="nl-header">
        <h2 className="nl-header__title">Notes</h2>
        <div className="nl-header__actions">
          {onImport && (
            <button type="button" className="nl-header__btn" onClick={onImport} title="Import notes">
              Import
            </button>
          )}
          <button type="button" className="nl-header__btn nl-header__btn--primary" onClick={onCreateNote}>
            + New
          </button>
        </div>
      </div>

      <div className="nl-search">
        <input
          type="search"
          className="nl-search__input"
          placeholder="Search notes…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="nl-filters">
        <button
          type="button"
          className="nl-filters__toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          {folderName}
          {activeTag ? ` · #${activeTag}` : ''}
          <span className="nl-filters__arrow">{showFilters ? '▲' : '▼'}</span>
        </button>
        {showFilters && (
          <div className="nl-filters__dropdown">
            <div className="nl-filters__section">
              <span className="nl-filters__label">Folder</span>
              <button
                type="button"
                className={`nl-filters__chip${!activeFolderId ? ' is-on' : ''}`}
                onClick={() => onFolderChange(null)}
              >
                All
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`nl-filters__chip${activeFolderId === f.id ? ' is-on' : ''}`}
                  onClick={() => onFolderChange(f.id)}
                >
                  {f.name}
                </button>
              ))}
            </div>
            {allTags.length > 0 && (
              <div className="nl-filters__section">
                <span className="nl-filters__label">Tags</span>
                <button
                  type="button"
                  className={`nl-filters__chip${!activeTag ? ' is-on' : ''}`}
                  onClick={() => onTagChange(null)}
                >
                  All
                </button>
                {allTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`nl-filters__chip${activeTag === t ? ' is-on' : ''}`}
                    onClick={() => onTagChange(t)}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ul className="nl-list">
        {filtered.length === 0 ? (
          <li className="nl-list__empty">
            {searchQuery ? 'No notes match your search.' : 'No notes yet. Create one!'}
          </li>
        ) : (
          filtered.map((n) => (
            <li key={n.id} className={`nl-item${activeNoteId === n.id ? ' is-active' : ''}`}>
              <button
                type="button"
                className="nl-item__btn"
                onClick={() => onSelectNote(n.id)}
              >
                <span className="nl-item__title">
                  {n.isPinned && <span className="nl-item__pin" title="Pinned">⊹ </span>}
                  {n.title || 'Untitled'}
                </span>
                <span className="nl-item__preview">{getPreview(n.content)}</span>
                <span className="nl-item__time">{formatTime(n.updatedAt)}</span>
              </button>
              <button
                type="button"
                className="nl-item__del"
                onClick={(e) => { e.stopPropagation(); onDeleteNote(n.id); }}
                title="Delete note"
              >
                ×
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

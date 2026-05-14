import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NoteEditor from './NoteEditor.jsx';
import NoteFolders from './NoteFolders.jsx';
import NoteImport from './NoteImport.jsx';
import NotesList from './NotesList.jsx';
import {
  createFolder,
  createLongNote,
  deleteCloudFolder,
  deleteCloudLongNote,
  loadCloudNotes,
  loadLocalNotes,
  saveCloudFolder,
  saveCloudLongNote,
  saveLocalNotes,
} from '../utils/notesStorage.js';

function readNoteIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id') || null;
}

function writeNoteIdToUrl(id) {
  const url = new URL(window.location);
  if (id) {
    url.searchParams.set('id', id);
  } else {
    url.searchParams.delete('id');
  }
  window.history.replaceState(null, '', url);
}

export default function NotesView({ userId, onBack, onSignOut, darkMode, onToggleDarkMode }) {
  const [longNotes, setLongNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeNoteId, setActiveNoteIdRaw] = useState(readNoteIdFromUrl);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const setActiveNoteId = useCallback((id) => {
    setActiveNoteIdRaw(id);
    writeNoteIdToUrl(id);
  }, []);

  const debounceRef = useRef(null);

  // ── Load data ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (userId) {
        const cloud = await loadCloudNotes(userId);
        if (!cancelled && cloud) {
          setLongNotes(cloud.longNotes);
          setFolders(cloud.folders);
          setLoaded(true);
          return;
        }
      }
      const local = loadLocalNotes();
      if (!cancelled) {
        setLongNotes(local.longNotes);
        setFolders(local.folders);
        setLoaded(true);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [userId]);

  // ── Persist to localStorage ─────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    saveLocalNotes({ longNotes, folders });
  }, [longNotes, folders, loaded]);

  // ── Derived state ───────────────────────────────────────────────────
  const activeNote = useMemo(
    () => longNotes.find((n) => n.id === activeNoteId) || null,
    [longNotes, activeNoteId]
  );

  const allTags = useMemo(() => {
    const tagSet = new Set();
    for (const n of longNotes) {
      for (const t of n.tags || []) tagSet.add(t);
    }
    return Array.from(tagSet).sort();
  }, [longNotes]);

  // ── CRUD handlers ───────────────────────────────────────────────────
  const createNote = useCallback(() => {
    const note = createLongNote({ folderId: activeFolderId });
    setLongNotes((prev) => [note, ...prev]);
    setActiveNoteId(note.id);
    if (userId) saveCloudLongNote(note, userId);
  }, [userId, activeFolderId]);

  const deleteNote = useCallback((id) => {
    setLongNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeNoteId === id) setActiveNoteId(null);
    if (userId) deleteCloudLongNote(id);
  }, [userId, activeNoteId]);

  const updateNoteTitle = useCallback((id, title) => {
    setLongNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, title, updatedAt: new Date().toISOString() } : n));
      const updated = next.find((n) => n.id === id);
      if (updated && userId) saveCloudLongNote(updated, userId);
      return next;
    });
  }, [userId]);

  const updateNoteContent = useCallback((id, content) => {
    clearTimeout(debounceRef.current);
    setLongNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, content, updatedAt: new Date().toISOString() } : n))
    );
    debounceRef.current = setTimeout(() => {
      setLongNotes((prev) => {
        const note = prev.find((n) => n.id === id);
        if (note && userId) saveCloudLongNote(note, userId);
        return prev;
      });
    }, 1200);
  }, [userId]);

  const updateNoteMeta = useCallback((id, patch) => {
    setLongNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n));
      const updated = next.find((n) => n.id === id);
      if (updated && userId) saveCloudLongNote(updated, userId);
      return next;
    });
  }, [userId]);

  // ── Tags on active note ─────────────────────────────────────────────
  const addTag = useCallback((tag) => {
    if (!activeNote) return;
    const cleaned = tag.replace(/^#/, '').trim().toLowerCase();
    if (!cleaned) return;
    if (activeNote.tags.includes(cleaned)) return;
    updateNoteMeta(activeNote.id, { tags: [...activeNote.tags, cleaned] });
  }, [activeNote, updateNoteMeta]);

  const removeTag = useCallback((tag) => {
    if (!activeNote) return;
    updateNoteMeta(activeNote.id, { tags: activeNote.tags.filter((t) => t !== tag) });
  }, [activeNote, updateNoteMeta]);

  const togglePin = useCallback(() => {
    if (!activeNote) return;
    updateNoteMeta(activeNote.id, { isPinned: !activeNote.isPinned });
  }, [activeNote, updateNoteMeta]);

  const moveToFolder = useCallback((folderId) => {
    if (!activeNote) return;
    updateNoteMeta(activeNote.id, { folderId: folderId || null });
  }, [activeNote, updateNoteMeta]);

  // ── Folder CRUD ─────────────────────────────────────────────────────
  const handleCreateFolder = useCallback(() => {
    const folder = createFolder('New Folder');
    setFolders((prev) => [...prev, folder]);
    if (userId) saveCloudFolder(folder, userId);
  }, [userId]);

  const handleRenameFolder = useCallback((id, name) => {
    setFolders((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, name } : f));
      const updated = next.find((f) => f.id === id);
      if (updated && userId) saveCloudFolder(updated, userId);
      return next;
    });
  }, [userId]);

  const handleDeleteFolder = useCallback((id) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setLongNotes((prev) =>
      prev.map((n) => (n.folderId === id ? { ...n, folderId: null } : n))
    );
    if (activeFolderId === id) setActiveFolderId(null);
    if (userId) deleteCloudFolder(id);
  }, [userId, activeFolderId]);

  // ── Import ──────────────────────────────────────────────────────────
  const handleImportNotes = useCallback((items, targetFolderId) => {
    let folderId = targetFolderId;
    if (!folderId) {
      let importFolder = folders.find((f) => f.name === 'Imported');
      if (!importFolder) {
        importFolder = createFolder('Imported');
        setFolders((prev) => [...prev, importFolder]);
        if (userId) saveCloudFolder(importFolder, userId);
      }
      folderId = importFolder.id;
    }

    const newNotes = items.map((item) =>
      createLongNote({
        title: item.title,
        content: item.html || null,
        folderId,
      })
    );

    setLongNotes((prev) => [...newNotes, ...prev]);
    if (userId) {
      for (const n of newNotes) saveCloudLongNote(n, userId);
    }
  }, [folders, userId]);

  const isMobileEditing = activeNoteId !== null;

  if (!loaded) {
    return (
      <div className="nv-page">
        <div className="nv-loading">Loading notes...</div>
      </div>
    );
  }

  return (
    <div className="nv-page">
      {showImport && (
        <NoteImport
          folders={folders}
          onImportNotes={handleImportNotes}
          onClose={() => setShowImport(false)}
        />
      )}

      <header className="nv-header">
        <div className="nv-header__left">
          <button type="button" className="nv-header__back" onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Shelves
          </button>
          <span className="nv-header__sep" />
          <h1 className="nv-header__title">Notes</h1>
        </div>
        <div className="nv-header__right">
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleDarkMode}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          {onSignOut && (
            <button type="button" className="signout-btn" onClick={onSignOut}>Sign out</button>
          )}
        </div>
      </header>

      <div className={`nv-body${isMobileEditing ? ' nv-body--editing' : ''}`}>
        <aside className="nv-sidebar">
          <NoteFolders
            folders={folders}
            activeFolderId={activeFolderId}
            onSelectFolder={setActiveFolderId}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        </aside>

        <div className="nv-list-pane">
          <NotesList
            notes={longNotes}
            activeNoteId={activeNoteId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeFolderId={activeFolderId}
            folders={folders}
            onFolderChange={setActiveFolderId}
            allTags={allTags}
            activeTag={activeTag}
            onTagChange={setActiveTag}
            onSelectNote={setActiveNoteId}
            onCreateNote={createNote}
            onDeleteNote={deleteNote}
            onImport={() => setShowImport(true)}
          />
        </div>

        <div className="nv-editor-pane">
          {activeNote && (
            <div className="nv-editor-topbar">
              <select
                className="nv-folder-badge"
                value={activeNote.folderId || ''}
                onChange={(e) => moveToFolder(e.target.value || null)}
              >
                <option value="">No folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <button
                type="button"
                className={`nv-pin-badge${activeNote.isPinned ? ' is-on' : ''}`}
                onClick={togglePin}
              >
                {activeNote.isPinned ? '⊹ Pinned' : '⊹ Pin'}
              </button>
            </div>
          )}
          <NoteEditor
            note={activeNote}
            onUpdateTitle={updateNoteTitle}
            onUpdateContent={updateNoteContent}
            onBack={() => setActiveNoteId(null)}
          />
          {activeNote && (
            <div className="nv-note-meta">
              <div className="nv-tags">
                {(activeNote.tags || []).map((t) => (
                  <span key={t} className="nv-tag">
                    #{t}
                    <button type="button" className="nv-tag__rm" onClick={() => removeTag(t)}>×</button>
                  </span>
                ))}
                <TagInput onAdd={addTag} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TagInput({ onAdd }) {
  const [value, setValue] = useState('');
  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (value.trim()) {
        onAdd(value.trim());
        setValue('');
      }
    }
  };
  return (
    <input
      className="nv-tag-input"
      type="text"
      placeholder="Add tag…"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKey}
      onBlur={() => {
        if (value.trim()) { onAdd(value.trim()); setValue(''); }
      }}
    />
  );
}

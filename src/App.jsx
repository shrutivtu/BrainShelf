import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AuthGate from './components/AuthGate.jsx';
import BrainDump from './components/BrainDump.jsx';
import HealthActions from './components/HealthActions.jsx';
import NoteList from './components/NoteList.jsx';
import OneThingCard from './components/OneThingCard.jsx';
import SectionNav from './components/SectionNav.jsx';
import TodayPanel from './components/TodayPanel.jsx';
import { createNote, nowIso } from './utils/noteModel.js';
import {
  archiveCloudNotesByDone,
  deleteCloudNote,
  deleteCloudNotesByArchive,
  hasLocalData,
  loadCloudState,
  loadLocalState,
  migrateLocalToCloud,
  saveCloudAppState,
  saveCloudNote,
  saveCloudReorder,
  saveLocalState,
} from './utils/storage.js';

const HEALTH_COPY = {
  water: 'Drink water',
  breathe: 'Take a slow breath',
  stretch: 'Quick stretch',
  walk: 'Short walk',
};

const MAX_TODAY = 3;

function AppInner({ userId, onSignOut }) {
  const [notes, setNotes] = useState([]);
  const [oneThingId, setOneThingId] = useState(null);
  const [settings, setSettings] = useState({});
  const [activeSection, setActiveSection] = useState('inbox');
  const [personFilter, setPersonFilter] = useState('');
  const [dumpText, setDumpText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const notesRef = useRef(notes);
  notesRef.current = notes;

  // ── Load data on mount ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const local = loadLocalState();

      if (userId) {
        if (hasLocalData()) {
          const migrated = await migrateLocalToCloud(userId);
          if (migrated && !cancelled) {
            setToast('Existing notes imported to your account.');
          }
        }
        const cloud = await loadCloudState(userId);
        if (!cancelled && cloud && cloud.notes.length > 0) {
          setNotes(cloud.notes);
          setOneThingId(cloud.oneThingId);
          setSettings(cloud.settings);
          setDataLoaded(true);
          return;
        }
      }

      if (!cancelled) {
        setNotes(local.notes);
        setOneThingId(local.oneThingId);
        setSettings(local.settings);
        setDataLoaded(true);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [userId]);

  // ── Always write-through to localStorage as cache ─────────────────
  useEffect(() => {
    if (!dataLoaded) return;
    saveLocalState({ notes, oneThingId, settings });
  }, [notes, oneThingId, settings, dataLoaded]);

  // ── Sync oneThingId / settings to cloud when they change ──────────
  const prevOneThingRef = useRef(oneThingId);
  const prevSettingsRef = useRef(settings);
  useEffect(() => {
    if (!dataLoaded || !userId) return;
    if (prevOneThingRef.current !== oneThingId || prevSettingsRef.current !== settings) {
      prevOneThingRef.current = oneThingId;
      prevSettingsRef.current = settings;
      saveCloudAppState(userId, oneThingId, settings);
    }
  }, [oneThingId, settings, userId, dataLoaded]);

  useEffect(() => {
    if (oneThingId && !notes.some((n) => n.id === oneThingId)) {
      setOneThingId(null);
    }
  }, [notes, oneThingId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Dark mode: sync data-theme attribute ──────────────────────────
  useEffect(() => {
    const isDark = settings.darkMode;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = isDark ? '#1E1D1B' : '#7A8F76';
  }, [settings.darkMode]);

  // ── Memos ─────────────────────────────────────────────────────────

  const oneThingNote = useMemo(
    () => (oneThingId ? notes.find((n) => n.id === oneThingId) : null),
    [notes, oneThingId]
  );

  const todayNotes = useMemo(
    () =>
      notes
        .filter((n) => n.isToday && !n.isDone && n.section !== 'archive')
        .sort((a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || '')),
    [notes]
  );

  const personOptions = useMemo(() => {
    const uniq = new Set();
    for (const n of notes) {
      const p = (n.personTag || '').trim();
      if (p) uniq.add(p);
    }
    return Array.from(uniq).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const noteCounts = useMemo(() => {
    const c = {
      inbox: 0,
      work: 0,
      personal: 0,
      health: 0,
      people: 0,
      random: 0,
      brainshelf: 0,
      archive: 0,
      done: 0,
    };
    for (const n of notes) {
      if (n.section === 'archive') c.archive += 1;
      else if (n.isDone) c.done += 1;
      else if (c[n.section] != null) c[n.section] += 1;
    }
    return c;
  }, [notes]);

  const filteredForList = useMemo(() => {
    let list;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = notes.filter((n) => {
        if ((n.text || '').toLowerCase().includes(q)) return true;
        if ((n.personTag || '').toLowerCase().includes(q)) return true;
        if ((n.subtasks || []).some((s) => s.text.toLowerCase().includes(q))) return true;
        if ((n.comments || []).some((c) => c.text.toLowerCase().includes(q))) return true;
        return false;
      });
      return [...list].sort((a, b) => {
        const tb = new Date(b.updatedAt || b.createdAt).getTime();
        const ta = new Date(a.updatedAt || a.createdAt).getTime();
        return tb - ta;
      });
    } else if (activeSection === 'archive') {
      list = notes.filter((n) => n.section === 'archive');
    } else if (activeSection === 'done') {
      list = notes.filter((n) => n.isDone && n.section !== 'archive');
    } else {
      list = notes.filter((n) => !n.isDone && n.section === activeSection);
    }
    if (personFilter.trim()) {
      const pf = personFilter.trim().toLowerCase();
      list = list.filter((n) => (n.personTag || '').trim().toLowerCase() === pf);
    }
    return list;
  }, [notes, activeSection, personFilter, searchQuery]);

  const replaceCandidates = useMemo(
    () => notes.filter((n) => !n.isDone && n.section !== 'archive').sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
    [notes]
  );

  // ── Handlers ──────────────────────────────────────────────────────

  const addNote = useCallback((partial) => {
    const note = createNote(partial);
    setNotes((prev) => {
      const next = [note, ...prev];
      if (userId) saveCloudNote(note, userId, 0);
      return next;
    });
    return note;
  }, [userId]);

  const updateNote = useCallback((id, patch) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: patch.updatedAt ?? nowIso() } : n));
      if (userId) {
        const updated = next.find((n) => n.id === id);
        const idx = next.indexOf(updated);
        if (updated) saveCloudNote(updated, userId, idx);
      }
      return next;
    });
  }, [userId]);

  const deleteNote = useCallback((id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setOneThingId((cur) => (cur === id ? null : cur));
    if (userId) deleteCloudNote(id);
  }, [userId]);

  const handleDumpSubmit = useCallback((textFromField) => {
    const text = String(textFromField ?? dumpText).trim();
    if (!text) return;
    addNote({ text, section: 'inbox', color: 'default' });
    setDumpText('');
  }, [dumpText, addNote]);

  const handleSetOneThing = useCallback((id) => {
    setOneThingId(id);
  }, []);

  const handleClearOneThing = useCallback(() => {
    setOneThingId(null);
  }, []);

  const handlePinToday = useCallback(
    (id) => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      if (note.isToday) {
        updateNote(id, { isToday: false });
        return;
      }
      const count = notes.filter((n) => n.isToday && !n.isDone).length;
      if (count >= MAX_TODAY) {
        setToast('Three is enough for today.');
        return;
      }
      updateNote(id, { isToday: true });
    },
    [notes, updateNote]
  );

  const handleUnpinToday = useCallback(
    (id) => {
      const n = notes.find((x) => x.id === id);
      updateNote(id, { isToday: false });
      if (n) {
        const label = n.section.charAt(0).toUpperCase() + n.section.slice(1);
        setToast(`Unpinned — note is in ${label}.`);
      }
    },
    [notes, updateNote]
  );

  const handleToggleDone = useCallback(
    (id) => {
      const n = notes.find((x) => x.id === id);
      if (!n) return;
      const next = !n.isDone;
      updateNote(id, { isDone: next, isToday: next ? false : n.isToday });
      if (next && oneThingId === id) {
        setOneThingId(null);
      }
    },
    [notes, updateNote, oneThingId]
  );

  const handleOneThingMarkDone = useCallback(
    (id) => {
      handleToggleDone(id);
    },
    [handleToggleDone]
  );

  const handleHealth = useCallback(
    (key) => {
      const text = HEALTH_COPY[key] || key;
      addNote({ text, section: 'health', color: 'health' });
    },
    [addNote]
  );

  const handleReorder = useCallback((draggedId, targetId, position) => {
    setNotes((prev) => {
      const updated = [...prev];
      const dragIdx = updated.findIndex((n) => n.id === draggedId);
      if (dragIdx === -1) return prev;
      const [dragged] = updated.splice(dragIdx, 1);
      let targetIdx = updated.findIndex((n) => n.id === targetId);
      if (targetIdx === -1) return prev;
      if (position === 'below') targetIdx += 1;
      updated.splice(targetIdx, 0, dragged);
      if (userId) saveCloudReorder(updated, userId);
      return updated;
    });
  }, [userId]);

  const archiveNote = useCallback(
    (id) => {
      updateNote(id, { section: 'archive', isToday: false });
      if (oneThingId === id) setOneThingId(null);
    },
    [updateNote, oneThingId]
  );

  const restoreNote = useCallback(
    (id) => {
      updateNote(id, { section: 'inbox', isDone: false });
    },
    [updateNote]
  );

  const handleClearDone = useCallback(() => {
    setNotes((prev) =>
      prev.map((n) =>
        n.isDone && n.section !== 'archive'
          ? { ...n, section: 'archive', updatedAt: new Date().toISOString() }
          : n
      )
    );
    if (userId) archiveCloudNotesByDone(userId);
    setToast('Done notes moved to Archive.');
  }, [userId]);

  const handleClearArchive = useCallback(() => {
    setNotes((prev) => prev.filter((n) => n.section !== 'archive'));
    if (userId) deleteCloudNotesByArchive(userId);
    setToast('Archive emptied.');
  }, [userId]);

  const toggleDarkMode = useCallback(() => {
    setSettings((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  }, []);

  const recentTitle = searchQuery.trim()
    ? `Results for "${searchQuery.trim()}"`
    : activeSection === 'archive'
      ? 'Archive'
      : activeSection === 'done'
        ? 'Recent · Done'
        : `Recent · ${activeSection.charAt(0).toUpperCase()}${activeSection.slice(1)}`;

  if (!dataLoaded) {
    return (
      <div className="bs-root auth-loading">
        <p>Loading your shelf...</p>
      </div>
    );
  }

  return (
    <div className="bs-root app-root">
      {toast ? (
        <div className="toast is-visible" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}

      <div className="app-frame">
        <aside className="rail" aria-label="Shelves">
          <SectionNav activeSection={activeSection} onSelect={setActiveSection} noteCounts={noteCounts} />
        </aside>

        <div className="page">
          <header className="app-header">
            <div className="header-mark">
              <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden>
                <rect x="8" y="12" width="32" height="6" rx="3" style={{ fill: 'var(--accent)' }} />
                <rect x="8" y="22" width="26" height="6" rx="3" style={{ fill: 'var(--ink-1)' }} />
                <rect x="8" y="32" width="20" height="6" rx="3" style={{ fill: 'var(--accent-soft-line)' }} />
              </svg>
              <span className="header-mark__name">BrainShelf</span>
            </div>
            <div className="header-right">
              <span className="header-tagline">A quiet place for your thoughts.</span>
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleDarkMode}
                title={settings.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label={settings.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {settings.darkMode ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>
              {onSignOut && (
                <button type="button" className="signout-btn" onClick={onSignOut}>
                  Sign out
                </button>
              )}
            </div>
          </header>

          <div className="focus-band">
            <OneThingCard
              note={oneThingNote}
              candidateNotes={replaceCandidates}
              onUpdateText={(id, text) => updateNote(id, { text })}
              onMarkDone={handleOneThingMarkDone}
              onClear={handleClearOneThing}
              onSelectReplace={handleSetOneThing}
            />
            <TodayPanel todayNotes={todayNotes} onUnpinToday={handleUnpinToday} />
          </div>

          <HealthActions onCreateHealthNote={handleHealth} />

          <BrainDump value={dumpText} onChange={setDumpText} onSubmit={handleDumpSubmit} />

          <div className="search-bar">
            <input
              type="search"
              className="search-input"
              placeholder="Search across all shelves…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {personOptions.length > 0 && !searchQuery.trim() ? (
            <div className="person-filter">
              <span className="person-filter__label">People</span>
              <button
                type="button"
                className={`person-filter__chip${personFilter === '' ? ' is-on' : ''}`}
                onClick={() => setPersonFilter('')}
              >
                All
              </button>
              {personOptions.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`person-filter__chip${personFilter === p ? ' is-on' : ''}`}
                  onClick={() => setPersonFilter(personFilter === p ? '' : p)}
                >
                  {p}
                </button>
              ))}
            </div>
          ) : null}

          <NoteList
            title={recentTitle}
            notes={filteredForList}
            oneThingId={oneThingId}
            onUpdate={updateNote}
            onSetOneThing={handleSetOneThing}
            onPinToday={handlePinToday}
            onToggleDone={handleToggleDone}
            onDelete={deleteNote}
            onArchive={archiveNote}
            onRestore={restoreNote}
            onReorder={handleReorder}
            emptyMessage={
              activeSection === 'archive'
                ? 'Nothing archived yet.'
                : personFilter.trim()
                  ? 'No notes for this person here.'
                  : 'Nothing here yet. Add a thought above.'
            }
          />

          {activeSection === 'done' && noteCounts.done > 0 ? (
            <div className="clear-done-wrap">
              <button type="button" className="clear-done" onClick={handleClearDone}>
                Archive completed
              </button>
              <span className="clear-done__hint">done is good.</span>
            </div>
          ) : null}

          {activeSection === 'archive' && noteCounts.archive > 0 ? (
            <div className="clear-done-wrap">
              <button type="button" className="clear-done" onClick={handleClearArchive}>
                Empty archive
              </button>
              <span className="clear-done__hint">gone for good.</span>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="app-footer">
        <p>Everything stays safe in the cloud.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthGate>
      {({ userId, onSignOut }) => (
        <AppInner userId={userId} onSignOut={onSignOut} />
      )}
    </AuthGate>
  );
}

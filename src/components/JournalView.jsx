import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import { getEditorExtensions } from '../utils/editorExtensions.js';
import {
  createLongNote,
  loadCloudNotes,
  loadLocalNotes,
  saveCloudLongNote,
  saveLocalNotes,
  deleteCloudLongNote,
} from '../utils/notesStorage.js';

const MOODS = [
  { id: 'great', emoji: '😊', label: 'Great' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'okay', emoji: '😐', label: 'Okay' },
  { id: 'low', emoji: '😔', label: 'Low' },
  { id: 'rough', emoji: '😣', label: 'Rough' },
];

const PROMPTS = [
  { key: 'feeling', placeholder: 'How are you feeling today?' },
  { key: 'happened', placeholder: 'What happened today?' },
  { key: 'grateful', placeholder: 'Something I\'m grateful for...' },
];

function todayDateStr() {
  return new Date().toLocaleDateString('en-CA');
}

function formatDateTitle(iso) {
  try {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatShortDate(iso) {
  try {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function JournalView({ userId, onBack, onSignOut, darkMode, onToggleDarkMode }) {
  const [entries, setEntries] = useState([]);
  const [activeEntryId, setActiveEntryId] = useState(null);
  const [showPrev, setShowPrev] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef(null);
  const allNotesRef = useRef([]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      let allNotes = [];
      if (userId) {
        const cloud = await loadCloudNotes(userId);
        if (cloud) allNotes = cloud.longNotes;
      }
      if (allNotes.length === 0) {
        const local = loadLocalNotes();
        allNotes = local.longNotes;
      }
      if (cancelled) return;

      const journalEntries = allNotes.filter((n) => n.kind === 'journal');
      journalEntries.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      allNotesRef.current = allNotes;
      setEntries(journalEntries);
      setLoaded(true);
    }
    init();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!loaded) return;
    const otherNotes = allNotesRef.current.filter((n) => n.kind !== 'journal');
    saveLocalNotes({ longNotes: [...otherNotes, ...entries], folders: [] });
  }, [entries, loaded]);

  const activeEntry = useMemo(
    () => entries.find((e) => e.id === activeEntryId) || null,
    [entries, activeEntryId]
  );

  const createTodayEntry = useCallback(() => {
    const today = todayDateStr();
    const existing = entries.find((e) => e.title === today);
    if (existing) {
      setActiveEntryId(existing.id);
      return;
    }
    const entry = createLongNote({
      title: today,
      kind: 'journal',
      content: { mood: null, prompts: { feeling: '', happened: '', grateful: '' }, body: null },
    });
    setEntries((prev) => [entry, ...prev]);
    setActiveEntryId(entry.id);
    if (userId) saveCloudLongNote(entry, userId);
  }, [entries, userId]);

  const updateEntry = useCallback((id, patch) => {
    setEntries((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e));
      allNotesRef.current = [
        ...allNotesRef.current.filter((n) => n.kind !== 'journal'),
        ...next,
      ];
      return next;
    });
  }, []);

  const saveToCloud = useCallback((id) => {
    if (!userId) return;
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) saveCloudLongNote(entry, userId);
      return prev;
    });
  }, [userId]);

  const deleteEntry = useCallback((id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (activeEntryId === id) setActiveEntryId(null);
    if (userId) deleteCloudLongNote(id);
  }, [userId, activeEntryId]);

  const setMood = useCallback((moodId) => {
    if (!activeEntry) return;
    const content = activeEntry.content || {};
    updateEntry(activeEntry.id, { content: { ...content, mood: content.mood === moodId ? null : moodId } });
    saveToCloud(activeEntry.id);
  }, [activeEntry, updateEntry, saveToCloud]);

  const updatePrompt = useCallback((key, value) => {
    if (!activeEntry) return;
    const content = activeEntry.content || {};
    const prompts = { ...(content.prompts || {}), [key]: value };
    updateEntry(activeEntry.id, { content: { ...content, prompts } });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveToCloud(activeEntry.id), 1200);
  }, [activeEntry, updateEntry, saveToCloud]);

  const updateBody = useCallback((json) => {
    if (!activeEntry) return;
    const content = activeEntry.content || {};
    updateEntry(activeEntry.id, { content: { ...content, body: json } });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveToCloud(activeEntry.id), 1200);
  }, [activeEntry, updateEntry, saveToCloud]);

  const prevEntries = useMemo(
    () => entries.filter((e) => e.id !== activeEntryId),
    [entries, activeEntryId]
  );

  if (!loaded) {
    return (
      <div className="jv-page">
        <p style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Loading journal...</p>
      </div>
    );
  }

  return (
    <div className="jv-page">
      <header className="jv-header">
        <div className="jv-header__left">
          <button type="button" className="jv-header__back" onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Shelves
          </button>
          <span className="jv-header__sep" />
          <h1 className="jv-header__title">Journal</h1>
        </div>
        <div className="jv-header__right">
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

      <div className="jv-body">
        <div className="jv-main">
          {!activeEntry ? (
            <div className="jv-welcome">
              <h2 className="jv-welcome__title">Your journal</h2>
              <p className="jv-welcome__sub">A calm space to check in with yourself.</p>
              <button type="button" className="jv-welcome__btn" onClick={createTodayEntry}>
                Write today's entry
              </button>
              {prevEntries.length > 0 && (
                <button
                  type="button"
                  className="jv-welcome__prev-link"
                  onClick={() => setShowPrev(true)}
                >
                  or browse {prevEntries.length} previous {prevEntries.length === 1 ? 'entry' : 'entries'}
                </button>
              )}
            </div>
          ) : (
            <div className="jv-entry">
              <div className="jv-entry__date-row">
                <h2 className="jv-entry__date">{formatDateTitle(activeEntry.title)}</h2>
                <button
                  type="button"
                  className="jv-entry__prev-toggle"
                  onClick={() => setShowPrev((p) => !p)}
                >
                  {showPrev ? 'Hide entries' : `Previous (${prevEntries.length})`}
                </button>
              </div>

              <div className="jv-mood">
                <span className="jv-mood__label">How's today?</span>
                <div className="jv-mood__pills">
                  {MOODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`jv-mood__pill${(activeEntry.content?.mood) === m.id ? ' is-active' : ''}`}
                      onClick={() => setMood(m.id)}
                      title={m.label}
                    >
                      <span className="jv-mood__emoji">{m.emoji}</span>
                      <span className="jv-mood__text">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="jv-prompts">
                {PROMPTS.map((p) => (
                  <div key={p.key} className="jv-prompt">
                    <label className="jv-prompt__label">{p.placeholder}</label>
                    <textarea
                      className="jv-prompt__input"
                      placeholder="..."
                      value={activeEntry.content?.prompts?.[p.key] || ''}
                      onChange={(e) => updatePrompt(p.key, e.target.value)}
                      rows={2}
                    />
                  </div>
                ))}
              </div>

              <div className="jv-freeform">
                <label className="jv-freeform__label">Anything else on your mind...</label>
                <JournalEditor
                  key={activeEntry.id}
                  initialContent={activeEntry.content?.body || null}
                  onUpdate={updateBody}
                />
              </div>
            </div>
          )}
        </div>

        {showPrev && (
          <aside className="jv-prev">
            <div className="jv-prev__header">
              <h3 className="jv-prev__title">Previous entries</h3>
              <button type="button" className="jv-prev__close" onClick={() => setShowPrev(false)}>×</button>
            </div>
            <ul className="jv-prev__list">
              {entries.map((e) => {
                const mood = MOODS.find((m) => m.id === e.content?.mood);
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      className={`jv-prev__item${activeEntryId === e.id ? ' is-active' : ''}`}
                      onClick={() => { setActiveEntryId(e.id); if (window.innerWidth < 769) setShowPrev(false); }}
                    >
                      <span className="jv-prev__date">{formatShortDate(e.title)}</span>
                      {mood && <span className="jv-prev__mood">{mood.emoji}</span>}
                      <span className="jv-prev__preview">
                        {e.content?.prompts?.feeling
                          ? e.content.prompts.feeling.slice(0, 60)
                          : 'No entry yet'}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="jv-prev__del"
                      onClick={(ev) => { ev.stopPropagation(); deleteEntry(e.id); }}
                      title="Delete entry"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}

function JournalEditor({ initialContent, onUpdate }) {
  const editor = useEditor({
    extensions: [
      ...getEditorExtensions(),
      Placeholder.configure({ placeholder: 'Write freely...' }),
    ],
    content: initialContent || '',
    onUpdate: ({ editor: ed }) => {
      onUpdate(ed.getJSON());
    },
    editorProps: {
      attributes: { class: 'jv-editor-body' },
    },
  });

  return <EditorContent editor={editor} className="jv-editor-wrap" />;
}

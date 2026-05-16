import { useEffect, useMemo, useState } from 'react';
import { COLORS, SECTIONS, newId, nowIso } from '../utils/noteModel.js';

const SECTION_OPTIONS = SECTIONS.filter((s) => s.id !== 'done' && s.id !== 'archive');

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function NoteItem({
  note,
  oneThingId,
  onUpdate,
  onSetOneThing,
  onPinToday,
  onToggleDone,
  onDelete,
  onArchive,
  onRestore,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging,
  dragIndicator,
}) {
  const isGrocery = note.section === 'grocery';
  const [editingText, setEditingText] = useState(false);
  const [textDraft, setTextDraft] = useState(note.text);
  const [showSubtasks, setShowSubtasks] = useState(isGrocery);
  const [showComments, setShowComments] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    setTextDraft(note.text);
  }, [note.id, note.text]);

  const isOneThing = oneThingId === note.id;
  const stamp = useMemo(
    () => formatTime(note.updatedAt || note.createdAt),
    [note.updatedAt, note.createdAt]
  );
  const labelKey = note.color && note.color !== 'default' ? note.color : 'default';
  const subtasks = note.subtasks || [];
  const comments = note.comments || [];
  const subtasksDone = subtasks.filter((s) => s.isDone).length;

  const commitText = () => {
    setEditingText(false);
    if (textDraft !== note.text) {
      onUpdate(note.id, { text: textDraft, updatedAt: nowIso() });
    }
  };

  const handleAddSubtask = () => {
    const text = newSubtask.trim();
    if (!text) return;
    onUpdate(note.id, {
      subtasks: [...subtasks, { id: newId(), text, isDone: false }],
      updatedAt: nowIso(),
    });
    setNewSubtask('');
  };

  const handleToggleSubtask = (stId) => {
    onUpdate(note.id, {
      subtasks: subtasks.map((s) => (s.id === stId ? { ...s, isDone: !s.isDone } : s)),
      updatedAt: nowIso(),
    });
  };

  const handleDeleteSubtask = (stId) => {
    onUpdate(note.id, {
      subtasks: subtasks.filter((s) => s.id !== stId),
      updatedAt: nowIso(),
    });
  };

  const handleAddComment = () => {
    const text = newComment.trim();
    if (!text) return;
    onUpdate(note.id, {
      comments: [...comments, { id: newId(), text, createdAt: nowIso() }],
      updatedAt: nowIso(),
    });
    setNewComment('');
  };

  const handleDeleteComment = (cId) => {
    onUpdate(note.id, {
      comments: comments.filter((c) => c.id !== cId),
      updatedAt: nowIso(),
    });
  };

  return (
    <li
      className={`item item--stacked item--label-${labelKey}${note.isDone ? ' is-done' : ''}${note.isToday ? ' is-today' : ''}${isDragging ? ' is-dragging' : ''}${dragIndicator === 'above' ? ' drag-above' : ''}${dragIndicator === 'below' ? ' drag-below' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
        onDragOver?.(note.id, pos);
      }}
      onDrop={(e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
        onDrop?.(note.id, pos);
      }}
    >
      <div className="item-row">
        <span
          className="drag-handle"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', note.id);
            const li = e.target.closest('.item');
            if (li) e.dataTransfer.setDragImage(li, 20, 20);
            onDragStart?.(note.id);
          }}
          onDragEnd={() => onDragEnd?.()}
          title="Drag to reorder"
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden>
            <circle cx="3" cy="2.5" r="1.5" />
            <circle cx="7" cy="2.5" r="1.5" />
            <circle cx="3" cy="8" r="1.5" />
            <circle cx="7" cy="8" r="1.5" />
            <circle cx="3" cy="13.5" r="1.5" />
            <circle cx="7" cy="13.5" r="1.5" />
          </svg>
        </span>
        <span className={`item-dot item-dot--${labelKey}`} aria-hidden />
        <div className="item-body">
          {editingText ? (
            <textarea
              className="item-text"
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              onBlur={commitText}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setTextDraft(note.text);
                  setEditingText(false);
                }
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  commitText();
                }
              }}
              rows={3}
              autoFocus
              aria-label="Edit note"
            />
          ) : (
            <button
              type="button"
              className="item-text item-text--editable"
              onClick={() => setEditingText(true)}
              title="Click to edit"
            >
              {note.text || <span className="bs-meta">empty note</span>}
            </button>
          )}
          <time className="item-time" dateTime={note.updatedAt || note.createdAt}>
            {stamp}
          </time>
        </div>
        <div className="item-actions" role="group" aria-label="Note actions">
          {note.section === 'archive' ? (
            <>
              <button
                type="button"
                className="item-action item-action--text"
                onClick={() => onRestore(note.id)}
              >
                Restore
              </button>
              <button
                type="button"
                className="item-action item-action--text item-action--danger"
                onClick={() => onDelete(note.id)}
              >
                Delete
              </button>
            </>
          ) : !note.isDone ? (
            <>
              <button
                type="button"
                className={`item-action item-action--text${isOneThing ? ' is-pinned' : ''}`}
                onClick={() => onSetOneThing(note.id)}
                disabled={isOneThing}
                title={isOneThing ? 'Already your one thing' : 'Set as One Thing'}
              >
                One thing
              </button>
              <button
                type="button"
                className={`item-action item-action--text${note.isToday ? ' is-pinned' : ''}`}
                onClick={() => onPinToday(note.id)}
              >
                {note.isToday ? 'Pinned' : 'Today'}
              </button>
              <button
                type="button"
                className="item-action item-action--text"
                onClick={() => onToggleDone(note.id)}
              >
                Done
              </button>
              <button
                type="button"
                className="item-action item-action--text"
                onClick={() => onArchive(note.id)}
              >
                Archive
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="item-action item-action--text"
                onClick={() => onToggleDone(note.id)}
              >
                Undo
              </button>
              <button
                type="button"
                className="item-action item-action--text"
                onClick={() => onArchive(note.id)}
              >
                Archive
              </button>
            </>
          )}
        </div>
      </div>

      <div className="item-meta">
        <label className="visually-hidden" htmlFor={`sec-${note.id}`}>
          Section
        </label>
        <select
          id={`sec-${note.id}`}
          value={SECTION_OPTIONS.some((s) => s.id === note.section) ? note.section : 'inbox'}
          onChange={(e) =>
            onUpdate(note.id, { section: e.target.value, updatedAt: nowIso() })
          }
        >
          {SECTION_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="item-colors" role="radiogroup" aria-label="Note color">
          {COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`item-color-dot item-color-dot--${c.id}${note.color === c.id ? ' is-active' : ''}`}
              onClick={() =>
                onUpdate(note.id, { color: c.id, updatedAt: nowIso() })
              }
              title={c.label}
              aria-label={c.label}
            />
          ))}
        </div>

        <input
          type="text"
          placeholder="person"
          value={note.personTag ?? ''}
          onChange={(e) =>
            onUpdate(note.id, { personTag: e.target.value, updatedAt: nowIso() })
          }
          aria-label="Person label"
        />
      </div>

      <div className="item-toggles">
        <button
          type="button"
          className={`item-toggle${showSubtasks ? ' is-open' : ''}`}
          onClick={() => setShowSubtasks(!showSubtasks)}
        >
          {isGrocery ? 'Items' : 'Subtasks'}
          {subtasks.length > 0 && (
            <span className="item-toggle__badge">
              {subtasksDone}/{subtasks.length}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`item-toggle${showComments ? ' is-open' : ''}`}
          onClick={() => setShowComments(!showComments)}
        >
          Comments
          {comments.length > 0 && (
            <span className="item-toggle__badge">{comments.length}</span>
          )}
        </button>
      </div>

      {showSubtasks && (
        <div className="item-subtasks">
          {subtasks.length > 0 && (
            <ul className="item-subtasks__list">
              {subtasks.map((st) => (
                <li key={st.id} className={`item-subtask${st.isDone ? ' is-done' : ''}`}>
                  <label className="item-subtask__label">
                    <input
                      type="checkbox"
                      checked={st.isDone}
                      onChange={() => handleToggleSubtask(st.id)}
                    />
                    <span className="item-subtask__text">{st.text}</span>
                  </label>
                  <button
                    type="button"
                    className="item-subtask__del"
                    onClick={() => handleDeleteSubtask(st.id)}
                    aria-label={`Delete subtask: ${st.text}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            type="text"
            className="item-subtask__add"
            placeholder={isGrocery ? 'Add an item…' : 'Add a subtask…'}
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddSubtask();
              }
            }}
          />
        </div>
      )}

      {showComments && (
        <div className="item-comments">
          {comments.length > 0 && (
            <ul className="item-comments__list">
              {comments.map((c) => (
                <li key={c.id} className="item-comment">
                  <p className="item-comment__text">{c.text}</p>
                  <div className="item-comment__foot">
                    <time className="item-comment__time">
                      {formatTime(c.createdAt)}
                    </time>
                    <button
                      type="button"
                      className="item-comment__del"
                      onClick={() => handleDeleteComment(c.id)}
                      aria-label="Delete comment"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="item-comment__add">
            <input
              type="text"
              placeholder="Add a comment…"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            {newComment.trim() && (
              <button type="button" onClick={handleAddComment}>
                Post
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

import { useEffect, useState } from 'react';

export default function OneThingCard({
  note,
  candidateNotes,
  onUpdateText,
  onMarkDone,
  onClear,
  onSelectReplace,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note?.text ?? '');

  useEffect(() => {
    setDraft(note?.text ?? '');
  }, [note?.id, note?.text]);

  if (!note) {
    return (
      <section className="one-thing" aria-labelledby="one-thing-heading">
        <h2 id="one-thing-heading" className="one-thing-label">
          One thing
        </h2>
        <div className="one-thing-card one-thing-card--empty">
          <p className="one-thing-text-empty">Choose one thing for now.</p>
          <div className="one-thing-foot">
            <span className="one-thing-hint">put it here. sort it later.</span>
          </div>
        </div>
        {candidateNotes.length > 0 ? (
          <div className="one-thing-more">
            <label htmlFor="one-thing-pick">Pick from a note</label>
            <select
              id="one-thing-pick"
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id) onSelectReplace(id);
                e.target.value = '';
              }}
            >
              <option value="">—</option>
              {candidateNotes.map((n) => (
                <option key={n.id} value={n.id}>
                  {(n.text || 'empty').slice(0, 60)}
                  {(n.text || '').length > 60 ? '…' : ''}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </section>
    );
  }

  const tone = note.color && note.color !== 'default' ? note.color : 'default';

  return (
    <section className="one-thing" aria-labelledby="one-thing-heading">
      <h2 id="one-thing-heading" className="one-thing-label">
        One thing
      </h2>
      <div className={`one-thing-card one-thing-card--tone-${tone}`}>
        {editing ? (
          <textarea
            className="one-thing-text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setEditing(false);
              onUpdateText(note.id, draft);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setDraft(note.text);
                setEditing(false);
              }
            }}
            rows={4}
            autoFocus
            aria-label="Edit one thing"
          />
        ) : (
          <button type="button" className="one-thing-text" onClick={() => setEditing(true)}>
            {note.text || 'Tap to add words'}
          </button>
        )}
        <div className="one-thing-foot">
          <span className="one-thing-hint">no rush. just this one.</span>
          <div className="one-thing-actions">
            <button type="button" className="one-thing-done" onClick={() => onMarkDone(note.id)}>
              Mark done
            </button>
            <button type="button" className="one-thing-edit" onClick={onClear}>
              Clear
            </button>
          </div>
        </div>
      </div>
      {candidateNotes.filter((n) => n.id !== note.id).length > 0 ? (
        <div className="one-thing-more">
          <label htmlFor="one-thing-swap">Replace with</label>
          <select
            id="one-thing-swap"
            value=""
            onChange={(e) => {
              const id = e.target.value;
              if (id) onSelectReplace(id);
              e.target.value = '';
            }}
          >
            <option value="">—</option>
            {candidateNotes
              .filter((n) => n.id !== note.id)
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {(n.text || 'empty').slice(0, 50)}
                  {(n.text || '').length > 50 ? '…' : ''}
                </option>
              ))}
          </select>
        </div>
      ) : null}
    </section>
  );
}

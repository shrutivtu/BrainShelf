import { useEffect, useState } from 'react';
import { useWhatNowAgent } from '../hooks/useWhatNowAgent';

export default function OneThingCard({
  note,
  candidateNotes,
  onUpdateText,
  onMarkDone,
  onClear,
  onSelectReplace,
  // Brain state props — passed from App.jsx to feed the agent
  todayPins,
  recentDumps,
  lastHealthCheck,
  healthNudges,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note?.text ?? '');
  const { answer, loading, error, ask, clear } = useWhatNowAgent();

  useEffect(() => {
    setDraft(note?.text ?? '');
  }, [note?.id, note?.text]);

  // Build the brain state object to send to the agent
  function buildBrainState() {
    return {
      oneThing: note ? { text: note.text, label: note.label ?? 'default' } : null,
      todayPins: todayPins ?? [],
      recentDumps: recentDumps ?? [],
      lastHealthCheck: lastHealthCheck ?? null,
      healthNudges: healthNudges ?? [],
    };
  }

  // ── Empty state ──────────────────────────────────────────────────────────

  if (!note) {
    return (
      <section className="one-thing" aria-labelledby="one-thing-heading">
        <h2 id="one-thing-heading" className="one-thing-label">
          One thing
        </h2>
        <div className="one-thing-card one-thing-card--empty">
          <p className="one-thing-text-empty">Choose one thing for now.</p>

          {/* What now? agent button — works even when no one thing is set */}
          <WhatNowButton loading={loading} onAsk={() => ask(buildBrainState())} onClear={clear} />
          {answer && <AgentAnswer answer={answer} onDismiss={clear} />}
          {error && <AgentError error={error} onDismiss={clear} />}

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

  // ── With note ────────────────────────────────────────────────────────────

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

        {/* Agent answer / error shown inline */}
        {answer && <AgentAnswer answer={answer} onDismiss={clear} />}
        {error && <AgentError error={error} onDismiss={clear} />}

        <div className="one-thing-foot">
          <WhatNowButton loading={loading} onAsk={() => ask(buildBrainState())} onClear={clear} />
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

// ── Sub-components ──────────────────────────────────────────────────────────

function WhatNowButton({ loading, onAsk, onClear }) {
  return (
    <button
      type="button"
      className="what-now-btn"
      onClick={loading ? onClear : onAsk}
      disabled={false}
      aria-label={loading ? 'Cancel' : 'Ask Claude what to do right now'}
    >
      {loading ? (
        <>
          <span className="what-now-spinner" aria-hidden="true" />
          thinking…
        </>
      ) : (
        <>⚡ What should I do right now?</>
      )}
    </button>
  );
}

function AgentAnswer({ answer, onDismiss }) {
  return (
    <div className="agent-answer" role="status" aria-live="polite">
      <p className="agent-answer-text">{answer}</p>
      <button
        type="button"
        className="agent-answer-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss suggestion"
      >
        ✕
      </button>
    </div>
  );
}

function AgentError({ error, onDismiss }) {
  return (
    <div className="agent-error" role="alert">
      <p className="agent-error-text">Couldn't reach the agent: {error}</p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss error">✕</button>
    </div>
  );
}

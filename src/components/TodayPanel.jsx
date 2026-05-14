export default function TodayPanel({ todayNotes, onUnpinToday }) {
  return (
    <aside className="today-panel" aria-labelledby="today-heading">
      <h2 id="today-heading" className="today-panel__title">
        Today
      </h2>
      <p className="today-panel__hint">no rush. just this one.</p>
      {todayNotes.length === 0 ? (
        <p className="today-panel__empty">Nothing pinned yet.</p>
      ) : (
        <ul className="today-panel__list">
          {todayNotes.map((n) => (
            <li key={n.id} className="today-panel__row">
              <span className={`today-panel__dot today-panel__dot--${n.color}`} aria-hidden />
              <div className="today-panel__body">
                <span className="today-panel__text">{n.text || '—'}</span>
                <span className="today-panel__section">
                  {n.section.charAt(0).toUpperCase() + n.section.slice(1)}
                </span>
              </div>
              <button
                type="button"
                className="today-panel__unpin"
                onClick={() => onUnpinToday(n.id)}
                aria-label={`Unpin from today: ${n.text?.slice(0, 40) || 'note'}`}
              >
                unpin
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export default function HealthActions({ onCreateHealthNote }) {
  const items = [
    { key: 'water', label: 'Water' },
    { key: 'breathe', label: 'Breathe' },
    { key: 'stretch', label: 'Stretch' },
    { key: 'walk', label: 'Walk' },
  ];

  return (
    <div className="health-actions" aria-label="Quick health reminders">
      {items.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className="health-actions__btn"
          onClick={() => onCreateHealthNote(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

import { useCallback } from 'react';

export default function BrainDump({ value, onChange, onSubmit }) {
  const save = useCallback(() => {
    const text = value.trim();
    if (!text) return;
    onSubmit(text);
  }, [value, onSubmit]);

  const handleKeyDown = useCallback(
    (e) => {
      const enter = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter';
      if (enter && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        save();
      }
    },
    [save]
  );

  const hasText = Boolean(value.trim());

  return (
    <div className="dump">
      <label htmlFor="brain-dump-input" className="dump-label">
        Brain dump
      </label>
      <p className="dump-hint">put it here. sort it later.</p>
      <textarea
        id="brain-dump-input"
        className="dump-input"
        placeholder="What’s on your mind? (Save button or ⌘↵ / Ctrl+↵)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={5}
        spellCheck
      />
      <div className="dump-foot">
        <span className="dump-hint">Saves to inbox.</span>
        <button
          type="button"
          className={`dump-save${hasText ? ' is-ready' : ''}`}
          onClick={save}
          disabled={!hasText}
          aria-label="Save note to inbox"
        >
          Save
        </button>
      </div>
    </div>
  );
}

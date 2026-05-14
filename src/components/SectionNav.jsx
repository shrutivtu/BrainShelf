import { useState, useEffect } from 'react';
import { SECTIONS } from '../utils/noteModel.js';

export default function SectionNav({ activeSection, onSelect, noteCounts }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleSelect = (id) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <nav className="section-nav" aria-label="Shelves">
      <button
        type="button"
        className="section-nav__burger"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close menu' : 'Open shelves menu'}
        aria-expanded={open}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
        <span className="section-nav__burger-label">
          {SECTIONS.find((s) => s.id === activeSection)?.label || 'Shelves'}
        </span>
      </button>

      {open && (
        <div className="section-nav__overlay" onClick={() => setOpen(false)} />
      )}

      <div className={`section-nav__drawer${open ? ' is-open' : ''}`}>
        <p className="section-nav__hint">Shelves</p>
        <ul className="section-nav__list">
          {SECTIONS.map(({ id, label }) => (
            <li key={id}>
              <button
                type="button"
                className={`section-nav__item${activeSection === id ? ' is-active' : ''}`}
                onClick={() => handleSelect(id)}
              >
                <span>{label}</span>
                {noteCounts[id] != null && noteCounts[id] > 0 ? (
                  <span className="section-nav__count">{noteCounts[id]}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

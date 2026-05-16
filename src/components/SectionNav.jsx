import { useState, useEffect } from 'react';
import { SECTIONS } from '../utils/noteModel.js';
import { navigate } from '../utils/router.js';

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

  const handleNotesClick = () => {
    navigate('/notes');
    setOpen(false);
  };

  const handleJournalClick = () => {
    navigate('/journal');
    setOpen(false);
  };

  const currentLabel = SECTIONS.find((s) => s.id === activeSection)?.label || 'Shelves';

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
        <span className="section-nav__burger-label">{currentLabel}</span>
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
                className={`section-nav__item${activeSection === id ? ' is-active' : ''}${id === 'grocery' ? ' section-nav__item--grocery' : ''}`}
                onClick={() => handleSelect(id)}
              >
                <span>
                  {id === 'grocery' ? (
                    <svg className="section-nav__leaf" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 9-9h7v7c0 5-4 9-9 9z" />
                      <path d="M4 20c4-4 8-7 16-9" />
                    </svg>
                  ) : null}
                  {label}
                </span>
                {noteCounts[id] != null && noteCounts[id] > 0 ? (
                  <span className="section-nav__count">{noteCounts[id]}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>

        <div className="section-nav__divider" />
        <button
          type="button"
          className="section-nav__item section-nav__item--notes"
          onClick={handleNotesClick}
        >
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: -2 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Notes
          </span>
        </button>
        <button
          type="button"
          className="section-nav__item section-nav__item--journal"
          onClick={handleJournalClick}
        >
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: -2 }}>
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            Journal
          </span>
        </button>
      </div>
    </nav>
  );
}

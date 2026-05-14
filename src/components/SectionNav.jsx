import { SECTIONS } from '../utils/noteModel.js';

export default function SectionNav({ activeSection, onSelect, noteCounts }) {
  return (
    <nav className="section-nav" aria-label="Shelves">
      <p className="section-nav__hint">Shelves</p>
      <ul className="section-nav__list">
        {SECTIONS.map(({ id, label }) => (
          <li key={id}>
            <button
              type="button"
              className={`section-nav__item${activeSection === id ? ' is-active' : ''}`}
              onClick={() => onSelect(id)}
            >
              <span>{label}</span>
              {noteCounts[id] != null && noteCounts[id] > 0 ? (
                <span className="section-nav__count">{noteCounts[id]}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

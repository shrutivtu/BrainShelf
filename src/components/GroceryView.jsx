import { useCallback, useMemo, useRef, useState } from 'react';
import { newId } from '../utils/noteModel.js';

export default function GroceryView({ groceryNote, onUpdateSubtasks, onCreateGroceryNote }) {
  const [inputText, setInputText] = useState('');
  const [addAsStaple, setAddAsStaple] = useState(false);
  const [showBought, setShowBought] = useState(false);
  const [showStaples, setShowStaples] = useState(false);
  const [recentlyBought, setRecentlyBought] = useState(new Set());
  const inputRef = useRef(null);

  const items = groceryNote?.subtasks || [];

  const activeItems = useMemo(
    () => items.filter((i) => !i.isDone),
    [items]
  );

  const boughtItems = useMemo(
    () => items.filter((i) => i.isDone),
    [items]
  );

  const staples = useMemo(
    () => items.filter((i) => i.isStaple),
    [items]
  );

  const readdableStaples = useMemo(
    () => staples.filter((s) => s.isDone || !items.some((i) => !i.isDone && i.text === s.text)),
    [staples, items]
  );

  const pushItems = useCallback((nextItems) => {
    if (groceryNote) {
      onUpdateSubtasks(groceryNote.id, nextItems);
    } else {
      onCreateGroceryNote(nextItems);
    }
  }, [groceryNote, onUpdateSubtasks, onCreateGroceryNote]);

  const handleAdd = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    const item = { id: newId(), text, isDone: false, isStaple: addAsStaple };
    pushItems([...items, item]);
    setInputText('');
    inputRef.current?.focus();
  }, [inputText, addAsStaple, items, pushItems]);

  const toggleBought = useCallback((id) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const nowDone = !item.isDone;
    if (nowDone) {
      setRecentlyBought((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setRecentlyBought((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 400);
    }
    pushItems(items.map((i) => (i.id === id ? { ...i, isDone: nowDone } : i)));
  }, [items, pushItems]);

  const toggleStaple = useCallback((id) => {
    pushItems(items.map((i) => (i.id === id ? { ...i, isStaple: !i.isStaple } : i)));
  }, [items, pushItems]);

  const deleteItem = useCallback((id) => {
    pushItems(items.filter((i) => i.id !== id));
  }, [items, pushItems]);

  const clearBought = useCallback(() => {
    pushItems(items.filter((i) => !i.isDone || i.isStaple).map((i) =>
      i.isDone && i.isStaple ? { ...i, isDone: false } : i
    ));
    setShowBought(false);
  }, [items, pushItems]);

  const readdStaple = useCallback((staple) => {
    const alreadyActive = items.some((i) => !i.isDone && i.text === staple.text);
    if (alreadyActive) return;
    const item = { id: newId(), text: staple.text, isDone: false, isStaple: true };
    pushItems([...items, item]);
  }, [items, pushItems]);

  return (
    <div className="grocery-view">
      <h2 className="grocery-view__title">
        <svg className="grocery-view__leaf" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 9-9h7v7c0 5-4 9-9 9z" />
          <path d="M4 20c4-4 8-7 16-9" />
        </svg>
        Grocery list
      </h2>

      <div className="grocery-view__add">
        <input
          ref={inputRef}
          type="text"
          className="grocery-view__input"
          placeholder="Add an item..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <button
          type="button"
          className={`grocery-view__staple-toggle${addAsStaple ? ' is-on' : ''}`}
          onClick={() => setAddAsStaple((p) => !p)}
          title={addAsStaple ? 'Adding as weekly staple' : 'Add as weekly staple'}
        >
          ★
        </button>
      </div>

      {activeItems.length === 0 && boughtItems.length === 0 ? (
        <p className="grocery-view__empty">Your list is empty. Type an item above to start.</p>
      ) : null}

      <ul className="grocery-view__list">
        {activeItems.map((item) => (
          <li
            key={item.id}
            className={`grocery-view__item${recentlyBought.has(item.id) ? ' is-fading' : ''}`}
          >
            <label className="grocery-view__check">
              <input
                type="checkbox"
                checked={false}
                onChange={() => toggleBought(item.id)}
              />
              <span className="grocery-view__checkmark" />
            </label>
            <span className="grocery-view__text">{item.text}</span>
            <button
              type="button"
              className={`grocery-view__star${item.isStaple ? ' is-on' : ''}`}
              onClick={() => toggleStaple(item.id)}
              title={item.isStaple ? 'Remove from staples' : 'Mark as weekly staple'}
            >
              ★
            </button>
            <button
              type="button"
              className="grocery-view__del"
              onClick={() => deleteItem(item.id)}
              title="Remove"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {boughtItems.length > 0 ? (
        <div className="grocery-view__bought-section">
          <button
            type="button"
            className="grocery-view__section-toggle"
            onClick={() => setShowBought((p) => !p)}
          >
            <span className={`grocery-view__chevron${showBought ? ' is-open' : ''}`}>›</span>
            Bought ({boughtItems.length})
          </button>
          {showBought && (
            <>
              <ul className="grocery-view__list grocery-view__list--bought">
                {boughtItems.map((item) => (
                  <li key={item.id} className="grocery-view__item grocery-view__item--bought">
                    <label className="grocery-view__check">
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => toggleBought(item.id)}
                      />
                      <span className="grocery-view__checkmark grocery-view__checkmark--done" />
                    </label>
                    <span className="grocery-view__text grocery-view__text--bought">{item.text}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="grocery-view__clear-bought"
                onClick={clearBought}
              >
                Clear bought
              </button>
            </>
          )}
        </div>
      ) : null}

      {readdableStaples.length > 0 ? (
        <div className="grocery-view__staples-section">
          <button
            type="button"
            className="grocery-view__section-toggle"
            onClick={() => setShowStaples((p) => !p)}
          >
            <span className={`grocery-view__chevron${showStaples ? ' is-open' : ''}`}>›</span>
            Weekly staples ({readdableStaples.length})
          </button>
          {showStaples && (
            <ul className="grocery-view__list grocery-view__list--staples">
              {readdableStaples.map((s) => (
                <li key={s.id} className="grocery-view__item grocery-view__item--staple">
                  <span className="grocery-view__text">{s.text}</span>
                  <button
                    type="button"
                    className="grocery-view__readd"
                    onClick={() => readdStaple(s)}
                    title="Add to list"
                  >
                    +
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

import { useState } from 'react';
import NoteItem from './NoteItem.jsx';

export default function NoteList({
  title,
  notes,
  oneThingId,
  onUpdate,
  onSetOneThing,
  onPinToday,
  onToggleDone,
  onDelete,
  onArchive,
  onRestore,
  onReorder,
  emptyMessage,
}) {
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState({ id: null, pos: null });

  const handleDragStart = (id) => setDragId(id);

  const handleDragEnd = () => {
    setDragId(null);
    setDragOver({ id: null, pos: null });
  };

  const handleDragOver = (id, pos) => {
    if (id !== dragId) {
      setDragOver({ id, pos });
    }
  };

  const handleDrop = (targetId, pos) => {
    if (dragId && dragId !== targetId && onReorder) {
      onReorder(dragId, targetId, pos);
    }
    handleDragEnd();
  };

  if (notes.length === 0) {
    return (
      <section className="recent" aria-labelledby="recent-heading">
        <div className="recent-head">
          <h2 id="recent-heading" className="recent-title">
            {title}
          </h2>
        </div>
        <p className="recent-empty">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="recent" aria-labelledby="recent-heading">
      <div className="recent-head">
        <h2 id="recent-heading" className="recent-title">
          {title}
        </h2>
      </div>
      <ul className="recent-list">
        {notes.map((n) => (
          <NoteItem
            key={n.id}
            note={n}
            oneThingId={oneThingId}
            onUpdate={onUpdate}
            onSetOneThing={onSetOneThing}
            onPinToday={onPinToday}
            onToggleDone={onToggleDone}
            onDelete={onDelete}
            onArchive={onArchive}
            onRestore={onRestore}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDragging={dragId === n.id}
            dragIndicator={
              dragOver.id === n.id && dragId !== n.id ? dragOver.pos : null
            }
          />
        ))}
      </ul>
    </section>
  );
}

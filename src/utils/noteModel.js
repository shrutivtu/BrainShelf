export const SECTIONS = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'work', label: 'Work' },
  { id: 'personal', label: 'Personal' },
  { id: 'health', label: 'Health' },
  { id: 'grocery', label: 'Grocery' },
  { id: 'people', label: 'People' },
  { id: 'random', label: 'Random' },
  { id: 'brainshelf', label: 'Brainshelf' },
  { id: 'archive', label: 'Archive' },
  { id: 'done', label: 'Done' },
];

export const COLORS = [
  { id: 'default', label: 'Default' },
  { id: 'urgent', label: 'Urgent' },
  { id: 'important', label: 'Important' },
  { id: 'idea', label: 'Idea' },
  { id: 'health', label: 'Health' },
  { id: 'grocery', label: 'Grocery' },
  { id: 'people', label: 'People' },
];

export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function createNote(partial) {
  const t = nowIso();
  return {
    id: newId(),
    text: partial.text ?? '',
    section: partial.section ?? 'inbox',
    color: partial.color ?? 'default',
    personTag: partial.personTag ?? '',
    isToday: Boolean(partial.isToday),
    isDone: Boolean(partial.isDone),
    subtasks: Array.isArray(partial.subtasks) ? partial.subtasks : [],
    comments: Array.isArray(partial.comments) ? partial.comments : [],
    createdAt: t,
    updatedAt: t,
  };
}

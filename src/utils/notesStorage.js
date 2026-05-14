import { supabase } from './supabaseClient.js';

const NOTES_KEY = 'brainshelf:notes:v1';

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `ln_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function createLongNote(partial = {}) {
  const t = nowIso();
  return {
    id: newId(),
    title: partial.title ?? '',
    content: partial.content ?? null,
    folderId: partial.folderId ?? null,
    tags: Array.isArray(partial.tags) ? partial.tags : [],
    isPinned: Boolean(partial.isPinned),
    createdAt: t,
    updatedAt: t,
  };
}

export function createFolder(name) {
  return {
    id: newId(),
    name: name || 'New Folder',
    sortOrder: 0,
    createdAt: nowIso(),
  };
}

// ── localStorage ──────────────────────────────────────────────────────

export function loadLocalNotes() {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return { longNotes: [], folders: [] };
    const parsed = JSON.parse(raw);
    return {
      longNotes: Array.isArray(parsed.longNotes) ? parsed.longNotes : [],
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
    };
  } catch {
    return { longNotes: [], folders: [] };
  }
}

export function saveLocalNotes(state) {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify({
      longNotes: state.longNotes,
      folders: state.folders,
    }));
  } catch (e) {
    console.warn('BrainShelf: could not save notes to localStorage', e);
  }
}

// ── Supabase helpers ──────────────────────────────────────────────────

function noteToRow(note, userId) {
  return {
    id: note.id,
    user_id: userId,
    title: note.title || '',
    content: note.content || {},
    folder_id: note.folderId || null,
    tags: note.tags || [],
    is_pinned: Boolean(note.isPinned),
    created_at: note.createdAt,
    updated_at: note.updatedAt,
  };
}

function rowToNote(row) {
  return {
    id: row.id,
    title: row.title || '',
    content: row.content || null,
    folderId: row.folder_id || null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    isPinned: Boolean(row.is_pinned),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function folderToRow(folder, userId) {
  return {
    id: folder.id,
    user_id: userId,
    name: folder.name,
    sort_order: folder.sortOrder ?? 0,
    created_at: folder.createdAt,
  };
}

function rowToFolder(row) {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

export async function loadCloudNotes(userId) {
  if (!supabase) return null;
  try {
    const [notesRes, foldersRes] = await Promise.all([
      supabase.from('long_notes').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
      supabase.from('note_folders').select('*').eq('user_id', userId).order('sort_order', { ascending: true }),
    ]);
    if (notesRes.error) throw notesRes.error;
    const longNotes = (notesRes.data || []).map(rowToNote);
    const folders = (foldersRes.data || []).map(rowToFolder);
    return { longNotes, folders };
  } catch (e) {
    console.warn('BrainShelf: could not load notes from Supabase', e);
    return null;
  }
}

export async function saveCloudLongNote(note, userId) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('long_notes').upsert(noteToRow(note, userId), { onConflict: 'id' });
    if (error) throw error;
  } catch (e) {
    console.warn('BrainShelf: could not save long note', e);
  }
}

export async function deleteCloudLongNote(noteId) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('long_notes').delete().eq('id', noteId);
    if (error) throw error;
  } catch (e) {
    console.warn('BrainShelf: could not delete long note', e);
  }
}

export async function saveCloudFolder(folder, userId) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('note_folders').upsert(folderToRow(folder, userId), { onConflict: 'id' });
    if (error) throw error;
  } catch (e) {
    console.warn('BrainShelf: could not save folder', e);
  }
}

export async function deleteCloudFolder(folderId) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('note_folders').delete().eq('id', folderId);
    if (error) throw error;
  } catch (e) {
    console.warn('BrainShelf: could not delete folder', e);
  }
}

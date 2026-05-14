import { SECTIONS } from './noteModel.js';
import { supabase } from './supabaseClient.js';

const STORAGE_KEY = 'brainshelf:mvp:v1';
const MIGRATED_KEY = 'brainshelf:migrated';

const SECTION_IDS = new Set(SECTIONS.map((s) => s.id));
const VALID_COLORS = new Set(['default', 'urgent', 'important', 'idea', 'health', 'people']);

export const DEFAULT_STATE = {
  notes: [],
  oneThingId: null,
  settings: {},
};

// ── Normalization (shared by both backends) ───────────────────────────

function normalizeNote(n) {
  if (!n || typeof n !== 'object') return null;
  const section = SECTION_IDS.has(n.section) && n.section !== 'done' ? n.section : 'inbox';
  const color = VALID_COLORS.has(n.color) ? n.color : 'default';
  const t = n.createdAt || n.created_at || new Date().toISOString();
  const subtasks = Array.isArray(n.subtasks)
    ? n.subtasks
        .filter((s) => s && typeof s === 'object' && s.id && typeof s.text === 'string')
        .map((s) => ({ id: String(s.id), text: s.text, isDone: Boolean(s.isDone) }))
    : [];
  const comments = Array.isArray(n.comments)
    ? n.comments
        .filter((c) => c && typeof c === 'object' && c.id && typeof c.text === 'string')
        .map((c) => ({
          id: String(c.id),
          text: c.text,
          createdAt: typeof c.createdAt === 'string' ? c.createdAt : t,
        }))
    : [];

  return {
    id: String(n.id || ''),
    text: typeof n.text === 'string' ? n.text : '',
    section,
    color,
    personTag: typeof n.personTag === 'string' ? n.personTag : (typeof n.person_tag === 'string' ? n.person_tag : ''),
    isToday: Boolean(n.isToday ?? n.is_today),
    isDone: Boolean(n.isDone ?? n.is_done),
    subtasks,
    comments,
    createdAt: typeof (n.createdAt || n.created_at) === 'string' ? (n.createdAt || n.created_at) : t,
    updatedAt: typeof (n.updatedAt || n.updated_at) === 'string' ? (n.updatedAt || n.updated_at) : t,
  };
}

// ── Conversion helpers: app ↔ DB column names ─────────────────────────

function noteToRow(note, userId, sortOrder) {
  return {
    id: note.id,
    user_id: userId,
    text: note.text,
    section: note.section,
    color: note.color,
    person_tag: note.personTag || '',
    is_today: Boolean(note.isToday),
    is_done: Boolean(note.isDone),
    subtasks: note.subtasks || [],
    comments: note.comments || [],
    sort_order: sortOrder ?? 0,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
  };
}

// ── localStorage (fallback / cache) ───────────────────────────────────

export function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    const rawNotes = Array.isArray(parsed.notes) ? parsed.notes : [];
    const notes = rawNotes.map(normalizeNote).filter((n) => n && n.id);
    const validIds = new Set(notes.map((n) => n.id));
    const oneThingId =
      parsed.oneThingId && validIds.has(String(parsed.oneThingId)) ? String(parsed.oneThingId) : null;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      notes,
      oneThingId,
      settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {},
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveLocalState(state) {
  try {
    const payload = {
      notes: state.notes,
      oneThingId: state.oneThingId,
      settings: state.settings || {},
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('BrainShelf: could not save to localStorage', e);
  }
}

// ── Supabase backend ──────────────────────────────────────────────────

export async function loadCloudState(userId) {
  if (!supabase) return null;
  try {
    const [notesRes, stateRes] = await Promise.all([
      supabase.from('notes').select('*').eq('user_id', userId).order('sort_order', { ascending: true }),
      supabase.from('app_state').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    if (notesRes.error) throw notesRes.error;

    const notes = (notesRes.data || []).map(normalizeNote).filter((n) => n && n.id);
    const appState = stateRes.data;
    const oneThingId = appState?.one_thing_id || null;
    const settings = appState?.settings || {};

    return { notes, oneThingId, settings };
  } catch (e) {
    console.warn('BrainShelf: could not load from Supabase', e);
    return null;
  }
}

export async function saveCloudNote(note, userId, sortOrder) {
  if (!supabase) return;
  try {
    const row = noteToRow(note, userId, sortOrder);
    const { error } = await supabase.from('notes').upsert(row, { onConflict: 'id' });
    if (error) throw error;
  } catch (e) {
    console.warn('BrainShelf: could not save note to Supabase', e);
  }
}

export async function deleteCloudNote(noteId) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('notes').delete().eq('id', noteId);
    if (error) throw error;
  } catch (e) {
    console.warn('BrainShelf: could not delete note from Supabase', e);
  }
}

export async function deleteCloudNotesByDone(userId) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('notes').delete().eq('user_id', userId).eq('is_done', true);
    if (error) throw error;
  } catch (e) {
    console.warn('BrainShelf: could not clear done notes from Supabase', e);
  }
}

export async function archiveCloudNotesByDone(userId) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('notes')
      .update({ section: 'archive', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_done', true)
      .neq('section', 'archive');
    if (error) throw error;
  } catch (e) {
    console.warn('BrainShelf: could not archive done notes in Supabase', e);
  }
}

export async function deleteCloudNotesByArchive(userId) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('user_id', userId)
      .eq('section', 'archive');
    if (error) throw error;
  } catch (e) {
    console.warn('BrainShelf: could not delete archived notes from Supabase', e);
  }
}

export async function saveCloudReorder(notes, userId) {
  if (!supabase) return;
  try {
    const rows = notes.map((n, i) => ({
      id: n.id,
      user_id: userId,
      sort_order: i,
    }));
    for (const row of rows) {
      await supabase.from('notes').update({ sort_order: row.sort_order }).eq('id', row.id);
    }
  } catch (e) {
    console.warn('BrainShelf: could not save reorder to Supabase', e);
  }
}

export async function saveCloudAppState(userId, oneThingId, settings) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('app_state').upsert({
      user_id: userId,
      one_thing_id: oneThingId,
      settings: settings || {},
    }, { onConflict: 'user_id' });
    if (error) throw error;
  } catch (e) {
    console.warn('BrainShelf: could not save app state to Supabase', e);
  }
}

// ── Migration: localStorage → Supabase ────────────────────────────────

export function hasLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || localStorage.getItem(MIGRATED_KEY)) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.notes) && parsed.notes.length > 0;
  } catch {
    return false;
  }
}

export function clearMigrationFlag() {
  try { localStorage.removeItem(MIGRATED_KEY); } catch {}
}

export async function migrateLocalToCloud(userId) {
  if (!supabase) return false;
  const local = loadLocalState();
  if (!local.notes.length) return false;

  try {
    const rows = local.notes.map((n, i) => noteToRow(n, userId, i));
    const { error } = await supabase.from('notes').upsert(rows, { onConflict: 'id' });
    if (error) throw error;

    await saveCloudAppState(userId, local.oneThingId, local.settings);

    localStorage.setItem(MIGRATED_KEY, 'true');
    return true;
  } catch (e) {
    console.warn('BrainShelf: migration failed', e);
    return false;
  }
}

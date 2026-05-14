-- BrainShelf Supabase Setup
-- Run this in your Supabase project's SQL Editor (supabase.com > project > SQL Editor)
--
-- If you already ran the old version, drop the tables first:
--   drop table if exists notes;
--   drop table if exists app_state;
--
-- Archive: notes with section='archive' are treated as archived.
-- No schema change needed — uses the existing section column.

-- Notes table: one row per note
create table notes (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  text       text not null default '',
  section    text not null default 'inbox',
  color      text not null default 'default',
  person_tag text not null default '',
  is_today   boolean not null default false,
  is_done    boolean not null default false,
  subtasks   jsonb not null default '[]'::jsonb,
  comments   jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_id_idx on notes(user_id);
create index notes_sort_order_idx on notes(user_id, sort_order);

-- App state: per-user settings (one thing, preferences)
create table app_state (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  one_thing_id text,
  settings     jsonb not null default '{}'::jsonb
);

-- Row Level Security: users can only access their own data
alter table notes enable row level security;
alter table app_state enable row level security;

create policy "Users manage own notes"
  on notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own app_state"
  on app_state for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────
-- Long-form Notes section
-- ──────────────────────────────────────────────────────────────────────

create table note_folders (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index note_folders_user_id_idx on note_folders(user_id);

create table long_notes (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default '',
  content    jsonb not null default '{}'::jsonb,
  folder_id  text references note_folders(id) on delete set null,
  tags       text[] not null default '{}',
  is_pinned  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index long_notes_user_id_idx on long_notes(user_id);
create index long_notes_folder_id_idx on long_notes(folder_id);

alter table note_folders enable row level security;
alter table long_notes enable row level security;

create policy "Users manage own note_folders"
  on note_folders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own long_notes"
  on long_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

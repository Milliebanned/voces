-- VOCES initial schema.
-- Every table is owned by a single learner and locked down with row-level
-- security, so a user can only ever read or write their own rows.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  native_language text,
  target_language text,
  skill_level text check (skill_level in ('beginner', 'intermediate', 'advanced')),
  goals text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles
  for select using ((select auth.uid()) = id);

create policy "insert own profile" on public.profiles
  for insert with check ((select auth.uid()) = id);

create policy "update own profile" on public.profiles
  for update using ((select auth.uid()) = id);

-- A profile row is created automatically the moment someone signs up, so the
-- rest of the app can assume it exists.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- vocabulary_items
-- ---------------------------------------------------------------------------

create table public.vocabulary_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_language text not null,
  text text not null,
  translation text,
  item_type text not null default 'word'
    check (item_type in ('word', 'phrase', 'idiom', 'sentence')),
  source text not null default 'manual'
    check (source in ('manual', 'session')),

  -- Reinforcement signals. confidence_score is derived from these in
  -- application code after each session analysis.
  review_count integer not null default 0,
  usage_count integer not null default 0,
  success_count integer not null default 0,
  struggle_count integer not null default 0,
  confidence_score real not null default 0,

  last_used_at timestamptz,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index vocabulary_items_user_language_idx
  on public.vocabulary_items (user_id, target_language);

-- Supports "weakest first" reinforcement lookups.
create index vocabulary_items_confidence_idx
  on public.vocabulary_items (user_id, target_language, confidence_score);

alter table public.vocabulary_items enable row level security;

create policy "read own vocabulary" on public.vocabulary_items
  for select using ((select auth.uid()) = user_id);

create policy "insert own vocabulary" on public.vocabulary_items
  for insert with check ((select auth.uid()) = user_id);

create policy "update own vocabulary" on public.vocabulary_items
  for update using ((select auth.uid()) = user_id);

create policy "delete own vocabulary" on public.vocabulary_items
  for delete using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_language text not null,
  mode text not null default 'ai_led'
    check (mode in ('user_led', 'ai_led', 'scenario')),
  scenario text,
  status text not null default 'active'
    check (status in ('active', 'ended', 'analyzed')),

  -- Ordered array of { role: 'user' | 'agent', text: string, at: string }.
  transcript jsonb not null default '[]'::jsonb,

  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index sessions_user_started_idx
  on public.sessions (user_id, started_at desc);

alter table public.sessions enable row level security;

create policy "read own sessions" on public.sessions
  for select using ((select auth.uid()) = user_id);

create policy "insert own sessions" on public.sessions
  for insert with check ((select auth.uid()) = user_id);

create policy "update own sessions" on public.sessions
  for update using ((select auth.uid()) = user_id);

create policy "delete own sessions" on public.sessions
  for delete using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- session_analysis
-- ---------------------------------------------------------------------------

create table public.session_analysis (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions (id) on delete cascade,

  grammar_notes jsonb not null default '[]'::jsonb,
  vocab_used jsonb not null default '[]'::jsonb,
  vocab_forgotten jsonb not null default '[]'::jsonb,
  vocab_suggested jsonb not null default '[]'::jsonb,
  fluency_notes jsonb not null default '[]'::jsonb,

  summary_text text,
  strengths text,
  weaknesses text,
  next_steps text,

  created_at timestamptz not null default now()
);

alter table public.session_analysis enable row level security;

-- Ownership is inherited from the parent session.
create policy "read own analysis" on public.session_analysis
  for select using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  );

create policy "insert own analysis" on public.session_analysis
  for insert with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- learner_memory
-- ---------------------------------------------------------------------------

-- A rolling per-language summary of the learner, refreshed after each session
-- and folded into the system prompt of the next conversation.
create table public.learner_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_language text not null,

  grammar_patterns jsonb not null default '[]'::jsonb,
  topics_discussed jsonb not null default '[]'::jsonb,
  interests jsonb not null default '[]'::jsonb,

  updated_at timestamptz not null default now(),

  unique (user_id, target_language)
);

alter table public.learner_memory enable row level security;

create policy "read own memory" on public.learner_memory
  for select using ((select auth.uid()) = user_id);

create policy "insert own memory" on public.learner_memory
  for insert with check ((select auth.uid()) = user_id);

create policy "update own memory" on public.learner_memory
  for update using ((select auth.uid()) = user_id);

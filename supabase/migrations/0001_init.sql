-- NerdyBirdy initial schema.
-- Paste into the Supabase SQL Editor and run once on a fresh project.
-- Assumes: pgvector enabled in the `extensions` schema, "automatically expose
-- new tables" OFF (so grants below are explicit), anonymous sign-ins on.

create extension if not exists vector with schema extensions;

-- =====================================================================
-- Tables
-- =====================================================================

create table public.courses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 120),
  exam_date     date,
  page_count    int  not null default 0 check (page_count between 0 and 150),
  flagged_pages int[] not null default '{}',
  created_at    timestamptz not null default now()
);

create table public.pages (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  page_number int  not null check (page_number >= 1),
  text        text not null,
  unique (course_id, page_number)
);

create table public.chunks (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  page_number int  not null check (page_number >= 1),
  content     text not null,
  embedding   extensions.vector(1536) not null
);

create table public.topics (
  id                uuid primary key default gen_random_uuid(),
  course_id         uuid not null references public.courses (id) on delete cascade,
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name              text not null,
  summary           text not null default '',
  page_start        int  not null check (page_start >= 1),
  page_end          int  not null check (page_end >= page_start),
  mastery_level     int  not null default 0 check (mastery_level between 0 and 4),
  level_progress    int  not null default 0 check (level_progress >= 0),
  danger_zone       boolean not null default false,
  last_practiced_at timestamptz
);

create table public.questions (
  id             uuid primary key default gen_random_uuid(),
  course_id      uuid not null references public.courses (id) on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic_id       uuid not null references public.topics (id) on delete cascade,
  format         text not null,
  level          int  not null check (level between 1 and 4),
  public_payload jsonb not null,           -- only what the browser may see
  source_pages   int[] not null default '{}',
  verified       boolean not null default false,
  created_at     timestamptz not null default now()
);

-- SERVER-ONLY: answer keys. No grants to anon/authenticated, no policies.
create table public.question_keys (
  question_id     uuid primary key references public.questions (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  private_payload jsonb not null
);

create table public.attempts (
  id                uuid primary key default gen_random_uuid(),
  question_id       uuid not null references public.questions (id) on delete cascade,
  course_id         uuid not null references public.courses (id) on delete cascade,
  topic_id          uuid not null references public.topics (id) on delete cascade,
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  answer            text not null,
  confidence        text not null check (confidence in ('guessing', 'fairly_sure', 'very_sure')),
  hint_used         boolean not null default false,
  verdict           text not null check (verdict in ('correct', 'partial', 'incorrect')),
  score             numeric not null check (score between 0 and 1),
  key_point_results jsonb,
  mistake_type      text,
  feedback          jsonb,
  created_at        timestamptz not null default now()
);

-- detail must never contain note or answer text.
create table public.safety_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id  uuid references public.courses (id) on delete cascade,
  type       text not null,
  detail     jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- SERVER-ONLY: daily LLM call counters.
create table public.usage (
  key   text not null,
  day   date not null,
  count int  not null default 0,
  primary key (key, day)
);

-- =====================================================================
-- Indexes
-- =====================================================================

create index courses_user_id_idx        on public.courses (user_id);
create index courses_created_at_idx     on public.courses (created_at);
create index pages_course_id_idx        on public.pages (course_id);
create index chunks_course_id_idx       on public.chunks (course_id);
create index topics_course_id_idx       on public.topics (course_id);
create index questions_course_id_idx    on public.questions (course_id);
create index questions_topic_id_idx     on public.questions (topic_id);
create index attempts_course_id_idx     on public.attempts (course_id);
create index attempts_topic_id_idx      on public.attempts (topic_id);
create index attempts_question_id_idx   on public.attempts (question_id);
create index safety_events_course_id_idx on public.safety_events (course_id);
create index safety_events_user_id_idx  on public.safety_events (user_id);
-- No HNSW index on purpose: see docs/DECISIONS.md (exact search per course).

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.courses       enable row level security;
alter table public.pages         enable row level security;
alter table public.chunks        enable row level security;
alter table public.topics        enable row level security;
alter table public.questions     enable row level security;
alter table public.question_keys enable row level security;
alter table public.attempts      enable row level security;
alter table public.safety_events enable row level security;
alter table public.usage         enable row level security;

-- courses
create policy "courses_select_own" on public.courses
  for select to authenticated using (user_id = (select auth.uid()));
create policy "courses_insert_own" on public.courses
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "courses_update_own" on public.courses
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "courses_delete_own" on public.courses
  for delete to authenticated using (user_id = (select auth.uid()));

-- Child tables: own rows only, and inserts/updates must point at a course
-- the user owns.
do $$
declare t text;
begin
  foreach t in array array['pages', 'chunks', 'topics', 'questions', 'attempts'] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (
         user_id = (select auth.uid())
         and exists (select 1 from public.courses c where c.id = course_id and c.user_id = (select auth.uid())))',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (user_id = (select auth.uid()))
         with check (
           user_id = (select auth.uid())
           and exists (select 1 from public.courses c where c.id = course_id and c.user_id = (select auth.uid())))',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))',
      t || '_delete_own', t);
  end loop;
end $$;

-- safety_events: select and insert own rows only.
create policy "safety_events_select_own" on public.safety_events
  for select to authenticated using (user_id = (select auth.uid()));
create policy "safety_events_insert_own" on public.safety_events
  for insert to authenticated with check (user_id = (select auth.uid()));

-- question_keys and usage: RLS on, no policies (service_role only).

-- =====================================================================
-- Grants (auto-expose is off, so everything is explicit)
-- =====================================================================

revoke all on table
  public.courses, public.pages, public.chunks, public.topics, public.questions,
  public.question_keys, public.attempts, public.safety_events, public.usage
from anon, authenticated;

grant select, insert, update, delete on table
  public.courses, public.pages, public.chunks, public.topics, public.questions, public.attempts
to authenticated;

grant select, insert on table public.safety_events to authenticated;

grant all on table
  public.courses, public.pages, public.chunks, public.topics, public.questions,
  public.question_keys, public.attempts, public.safety_events, public.usage
to service_role;

-- =====================================================================
-- Functions
-- =====================================================================

-- Vector search within one course. security invoker, so RLS applies.
create or replace function public.match_chunks(
  p_course_id uuid,
  p_query     extensions.vector(1536),
  p_count     int default 6
)
returns table (chunk_id uuid, page_number int, content text, similarity float8)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select c.id, c.page_number, c.content, 1 - (c.embedding <=> p_query) as similarity
  from public.chunks c
  where c.course_id = p_course_id
  order by c.embedding <=> p_query
  limit least(greatest(p_count, 1), 20);
$$;

revoke execute on function public.match_chunks(uuid, extensions.vector, int) from public, anon;
grant execute on function public.match_chunks(uuid, extensions.vector, int) to authenticated, service_role;

-- Atomically bump today's (Asia/Singapore) counter for a key.
-- Returns false once the count goes over p_limit.
create or replace function public.bump_usage(p_key text, p_limit int)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.usage as u (key, day, count)
  values (p_key, (now() at time zone 'Asia/Singapore')::date, 1)
  on conflict (key, day) do update set count = u.count + 1
  returning u.count into v_count;
  return v_count <= p_limit;
end;
$$;

revoke execute on function public.bump_usage(text, int) from public, anon, authenticated;
grant execute on function public.bump_usage(text, int) to service_role;

-- =====================================================================
-- Reset (uncomment and run to drop everything, then re-run this file)
-- =====================================================================
-- drop function if exists public.bump_usage(text, int);
-- drop function if exists public.match_chunks(uuid, extensions.vector, int);
-- drop table if exists public.usage cascade;
-- drop table if exists public.safety_events cascade;
-- drop table if exists public.attempts cascade;
-- drop table if exists public.question_keys cascade;
-- drop table if exists public.questions cascade;
-- drop table if exists public.topics cascade;
-- drop table if exists public.chunks cascade;
-- drop table if exists public.pages cascade;
-- drop table if exists public.courses cascade;

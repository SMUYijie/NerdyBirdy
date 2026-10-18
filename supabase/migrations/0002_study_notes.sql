-- NerdyBirdy: cache AI study notes per topic.
-- Paste into the Supabase SQL Editor and run once (safe to re-run).
-- Existing table grants and RLS policies on topics already cover this column.
alter table public.topics add column if not exists study_notes jsonb;

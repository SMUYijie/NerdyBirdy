# Decisions

One line per decision or deviation from docs/SPEC.md.

## Phase 0
- Folder structure: empty folders hold a `.gitkeep`; route and page files are created in the phase that implements them, so the build never contains half-written routes.
- DB: every `user_id` also references `auth.users(id) on delete cascade`, so deleting a (test or anonymous) user removes all their data.
- DB: insert/update policies on pages, chunks, topics, questions and attempts also require that `course_id` belongs to the user (defence in depth).
- DB: added CHECK constraints for confidence, verdict, score, level and mastery ranges; `questions.format` and `safety_events.type` have no CHECK so Phase 5 can add formats/types without a migration.
- DB: `question_keys.user_id` has no `default auth.uid()` because only the admin client writes it (auth.uid() would be null); the server sets it explicitly.
- DB: no HNSW index on `chunks.embedding`. An approximate index applies the `course_id` filter after the nearest-neighbour search and can return too few rows; at ≤150 pages per course an exact scan via `chunks_course_id_idx` is fast and correct.
- DB: `match_chunks` caps `p_count` at 20.
- LLM: one retry on 429/5xx with backoff is done by the OpenAI SDK (`maxRetries: 1`, `timeout: 45s`).
- LLM: `callJSON` tries json_schema (+ low reasoning when asked) → json_schema → json_object, moving on only when OpenRouter rejects the parameters (400/404). A data-policy rejection is never bypassed; it surfaces as `LLMError("no_provider")`. The working variant is cached per model.
- LLM: the HTTP-Referer header uses Vercel's `VERCEL_PROJECT_PRODUCTION_URL` (falls back to http://localhost:3000), so no extra env var is needed.
- LLM: schemas use `.nullable()` rather than `.optional()` so they work with strict json_schema.
- Scripts: `tsx` runs with `--conditions=react-server` so files that `import "server-only"` can be reused by scripts/evals, and with `--env-file=.env.local`.
- .env.example has empty values only (the MODEL_EMBED example moved into a comment).

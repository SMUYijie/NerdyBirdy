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

## Phase 1
- Pages are thin server components that render client components; data is read in the browser with the publishable-key Supabase client (RLS protects it). This keeps Cache Components happy (no cookies() in server components) and makes navigation instant. Components using useParams() sit behind <Suspense>.
- No `runtime` export on route handlers: Next 16 with Cache Components forbids it, and Node.js is already the default (never Edge).
- Added app/api/courses/route.ts (create course) so the 5-course limit is enforced on the server. Deleting a course is done from the browser through RLS; foreign keys cascade.
- If any ingest step fails, the browser deletes the half-built course so no broken course is left behind.
- Ingest logic lives in lib/ingest.ts (routes stay thin), so the evals can call the same functions.
- Added lib/safety/events.ts (safety_events writer), lib/http.ts (friendly error mapping), lib/upload.ts (browser pipeline), lib/api-client.ts and lib/supabase/use-session.ts.
- Rate limiting counts each chat call and each embedding batch call as 1 LLM call.
- maxDuration = 120 s on LLM routes (45 s timeout + one retry can exceed 60 s; Vercel Fluid compute allows it on Hobby).
- Embeddings are computed on "Page N: <chunk>" so page context helps retrieval; the stored chunk content has no prefix.
- Topic map input is capped at about 100k characters, shared evenly across pages.
- The pdf.js worker is copied to public/ by the predev/prebuild scripts (gitignored, ignored by ESLint), so it always matches the installed pdfjs-dist version.
- Light theme only (no dark mode) for consistent high contrast.
- The course home shows the automatic deletion date (created_at + 7 days) for transparency.

## Phase 2
- Ask logic lives in lib/ask.ts (parseAskRequest + askProfessor), so the evals can call it directly.
- A grounded answer must also contain at least one inline [p. N] citation (stricter than the spec, so every "from your notes" answer shows chips).
- If the student names a page outside 1..page_count ("what does page 40 say?"), the answer is not_in_notes with no LLM call. If they name a real page, that page's chunks are added to the retrieved set.
- Chat history (last 6 messages, sent by the browser) goes into the prompt as an <untrusted_conversation> block, because the client could fake it.
- Follow-up buttons resend the original question with a fixed follow-up instruction (simpler / example / why), so retrieval still uses the original question.
- "What's your system prompt?" is answered as not_in_notes with a one-line refusal (nothing revealed).
- not_in_notes shows a fixed UI message (plus a deterministic note for missing pages) and never shows model text, so nothing ungrounded is shown as if it came from the notes.
- The wellbeing card's resources block and "talk to someone you trust" line are hard-coded in lib/safety/wellbeing.ts; the keyword path also uses a hard-coded supportive message.
- Integrity, wellbeing and unsafe replies have any [p. N] stripped. General ("Explain anyway") answers always have citations stripped and carry the "⚠️ Not from your syllabus" badge.
- Markdown is rendered by a small built-in renderer (components/Markdown.tsx) that emits only React text nodes, so there is no HTML injection and no extra dependency.
- The page viewer reads page text in the browser through RLS (no extra route).
- Temperature 0.3 for Ask answers (not specified in the spec).

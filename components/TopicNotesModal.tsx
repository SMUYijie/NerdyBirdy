"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageModal } from "@/components/PageModal";
import { LoadingCard } from "@/components/Spinner";
import type { StudyNotes } from "@/lib/ai/schemas";
import { postJSON } from "@/lib/api-client";
import { levelLabel, pageRange } from "@/lib/mastery";

type TopicInfo = { id: string; name: string; page_start: number; page_end: number; mastery_level: number };

function PageChip({ page, onOpen }: { page: number; onOpen: (p: number) => void }) {
  return (
    <button
      onClick={() => onOpen(page)}
      className="ml-1 inline-flex rounded-full bg-indigo-100 px-1.5 py-0.5 align-baseline text-[0.7rem] font-semibold text-indigo-800 hover:bg-indigo-200"
      aria-label={`Open page ${page}`}
    >
      p. {page}
    </button>
  );
}

export function TopicNotesModal({
  courseId,
  topic,
  onClose,
}: {
  courseId: string;
  topic: TopicInfo;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState<StudyNotes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [openPage, setOpenPage] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    postJSON<StudyNotes>("/api/topic-notes", { topicId: topic.id }).then(
      (n) => active && setNotes(n),
      (e) => active && setError(e instanceof Error ? e.message : "Something went wrong."),
    );
    return () => {
      active = false;
    };
  }, [topic.id, attempt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && openPage === null && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, openPage]);

  const base = `/course/${courseId}`;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notes-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">📘 Study notes</p>
            <h2 id="notes-title" className="text-lg font-bold text-slate-900">
              {topic.name}
            </h2>
            <p className="text-xs text-slate-500">
              {pageRange(topic.page_start, topic.page_end)} · {levelLabel(topic.mastery_level)}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-4 py-4 text-sm text-slate-800">
          {error ? (
            <div role="alert" className="space-y-2 rounded-xl bg-red-50 p-3 text-red-800">
              <p>{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setAttempt((n) => n + 1);
                }}
                className="rounded-lg bg-red-700 px-3 py-1.5 font-semibold text-white hover:bg-red-800"
              >
                Try again
              </button>
            </div>
          ) : !notes ? (
            <LoadingCard
              messages={[
                `Reading ${pageRange(topic.page_start, topic.page_end)}…`,
                "Turning the slides into tidy notes…",
                "Adding page numbers so you can check everything…",
              ]}
              sub="First time only — after this the notes open instantly."
            />
          ) : (
            <>
              {notes.overview && (
                <p className="rounded-xl bg-indigo-50 px-3 py-2 text-[0.95rem] leading-relaxed text-indigo-950">
                  {notes.overview}
                </p>
              )}

              {notes.sections.map((s, i) => (
                <section key={i}>
                  <h3 className="mb-1.5 text-base font-semibold text-slate-900">{s.heading}</h3>
                  <ul className="list-disc space-y-1.5 pl-5 leading-relaxed">
                    {s.points.map((pt, j) => (
                      <li key={j}>
                        {pt.text}
                        {pt.pages.map((p) => (
                          <PageChip key={p} page={p} onOpen={setOpenPage} />
                        ))}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              {notes.key_terms.length > 0 && (
                <section>
                  <h3 className="mb-1.5 text-base font-semibold text-slate-900">🔑 Key terms</h3>
                  <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {notes.key_terms.map((k, i) => (
                      <div key={i} className="grid gap-1 px-3 py-2 sm:grid-cols-[10rem_1fr]">
                        <dt className="font-semibold text-slate-900">{k.term}</dt>
                        <dd>
                          {k.meaning}
                          <PageChip page={k.page} onOpen={setOpenPage} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {notes.watch_out.length > 0 && (
                <section className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <h3 className="mb-1 font-semibold text-amber-950">⚠️ Watch out for</h3>
                  <ul className="list-disc space-y-1 pl-5 text-amber-950">
                    {notes.watch_out.map((w, i) => (
                      <li key={i}>
                        {w.text}
                        <PageChip page={w.page} onOpen={setOpenPage} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <p className="text-xs text-slate-500">
                Written by AI from your notes. Tap a page number to check the original.
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-slate-200 px-4 py-3 text-sm">
          <button
            onClick={() => setOpenPage(topic.page_start)}
            className="rounded-lg border border-slate-300 px-2 py-2 font-semibold text-slate-800 hover:bg-slate-50"
          >
            📄 Original
          </button>
          <Link
            href={`${base}/ask`}
            className="rounded-lg border border-indigo-300 bg-indigo-50 px-2 py-2 text-center font-semibold text-indigo-800 hover:bg-indigo-100"
          >
            💬 Ask
          </Link>
          <Link
            href={`${base}/quiz?topic=${topic.id}`}
            className="rounded-lg bg-emerald-700 px-2 py-2 text-center font-semibold text-white hover:bg-emerald-800"
          >
            🎯 Quiz me
          </Link>
        </div>
      </div>

      {openPage !== null && (
        // Stop clicks inside the page viewer from also closing the notes.
        <div onClick={(e) => e.stopPropagation()}>
          <PageModal
            courseId={courseId}
            page={openPage}
            range={[topic.page_start, topic.page_end]}
            onClose={() => setOpenPage(null)}
          />
        </div>
      )}
    </div>
  );
}

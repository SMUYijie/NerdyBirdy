"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageModal } from "@/components/PageModal";
import { TopicMastery, type TopicRow } from "@/components/TopicMastery";
import { levelLabel, orderTopicsForReview, pageRange } from "@/lib/mastery";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/supabase/use-session";

type Topic = TopicRow & { level_progress: number; last_practiced_at: string | null };
type Attempt = { topic_id: string; verdict: "correct" | "partial" | "incorrect"; confidence: string; created_at: string };

type Load =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error" }
  | { kind: "ok"; name: string; topics: Topic[]; attempts: Attempt[] };

const SESSION = 5;

export function ProgressClient() {
  const { id: courseId } = useParams<{ id: string }>();
  const session = useSession();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [openRange, setOpenRange] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (session !== "ready") return;
    const supabase = createClient();
    Promise.all([
      supabase.from("courses").select("name").eq("id", courseId).maybeSingle(),
      supabase
        .from("topics")
        .select("id, name, summary, page_start, page_end, mastery_level, level_progress, danger_zone, last_practiced_at")
        .eq("course_id", courseId)
        .order("page_start"),
      supabase
        .from("attempts")
        .select("topic_id, verdict, confidence, created_at")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false })
        .limit(200),
    ]).then(([c, t, a]) => {
      if (c.error || t.error || a.error) setLoad({ kind: "error" });
      else if (!c.data) setLoad({ kind: "missing" });
      else
        setLoad({
          kind: "ok",
          name: c.data.name as string,
          topics: (t.data ?? []) as Topic[],
          attempts: (a.data ?? []) as Attempt[],
        });
    });
  }, [session, courseId]);

  if (session === "error" || load.kind === "error") {
    return (
      <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
        We couldn&apos;t load your progress. Please refresh the page.
      </p>
    );
  }
  if (load.kind === "loading") return <p className="text-slate-500">🦉 Loading your progress…</p>;
  if (load.kind === "missing") {
    return (
      <p className="text-slate-700">
        We couldn&apos;t find this course.{" "}
        <Link href="/" className="font-medium text-indigo-700 underline">
          Back to home
        </Link>
      </p>
    );
  }

  const { topics, attempts, name } = load;
  const base = `/course/${courseId}`;
  const byId = new Map(topics.map((t) => [t.id, t]));
  const correct = attempts.filter((a) => a.verdict === "correct").length;
  const overconfident = attempts.filter((a) => a.confidence === "very_sure" && a.verdict === "incorrect").length;
  const started = topics.filter((t) => t.mastery_level > 0 || t.last_practiced_at).length;
  const reviewNext = orderTopicsForReview(topics.filter((t) => t.mastery_level < 4 || t.danger_zone)).slice(0, 3);

  // Last session = the most recent answers (up to 5).
  const recent = attempts.slice(0, SESSION);
  const recentCorrect = recent.filter((a) => a.verdict === "correct").length;
  const missScore = new Map<string, number>();
  for (const a of recent) {
    if (a.verdict === "correct") continue;
    missScore.set(a.topic_id, (missScore.get(a.topic_id) ?? 0) + (a.verdict === "incorrect" ? 2 : 1));
  }
  const focusId = [...missScore.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
  const focus = focusId ? byId.get(focusId) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <Link href={base} className="text-sm text-indigo-700 hover:underline">
          ← {name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">📈 Progress</h1>
      </div>

      {attempts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-slate-700">
          <p className="text-3xl" aria-hidden>
            🦉
          </p>
          <p className="mt-1">No quiz answers yet. Take a quick round and your progress will show up here.</p>
          <Link
            href={`${base}/quiz`}
            className="mt-3 inline-block rounded-xl bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800"
          >
            🎯 Start a quiz
          </Link>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-900">
            <h2 className="font-semibold">Last session</h2>
            <p className="mt-1">
              You answered {recentCorrect}/{recent.length}.{" "}
              {focus ? (
                <>
                  Focus on {focus.name}{" "}
                  <button
                    onClick={() => setOpenRange([focus.page_start, focus.page_end])}
                    className="font-semibold text-indigo-800 underline"
                  >
                    ({pageRange(focus.page_start, focus.page_end)})
                  </button>
                  .
                </>
              ) : (
                "Every answer was correct — great work! 🎉"
              )}
            </p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg bg-slate-50 px-2 py-2">
                <dt className="text-xs text-slate-500">Answered</dt>
                <dd className="text-lg font-bold">{attempts.length}</dd>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-2">
                <dt className="text-xs text-slate-500">Correct</dt>
                <dd className="text-lg font-bold">{Math.round((correct / attempts.length) * 100)}%</dd>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-2">
                <dt className="text-xs text-slate-500">Topics started</dt>
                <dd className="text-lg font-bold">
                  {started}/{topics.length}
                </dd>
              </div>
            </dl>
            {overconfident > 0 && (
              <p className="mt-3 text-sm text-amber-900">
                ⚠️ You were &quot;very sure&quot; but wrong {overconfident} time{overconfident === 1 ? "" : "s"}. Those
                topics are marked as danger zones below.
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">📌 Review next</h2>
            {reviewNext.length === 0 ? (
              <p className="text-sm text-slate-700">You&apos;ve reached the top level on every topic. Amazing! 🏆</p>
            ) : (
              <ol className="space-y-2">
                {reviewNext.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                    <span className="font-medium text-slate-900">
                      {t.danger_zone ? "⚠️ " : ""}
                      {t.name}
                      <span className="ml-2 text-xs font-normal text-slate-500">{levelLabel(t.mastery_level)}</span>
                    </span>
                    <button
                      onClick={() => setOpenRange([t.page_start, t.page_end])}
                      className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-200"
                    >
                      📄 Re-read {pageRange(t.page_start, t.page_end)}
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <Link
              href={`${base}/quiz?topic=weak`}
              className="mt-3 inline-block rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              🩹 Quiz my weak spots
            </Link>
          </section>
        </>
      )}

      <section>
        <h2 className="mb-2 font-semibold text-slate-900">🗺️ All topics</h2>
        <TopicMastery topics={topics} showProgress onOpenRange={(t) => setOpenRange([t.page_start, t.page_end])} />
      </section>

      {openRange && (
        <PageModal courseId={courseId} page={openRange[0]} range={openRange} onClose={() => setOpenRange(null)} />
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { InjectionBanner } from "@/components/SafetyCards";
import { TopicMastery, type TopicRow } from "@/components/TopicMastery";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/supabase/use-session";

type Course = {
  id: string;
  name: string;
  exam_date: string | null;
  page_count: number;
  flagged_pages: number[];
  created_at: string;
};

type Load =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error" }
  | { kind: "ok"; course: Course; topics: TopicRow[] };

function examCountdown(examDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(`${examDate}T00:00:00`);
  const days = Math.round((exam.getTime() - today.getTime()) / 86_400_000);
  if (days > 1) return `📅 Exam in ${days} days`;
  if (days === 1) return "📅 Exam tomorrow — you've got this!";
  if (days === 0) return "📅 Exam today — good luck!";
  return "📅 Exam date has passed";
}

function deletionDate(createdAt: string): string {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function CourseHome() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  useEffect(() => {
    if (session !== "ready") return;
    const supabase = createClient();
    Promise.all([
      supabase
        .from("courses")
        .select("id, name, exam_date, page_count, flagged_pages, created_at")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("topics")
        .select("id, name, summary, page_start, page_end, mastery_level, danger_zone")
        .eq("course_id", id)
        .order("page_start"),
    ]).then(([c, t]) => {
      if (c.error || t.error) setLoad({ kind: "error" });
      else if (!c.data) setLoad({ kind: "missing" });
      else setLoad({ kind: "ok", course: c.data as Course, topics: (t.data ?? []) as TopicRow[] });
    });
  }, [session, id]);

  async function onDelete() {
    setDeleting(true);
    setDeleteError(false);
    const { error } = await createClient().from("courses").delete().eq("id", id);
    if (error) {
      setDeleting(false);
      setDeleteError(true);
      return;
    }
    router.push("/");
  }

  if (session === "error" || load.kind === "error") {
    return (
      <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
        We couldn&apos;t load this course. Please refresh the page.
      </p>
    );
  }
  if (load.kind === "loading") return <p className="text-slate-500">🦉 Loading your course…</p>;
  if (load.kind === "missing") {
    return (
      <div className="space-y-3 text-center">
        <p className="text-slate-700">
          We couldn&apos;t find this course. It may have been deleted, or it belongs to another
          browser session.
        </p>
        <Link href="/" className="font-medium text-indigo-700 underline">
          Back to home
        </Link>
      </div>
    );
  }

  const { course, topics } = load;
  const base = `/course/${course.id}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-indigo-700 hover:underline">
          ← All courses
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{course.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {course.page_count} pages
          {course.exam_date ? ` · ${examCountdown(course.exam_date)}` : ""}
        </p>
      </div>

      <InjectionBanner pages={course.flagged_pages ?? []} />

      <nav className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Link
          href={`${base}/ask`}
          className="rounded-xl bg-indigo-700 px-4 py-3 text-center font-semibold text-white hover:bg-indigo-800"
        >
          💬 Ask the Professor
        </Link>
        <Link
          href={`${base}/quiz`}
          className="rounded-xl bg-emerald-700 px-4 py-3 text-center font-semibold text-white hover:bg-emerald-800"
        >
          🎯 Quiz Mode
        </Link>
        <Link
          href={`${base}/progress`}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-semibold text-slate-900 hover:bg-slate-50"
        >
          📈 Progress
        </Link>
      </nav>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">🗺️ Topic map</h2>
        {topics.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            This course didn&apos;t finish setting up, so there are no topics yet. Delete it below
            and upload your notes again.
          </p>
        ) : (
          <TopicMastery topics={topics} />
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <p className="text-slate-600">
          🔒 These notes will be deleted automatically on {deletionDate(course.created_at)}.
        </p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="mt-2 font-medium text-red-700 hover:underline"
          >
            🗑️ Delete this course
          </button>
        ) : (
          <div className="mt-2 space-y-2">
            <p className="font-medium text-slate-900">
              Delete “{course.name}” and everything in it? This can&apos;t be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onDelete}
                disabled={deleting}
                className="rounded-lg bg-red-700 px-3 py-1.5 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, delete it"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
            {deleteError && (
              <p role="alert" className="text-red-800">
                We couldn&apos;t delete the course. Please try again.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

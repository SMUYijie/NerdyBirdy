"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FeedbackCard } from "@/components/FeedbackCard";
import { PageModal } from "@/components/PageModal";
import { QuestionCard, type AnswerDraft } from "@/components/QuestionCard";
import { InjectionBanner, WellbeingCard } from "@/components/SafetyCards";
import type { QuizFormat } from "@/lib/ai/schemas";
import { postJSON } from "@/lib/api-client";
import { levelLabel, pageRange } from "@/lib/mastery";
import { FORMAT_ORDER, FORMATS } from "@/lib/quiz/formats";
import type { GradedResult, GradeResponse, PublicQuestion } from "@/lib/quiz/types";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/supabase/use-session";

const SESSION_LENGTH = 5;

type Topic = { id: string; name: string; page_start: number; page_end: number; mastery_level: number; danger_zone: boolean };
type TopicChoice = "mix" | "weak" | string;
type FormatChoice = QuizFormat | "surprise";

type Phase =
  | { kind: "setup" }
  | { kind: "loading" }
  | { kind: "question"; q: PublicQuestion }
  | { kind: "grading"; q: PublicQuestion }
  | { kind: "feedback"; q: PublicQuestion; result: GradedResult }
  | { kind: "wellbeing"; q: PublicQuestion; message: string }
  | { kind: "summary" }
  | { kind: "error"; message: string; retry: "next" | "grade"; q?: PublicQuestion };

type Answered = { topic: PublicQuestion["topic"]; verdict: GradedResult["verdict"] };

const emptyDraft: AnswerDraft = { option: null, text: "", confidence: null, hintShown: false };

export function QuizClient() {
  const { id: courseId } = useParams<{ id: string }>();
  const search = useSearchParams();
  const session = useSession();
  const [course, setCourse] = useState<{ name: string; flagged_pages: number[] } | null | "missing" | "error">(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicChoice, setTopicChoice] = useState<TopicChoice>(search.get("topic") === "weak" ? "weak" : "mix");
  const [formatChoice, setFormatChoice] = useState<FormatChoice>("surprise");
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const [draft, setDraft] = useState<AnswerDraft>(emptyDraft);
  const [answered, setAnswered] = useState<Answered[]>([]);
  const [openPage, setOpenPage] = useState<{ page: number; range?: [number, number] } | null>(null);
  const prefetch = useRef<Promise<PublicQuestion | null> | null>(null);
  const lastResult = useRef<GradedResult | null>(null);

  useEffect(() => {
    if (session !== "ready") return;
    const supabase = createClient();
    Promise.all([
      supabase.from("courses").select("name, flagged_pages").eq("id", courseId).maybeSingle(),
      supabase
        .from("topics")
        .select("id, name, page_start, page_end, mastery_level, danger_zone")
        .eq("course_id", courseId)
        .order("page_start"),
    ]).then(([c, t]) => {
      if (c.error || t.error) setCourse("error");
      else if (!c.data) setCourse("missing");
      else {
        setCourse(c.data as { name: string; flagged_pages: number[] });
        setTopics((t.data ?? []) as Topic[]);
      }
    });
  }, [session, courseId]);

  function requestNext(avoidTopicIds: string[]): Promise<PublicQuestion> {
    return postJSON<PublicQuestion>("/api/quiz/next", {
      courseId,
      topic: topicChoice,
      format: formatChoice,
      avoidTopicIds,
    });
  }

  // Pre-generate the next question while the student answers this one.
  function startPrefetch(current: PublicQuestion) {
    const avoid = topicChoice === "mix" || topicChoice === "weak" ? [current.topic.id] : [];
    prefetch.current = requestNext(avoid).catch(() => null);
  }

  async function loadQuestion(usePrefetch: boolean) {
    setPhase({ kind: "loading" });
    setDraft(emptyDraft);
    try {
      let q: PublicQuestion | null = null;
      if (usePrefetch && prefetch.current) {
        q = await prefetch.current;
        const last = lastResult.current;
        // A miss or level-up on the same topic makes the prefetched question
        // stale (comeback questions must target the missed points).
        if (q && last && q.topic.id === last.mastery.topic_id && (last.hits < last.total || last.mastery.leveled_up)) {
          q = null;
        }
      }
      prefetch.current = null;
      if (!q) q = await requestNext(answered.slice(-1).map((a) => a.topic.id));
      setPhase({ kind: "question", q });
      startPrefetch(q);
    } catch (err) {
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
        retry: "next",
      });
    }
  }

  async function submit(q: PublicQuestion) {
    if (!draft.confidence) return;
    setPhase({ kind: "grading", q });
    try {
      const res = await postJSON<GradeResponse>("/api/quiz/grade", {
        questionId: q.questionId,
        answer: q.format === "mcq" ? String(draft.option) : draft.text,
        confidence: draft.confidence,
        hintUsed: draft.hintShown,
      });
      if (res.kind === "wellbeing") {
        setPhase({ kind: "wellbeing", q, message: res.message });
        return;
      }
      lastResult.current = res;
      setAnswered((a) => [...a, { topic: q.topic, verdict: res.verdict }]);
      setTopics((ts) =>
        ts.map((t) =>
          t.id === res.mastery.topic_id ? { ...t, mastery_level: res.mastery.level, danger_zone: res.mastery.danger_zone } : t,
        ),
      );
      setPhase({ kind: "feedback", q, result: res });
    } catch (err) {
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
        retry: "grade",
        q,
      });
    }
  }

  function startSession() {
    setAnswered([]);
    lastResult.current = null;
    prefetch.current = null;
    void loadQuestion(false);
  }

  if (session === "error" || course === "error") {
    return (
      <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
        We couldn&apos;t load this course. Please refresh the page.
      </p>
    );
  }
  if (course === "missing") {
    return (
      <p className="text-slate-700">
        We couldn&apos;t find this course.{" "}
        <Link href="/" className="font-medium text-indigo-700 underline">
          Back to home
        </Link>
      </p>
    );
  }

  const base = `/course/${courseId}`;
  const done = answered.length;
  const questionNumber = Math.min(done + 1, SESSION_LENGTH);

  return (
    <div className="space-y-4">
      <div>
        <Link href={base} className="text-sm text-indigo-700 hover:underline">
          ← {course?.name ?? "Course"}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">🎯 Quiz Mode</h1>
        <p className="text-slate-700">Test yourself before the real exam does.</p>
        <p className="mt-1 text-sm text-slate-600">📚 Practice — at your own pace, hints on, no timer.</p>
      </div>

      {course && <InjectionBanner pages={course.flagged_pages ?? []} />}

      {phase.kind === "setup" && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {topics.length === 0 && course ? (
            <p className="text-sm text-slate-700">This course has no topics yet, so there&apos;s nothing to quiz on.</p>
          ) : (
            <>
              <fieldset>
                <legend className="font-semibold text-slate-900">What should we practise?</legend>
                <div className="mt-2 grid gap-2">
                  {[
                    { value: "mix", label: "🔀 Mix it up", sub: "Weakest topics first" },
                    { value: "weak", label: "🩹 Review my weak spots", sub: "Danger zones and recent misses" },
                  ].map((o) => (
                    <ChoiceButton key={o.value} active={topicChoice === o.value} onClick={() => setTopicChoice(o.value)}>
                      <span className="font-medium">{o.label}</span>
                      <span className="block text-xs text-slate-500">{o.sub}</span>
                    </ChoiceButton>
                  ))}
                  <label htmlFor="topic-select" className="sr-only">
                    Or pick a topic
                  </label>
                  <select
                    id="topic-select"
                    value={topicChoice === "mix" || topicChoice === "weak" ? "" : topicChoice}
                    onChange={(e) => e.target.value && setTopicChoice(e.target.value)}
                    className={`rounded-xl border px-3 py-2.5 text-sm ${
                      topicChoice !== "mix" && topicChoice !== "weak"
                        ? "border-indigo-600 bg-indigo-50 text-slate-900"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    <option value="">📖 Or pick one topic…</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.danger_zone ? "⚠️ " : ""}
                        {t.name} — {levelLabel(t.mastery_level)}
                      </option>
                    ))}
                  </select>
                </div>
              </fieldset>

              <fieldset>
                <legend className="font-semibold text-slate-900">Question type</legend>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <ChoiceButton active={formatChoice === "surprise"} onClick={() => setFormatChoice("surprise")}>
                    <span className="font-medium">🎲 Surprise me</span>
                    <span className="block text-xs text-slate-500">Matched to your level</span>
                  </ChoiceButton>
                  {FORMAT_ORDER.map((f) => (
                    <ChoiceButton key={f} active={formatChoice === f} onClick={() => setFormatChoice(f)}>
                      <span className="font-medium">{FORMATS[f].label}</span>
                      <span className="block text-xs text-slate-500">
                        {FORMATS[f].blurb} · {levelLabel(FORMATS[f].level)}
                      </span>
                    </ChoiceButton>
                  ))}
                </div>
              </fieldset>

              <button
                onClick={startSession}
                disabled={session !== "ready" || !course || topics.length === 0}
                className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                Start a {SESSION_LENGTH}-question round
              </button>
            </>
          )}
        </div>
      )}

      {phase.kind === "loading" && (
        <div role="status" className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-700">
          <p className="text-3xl" aria-hidden>
            🦉
          </p>
          <p className="mt-2 font-medium">Writing question {questionNumber} and double-checking it against your notes…</p>
          <p className="mt-1 text-slate-500">This can take up to half a minute.</p>
        </div>
      )}

      {(phase.kind === "question" || phase.kind === "grading") && (
        <QuestionCard
          question={phase.q}
          number={questionNumber}
          total={SESSION_LENGTH}
          draft={draft}
          onDraft={setDraft}
          onSubmit={() => void submit(phase.q)}
          submitting={phase.kind === "grading"}
        />
      )}

      {phase.kind === "feedback" && (
        <>
          <QuestionCard
            question={phase.q}
            number={done}
            total={SESSION_LENGTH}
            draft={draft}
            onDraft={() => {}}
            onSubmit={() => {}}
            submitting={false}
            readOnly
          />
          <FeedbackCard result={phase.result} question={phase.q} onOpenPage={(page) => setOpenPage({ page })} />
          {done >= SESSION_LENGTH ? (
            <button
              onClick={() => setPhase({ kind: "summary" })}
              className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white hover:bg-indigo-800"
            >
              See how you did →
            </button>
          ) : (
            <button
              onClick={() => void loadQuestion(true)}
              className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white hover:bg-indigo-800"
            >
              Next question →
            </button>
          )}
        </>
      )}

      {phase.kind === "wellbeing" && (
        <>
          <WellbeingCard message={phase.message} />
          <button
            onClick={() => setPhase({ kind: "question", q: phase.q })}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 hover:bg-slate-50"
          >
            Back to the question when you&apos;re ready
          </button>
        </>
      )}

      {phase.kind === "summary" && (
        <SessionSummary
          answered={answered}
          onOpenRange={(t) => setOpenPage({ page: t.page_start, range: [t.page_start, t.page_end] })}
          onAgain={startSession}
          progressHref={`${base}/progress`}
        />
      )}

      {phase.kind === "error" && (
        <div role="alert" className="space-y-3 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
          <p>{phase.message}</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                phase.retry === "grade" && phase.q
                  ? void submit(phase.q)
                  : void loadQuestion(false)
              }
              className="rounded-lg bg-red-700 px-3 py-1.5 font-semibold text-white hover:bg-red-800"
            >
              Try again
            </button>
            <button
              onClick={() => setPhase({ kind: "setup" })}
              className="rounded-lg border border-red-300 px-3 py-1.5 font-medium text-red-800 hover:bg-red-100"
            >
              Change topic or type
            </button>
          </div>
        </div>
      )}

      {openPage && (
        <PageModal courseId={courseId} page={openPage.page} range={openPage.range} onClose={() => setOpenPage(null)} />
      )}
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
        active ? "border-indigo-600 bg-indigo-50 text-slate-900" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function SessionSummary({
  answered,
  onOpenRange,
  onAgain,
  progressHref,
}: {
  answered: Answered[];
  onOpenRange: (t: PublicQuestion["topic"]) => void;
  onAgain: () => void;
  progressHref: string;
}) {
  const correct = answered.filter((a) => a.verdict === "correct").length;
  // Focus on the topic with the most misses this session.
  const misses = new Map<string, { topic: PublicQuestion["topic"]; n: number }>();
  for (const a of answered) {
    if (a.verdict === "correct") continue;
    const m = misses.get(a.topic.id) ?? { topic: a.topic, n: 0 };
    m.n += a.verdict === "incorrect" ? 2 : 1;
    misses.set(a.topic.id, m);
  }
  const focus = [...misses.values()].sort((a, b) => b.n - a.n)[0]?.topic;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm">
      <p className="text-3xl" aria-hidden>
        {correct === answered.length ? "🏆" : "🦉"}
      </p>
      <p className="text-lg font-bold">
        You answered {correct}/{answered.length} correctly.
      </p>
      {focus ? (
        <p>
          Focus on {focus.name}{" "}
          <button onClick={() => onOpenRange(focus)} className="font-semibold text-indigo-800 underline">
            ({pageRange(focus.page_start, focus.page_end)})
          </button>
          .
        </p>
      ) : (
        <p>Brilliant — every answer was spot on! 🎉</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={onAgain}
          className="flex-1 rounded-xl bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800"
        >
          Another round
        </button>
        <Link
          href={progressHref}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-center font-semibold text-slate-800 hover:bg-slate-50"
        >
          📈 See my progress
        </Link>
      </div>
    </div>
  );
}

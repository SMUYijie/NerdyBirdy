"use client";

import { levelLabel } from "@/lib/mastery";
import type { GradedResult, PublicQuestion } from "@/lib/quiz/types";

const LETTERS = ["A", "B", "C", "D"];

function headline(r: GradedResult): string {
  if (r.format === "mcq") {
    return r.verdict === "correct" ? "Nailed it! 🎉" : "Not quite — but now you'll remember it 💪";
  }
  if (r.verdict === "correct") return `Nailed it! You got all ${r.total} key points 🎉`;
  if (r.verdict === "partial") return `Nice try! You got ${r.hits} out of ${r.total} key points 👍`;
  return `Not quite — you got ${r.hits} out of ${r.total} key points. Let's fix that 💪`;
}

export function FeedbackCard({
  result,
  question,
  onOpenPage,
}: {
  result: GradedResult;
  question: PublicQuestion;
  onOpenPage: (page: number) => void;
}) {
  const tone =
    result.verdict === "correct"
      ? "border-emerald-300 bg-emerald-50"
      : result.verdict === "partial"
        ? "border-amber-300 bg-amber-50"
        : "border-rose-300 bg-rose-50";

  return (
    <div className={`space-y-3 rounded-2xl border p-4 text-sm text-slate-900 ${tone}`} aria-live="polite">
      <p className="text-base font-bold">{headline(result)}</p>

      {result.mastery.leveled_up && (
        <p className="rounded-lg bg-white px-3 py-2 font-semibold text-emerald-900">
          🎉 Level up! {question.topic.name} is now {levelLabel(result.mastery.level)}.
        </p>
      )}

      {result.feedback && <p className="text-slate-800">{result.feedback}</p>}

      <ul className="space-y-1">
        {result.key_points
          .filter((k) => k.hit)
          .map((k, i) => (
            <li key={`h${i}`}>✅ {k.point}</li>
          ))}
        {result.key_points
          .filter((k) => !k.hit)
          .map((k, i) => (
            <li key={`m${i}`}>❌ You missed: {k.point}</li>
          ))}
      </ul>

      {result.what_happened && (
        <p>
          💡 <span className="font-semibold">What happened:</span> {result.what_happened}
        </p>
      )}
      {result.very_sure_warning && (
        <p className="font-medium">
          ⚠️ You said you were &quot;very sure&quot;, so this is going on your review list.
        </p>
      )}
      {result.low_confidence_page !== null && (
        <p>
          🧐 Double-check this one with your notes{" "}
          <button
            onClick={() => onOpenPage(result.low_confidence_page!)}
            className="font-semibold text-indigo-800 underline"
          >
            (p. {result.low_confidence_page})
          </button>
          .
        </p>
      )}
      {result.reread_pages.length > 0 && (
        <p className="flex flex-wrap items-center gap-1">
          📄 Re-read:
          {result.reread_pages.map((p) => (
            <button
              key={p}
              onClick={() => onOpenPage(p)}
              className="rounded-full bg-white px-2 py-0.5 font-semibold text-indigo-800 underline hover:bg-indigo-50"
            >
              Page {p}
            </button>
          ))}
        </p>
      )}
      {result.comeback_format_label && (
        <p>🔁 This will come back later as a &quot;{result.comeback_format_label.replace(/^\S+\s/, "")}&quot; question.</p>
      )}

      {result.format === "mcq" && question.options && result.reveal.correct_option !== null ? (
        <div className="rounded-lg bg-white px-3 py-2">
          <p className="font-semibold">Answer</p>
          <p>
            {LETTERS[result.reveal.correct_option]}. {question.options[result.reveal.correct_option]}
            {result.reveal.chosen_option !== null &&
              result.reveal.chosen_option !== result.reveal.correct_option &&
              ` (you picked ${LETTERS[result.reveal.chosen_option]})`}
          </p>
        </div>
      ) : (
        <details className="rounded-lg bg-white px-3 py-2">
          <summary className="cursor-pointer font-semibold">See a model answer</summary>
          {result.reveal.original_statement && (
            <p className="mt-2">
              <span className="font-medium">Original statement (p. {result.reveal.original_statement.page}):</span>{" "}
              {result.reveal.original_statement.text}
            </p>
          )}
          <p className="mt-2 whitespace-pre-wrap">{result.reveal.model_answer}</p>
        </details>
      )}
    </div>
  );
}

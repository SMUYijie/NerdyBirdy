"use client";

import { ConfidencePicker, type ConfidenceValue } from "@/components/ConfidencePicker";
import { Markdown } from "@/components/Markdown";
import { LIMITS } from "@/lib/ai/schemas";
import { levelLabel, pageRange } from "@/lib/mastery";
import type { PublicQuestion } from "@/lib/quiz/types";

export type AnswerDraft = {
  option: number | null;
  text: string;
  confidence: ConfidenceValue | null;
  hintShown: boolean;
};

const LETTERS = ["A", "B", "C", "D"];

export function QuestionCard({
  question,
  number,
  total,
  draft,
  onDraft,
  onSubmit,
  submitting,
  readOnly,
}: {
  question: PublicQuestion;
  number: number;
  total: number;
  draft: AnswerDraft;
  onDraft: (d: AnswerDraft) => void;
  onSubmit: () => void;
  submitting: boolean;
  readOnly?: boolean;
}) {
  const isMcq = question.format === "mcq";
  const hasAnswer = isMcq ? draft.option !== null : draft.text.trim().length > 0;
  const disabled = submitting || readOnly;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-slate-500">
          Question {number} of {total}
        </span>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-900">
          {question.formatLabel}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
          {levelLabel(question.level)}
        </span>
        {question.comeback && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
            🔁 Comeback question
          </span>
        )}
      </div>
      <p className="text-xs text-slate-600">
        📚 {question.topic.name} ({pageRange(question.topic.page_start, question.topic.page_end)})
        {question.secondTopic &&
          ` + ${question.secondTopic.name} (${pageRange(question.secondTopic.page_start, question.secondTopic.page_end)})`}
      </p>

      <div className="text-[0.95rem] text-slate-900">
        <Markdown text={question.question_markdown} />
      </div>

      {isMcq && question.options ? (
        <div role="radiogroup" aria-label="Options" className="space-y-2">
          {question.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={draft.option === i}
              disabled={disabled}
              onClick={() => onDraft({ ...draft, option: i })}
              className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                draft.option === i
                  ? "border-indigo-600 bg-indigo-50 text-slate-900"
                  : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  draft.option === i ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {LETTERS[i]}
              </span>
              <span>{opt}</span>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <label htmlFor="answer" className="sr-only">
            Your answer
          </label>
          <textarea
            id="answer"
            value={draft.text}
            onChange={(e) => onDraft({ ...draft, text: e.target.value })}
            maxLength={LIMITS.maxAnswerChars}
            rows={5}
            disabled={disabled}
            placeholder={
              question.format === "spot_the_mistake"
                ? "What's wrong, and what should it say?"
                : "Answer in your own words…"
            }
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
          />
          <p className="text-right text-xs text-slate-500">
            {draft.text.length}/{LIMITS.maxAnswerChars}
          </p>
        </div>
      )}

      <div>
        {draft.hintShown ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">💡 {question.hint}</p>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onDraft({ ...draft, hintShown: true })}
            className="text-sm font-medium text-amber-800 hover:underline disabled:opacity-50"
          >
            💡 Hint
          </button>
        )}
      </div>

      {!readOnly && (
        <>
          <ConfidencePicker
            value={draft.confidence}
            onChange={(confidence) => onDraft({ ...draft, confidence })}
            disabled={submitting}
          />
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || !hasAnswer || !draft.confidence}
            className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {submitting ? "🦉 Marking your answer against your notes…" : "Check my answer"}
          </button>
          {!submitting && hasAnswer && !draft.confidence && (
            <p className="text-center text-xs text-slate-500">Pick how sure you are to check your answer.</p>
          )}
        </>
      )}
    </div>
  );
}

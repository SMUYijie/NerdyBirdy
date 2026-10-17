"use client";

import { Markdown } from "@/components/Markdown";
import { IntegrityCard, UnsafeCard, WellbeingCard } from "@/components/SafetyCards";
import type { AskStatus } from "@/lib/ai/schemas";

export type AssistantReply = {
  status: AskStatus;
  answer_markdown: string;
  cited_pages: number[];
  general: boolean;
  note: string | null;
};

export type FollowUpKind = "simpler" | "example" | "why";

export type AskBody = {
  question: string;
  followUp?: FollowUpKind;
  mode?: "grounded" | "general";
};

export type ChatItem =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; question: string; reply: AssistantReply }
  | { id: string; role: "error"; text: string; retry: { label: string; body: AskBody } };

const FOLLOW_UP_LABELS: { kind: FollowUpKind; label: string }[] = [
  { kind: "simpler", label: "Explain simpler" },
  { kind: "example", label: "Give me an example" },
  { kind: "why", label: "Why does this matter?" },
];

export function ChatMessage({
  item,
  quizHref,
  busy,
  onCite,
  onFollowUp,
  onExplainAnyway,
  onRetry,
}: {
  item: ChatItem;
  quizHref: string;
  busy: boolean;
  onCite: (page: number) => void;
  onFollowUp: (question: string, kind: FollowUpKind, label: string) => void;
  onExplainAnyway: (question: string) => void;
  onRetry: (label: string, body: AskBody) => void;
}) {
  if (item.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-700 px-4 py-2 text-sm whitespace-pre-wrap text-white">
          {item.text}
        </p>
      </div>
    );
  }

  if (item.role === "error") {
    return (
      <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
        {item.text}{" "}
        <button
          onClick={() => onRetry(item.retry.label, item.retry.body)}
          disabled={busy} className="font-semibold underline">
          Try again
        </button>
      </div>
    );
  }

  const { reply, question } = item;

  if (reply.status === "wellbeing_support") return <WellbeingCard message={reply.answer_markdown} />;
  if (reply.status === "integrity_boundary")
    return <IntegrityCard message={reply.answer_markdown} quizHref={quizHref} />;
  if (reply.status === "unsafe_request") return <UnsafeCard message={reply.answer_markdown} />;

  if (reply.status === "not_in_notes") {
    return (
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900">
        <p className="font-semibold">🔍 That&apos;s not in your notes.</p>
        {reply.note && <p className="text-slate-700">{reply.note}</p>}
        <p className="text-slate-600">
          I only teach from your notes, so I won&apos;t guess. Want a general explanation instead?
        </p>
        <button
          onClick={() => onExplainAnyway(question)}
          disabled={busy}
          className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          Explain anyway
        </button>
      </div>
    );
  }

  // answered
  return (
    <div className="space-y-2 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900">
      {reply.general ? (
        <p className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
          ⚠️ Not from your syllabus
        </p>
      ) : (
        <p className="text-xs font-medium text-slate-500">🦉 From your notes</p>
      )}
      <Markdown text={reply.answer_markdown} onCite={reply.general ? undefined : onCite} />
      {!reply.general && reply.cited_pages.length > 0 && (
        <p className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
          📄 Sources:
          {reply.cited_pages.map((p) => (
            <button
              key={p}
              onClick={() => onCite(p)}
              className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-800 hover:bg-indigo-200"
            >
              p. {p}
            </button>
          ))}
        </p>
      )}
      {!reply.general && (
        <div className="flex flex-wrap gap-2 pt-1">
          {FOLLOW_UP_LABELS.map(({ kind, label }) => (
            <button
              key={kind}
              onClick={() => onFollowUp(question, kind, label)}
              disabled={busy}
              className="rounded-full border border-indigo-200 px-3 py-1 text-xs font-medium text-indigo-800 hover:bg-indigo-50 disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

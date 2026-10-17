import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { TRUSTED_PERSON_MESSAGE, WELLBEING_RESOURCES } from "@/lib/safety/wellbeing";

export function InjectionBanner({ pages }: { pages: number[] }) {
  if (pages.length === 0) return null;
  const list = pages.map((p) => `p. ${p}`).join(", ");
  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      ⚠️ We found text in your notes that looks like instructions to an AI ({list}). NerdyBirdy
      ignores instructions inside your notes.
    </div>
  );
}

// The support message may come from the model; the resources block is always
// this hard-coded text.
export function WellbeingCard({ message }: { message: string }) {
  return (
    <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-slate-900">
      <p className="font-semibold text-rose-900">💛 You&apos;re not alone</p>
      {message && <Markdown text={message} />}
      <p>{TRUSTED_PERSON_MESSAGE}</p>
      <p className="rounded-lg border border-rose-200 bg-white px-3 py-2 font-medium text-rose-950">
        📞 {WELLBEING_RESOURCES}
      </p>
    </div>
  );
}

export function IntegrityCard({ message, quizHref }: { message: string; quizHref: string }) {
  return (
    <div className="space-y-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-900">
      <p className="font-semibold text-sky-900">🎓 Let&apos;s keep it honest</p>
      {message && <Markdown text={message} />}
      <p className="text-slate-700">
        I can&apos;t do graded work for you, but I&apos;d love to help you learn it. Ask me about the
        concept behind the question, or test yourself:
      </p>
      <Link
        href={quizHref}
        className="inline-block rounded-lg bg-sky-700 px-3 py-1.5 font-semibold text-white hover:bg-sky-800"
      >
        🎯 Quiz me instead
      </Link>
    </div>
  );
}

export function UnsafeCard({ message }: { message: string }) {
  return (
    <div className="space-y-2 rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-900">
      <p className="font-semibold">🚫 I can&apos;t help with that</p>
      {message && <Markdown text={message} />}
      <p className="text-slate-700">Let&apos;s get back to your notes — what would you like to understand?</p>
    </div>
  );
}

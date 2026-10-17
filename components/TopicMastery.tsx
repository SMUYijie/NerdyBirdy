import { CORRECT_TO_LEVEL_UP, levelLabel, pageRange } from "@/lib/mastery";

export type TopicRow = {
  id: string;
  name: string;
  summary: string;
  page_start: number;
  page_end: number;
  mastery_level: number;
  danger_zone: boolean;
  level_progress?: number;
};

export function TopicMastery({
  topics,
  showProgress,
  onOpenRange,
}: {
  topics: TopicRow[];
  showProgress?: boolean;
  onOpenRange?: (t: TopicRow) => void;
}) {
  return (
    <ul className="space-y-2">
      {topics.map((t) => (
        <li key={t.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="font-semibold text-slate-900">
              {t.danger_zone && (
                <span title="Danger zone: you were very sure but wrong" className="mr-1">
                  ⚠️
                </span>
              )}
              {t.name}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                t.mastery_level === 0 ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-900"
              }`}
            >
              {levelLabel(t.mastery_level)}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-700">{t.summary}</p>
          {t.danger_zone && (
            <p className="mt-1 text-xs font-medium text-amber-900">
              ⚠️ Danger zone — you were very sure but got it wrong. Two correct answers in a row clear it.
            </p>
          )}
          {showProgress && t.mastery_level < 4 && (
            <div className="mt-2">
              <div className="flex gap-1" aria-hidden>
                {Array.from({ length: CORRECT_TO_LEVEL_UP }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${i < (t.level_progress ?? 0) ? "bg-emerald-500" : "bg-slate-200"}`}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {t.level_progress ?? 0}/{CORRECT_TO_LEVEL_UP} correct toward {levelLabel(t.mastery_level + 1)}
              </p>
            </div>
          )}
          {onOpenRange ? (
            <button
              onClick={() => onOpenRange(t)}
              className="mt-1 text-xs font-medium text-indigo-800 underline"
            >
              📄 {pageRange(t.page_start, t.page_end)}
            </button>
          ) : (
            <p className="mt-1 text-xs text-slate-500">📄 {pageRange(t.page_start, t.page_end)}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

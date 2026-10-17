import { levelLabel, pageRange } from "@/lib/mastery";

export type TopicRow = {
  id: string;
  name: string;
  summary: string;
  page_start: number;
  page_end: number;
  mastery_level: number;
  danger_zone: boolean;
};

export function TopicMastery({ topics }: { topics: TopicRow[] }) {
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
                t.mastery_level === 0
                  ? "bg-slate-100 text-slate-700"
                  : "bg-emerald-100 text-emerald-900"
              }`}
            >
              {levelLabel(t.mastery_level)}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-700">{t.summary}</p>
          <p className="mt-1 text-xs text-slate-500">📄 {pageRange(t.page_start, t.page_end)}</p>
        </li>
      ))}
    </ul>
  );
}

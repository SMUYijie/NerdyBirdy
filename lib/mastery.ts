export const LEVEL_NAMES = ["Not started", "Remember", "Explain", "Apply", "Connect"] as const;

export function levelLabel(level: number): string {
  const n = Math.max(0, Math.min(4, Math.round(level)));
  return n === 0 ? "Not started" : `Level ${n} — ${LEVEL_NAMES[n]}`;
}

export function pageRange(start: number, end: number): string {
  return start === end ? `p. ${start}` : `p. ${start}–${end}`;
}

// Mastery rules (section 7.5). Pure functions, shared by server and browser.

export const LEVEL_NAMES = ["Not started", "Remember", "Explain", "Apply", "Connect"] as const;
export const CORRECT_TO_LEVEL_UP = 2;

export function levelLabel(level: number): string {
  const n = Math.max(0, Math.min(4, Math.round(level)));
  return n === 0 ? "Not started" : `Level ${n} — ${LEVEL_NAMES[n]}`;
}

export function pageRange(start: number, end: number): string {
  return start === end ? `p. ${start}` : `p. ${start}–${end}`;
}

// The next question for a topic is at mastery_level + 1 (maximum 4).
export function targetLevel(masteryLevel: number): 1 | 2 | 3 | 4 {
  return Math.min(4, Math.max(1, masteryLevel + 1)) as 1 | 2 | 3 | 4;
}

export type TopicForOrder = {
  id: string;
  mastery_level: number;
  danger_zone: boolean;
  last_practiced_at: string | null;
};

// Danger zone first, then lowest level, then least recently practiced
// (never-practiced first).
export function orderTopicsForReview<T extends TopicForOrder>(topics: T[]): T[] {
  return [...topics].sort((a, b) => {
    if (a.danger_zone !== b.danger_zone) return a.danger_zone ? -1 : 1;
    if (a.mastery_level !== b.mastery_level) return a.mastery_level - b.mastery_level;
    const ta = a.last_practiced_at ? Date.parse(a.last_practiced_at) : 0;
    const tb = b.last_practiced_at ? Date.parse(b.last_practiced_at) : 0;
    return ta - tb;
  });
}

export type Verdict = "correct" | "partial" | "incorrect";
export type Confidence = "guessing" | "fairly_sure" | "very_sure";

export type MasteryState = {
  mastery_level: number;
  level_progress: number;
  danger_zone: boolean;
};

// Applies one graded attempt. `recentVerdicts` are this topic's verdicts
// newest-first, INCLUDING this attempt (used to clear the danger zone).
export function applyAttempt(
  state: MasteryState,
  attempt: { verdict: Verdict; confidence: Confidence; questionLevel: number; recentVerdicts: Verdict[] },
): MasteryState & { leveledUp: boolean } {
  let { mastery_level, level_progress, danger_zone } = state;
  let leveledUp = false;

  const target = targetLevel(mastery_level);
  if (attempt.verdict === "correct" && attempt.questionLevel === target && mastery_level < 4) {
    level_progress += 1;
    if (level_progress >= CORRECT_TO_LEVEL_UP) {
      mastery_level = target;
      level_progress = 0;
      leveledUp = true;
    }
  }

  if (attempt.verdict === "incorrect" && attempt.confidence === "very_sure") {
    danger_zone = true;
  } else if (
    danger_zone &&
    attempt.recentVerdicts.length >= 2 &&
    attempt.recentVerdicts[0] === "correct" &&
    attempt.recentVerdicts[1] === "correct"
  ) {
    danger_zone = false;
  }

  return { mastery_level, level_progress, danger_zone, leveledUp };
}

export function verdictFromScore(score: number): Verdict {
  if (score >= 1) return "correct";
  if (score >= 0.5) return "partial";
  return "incorrect";
}

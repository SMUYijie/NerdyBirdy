import type { QuizFormat } from "@/lib/ai/schemas";

// Shared by server and browser.
export const FORMATS: Record<QuizFormat, { label: string; level: 1 | 2 | 3 | 4; blurb: string }> = {
  mcq: { label: "🔘 Pick the Right One", level: 1, blurb: "Multiple choice" },
  explain: { label: "✍️ Explain It", level: 2, blurb: "Short answer in your own words" },
  spot_the_mistake: { label: "🔍 Spot the Mistake", level: 2, blurb: "Find and fix the error" },
  apply: { label: "🌍 Real-World Challenge", level: 3, blurb: "Use the idea in a new scenario" },
  connect: { label: "🔗 Connect the Dots", level: 4, blurb: "How two topics relate" },
};

export const FORMAT_ORDER: QuizFormat[] = ["mcq", "explain", "spot_the_mistake", "apply", "connect"];

export function formatsForLevel(level: number): QuizFormat[] {
  return FORMAT_ORDER.filter((f) => FORMATS[f].level === level);
}

// The format a missed question comes back as. Deterministic, so the feedback
// card can promise it and /api/quiz/next can keep the promise.
export function comebackFormat(missed: QuizFormat): QuizFormat {
  switch (missed) {
    case "mcq":
      return "explain";
    case "explain":
      return "spot_the_mistake";
    case "spot_the_mistake":
      return "explain";
    case "apply":
      return "explain";
    case "connect":
      return "apply";
  }
}

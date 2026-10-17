// Browser-safe types for quiz API responses (mirrors lib/quiz/next.ts and
// lib/quiz/grade.ts, which are server-only).
import type { QuizFormat } from "@/lib/ai/schemas";

export type TopicRef = { id: string; name: string; page_start: number; page_end: number };

export type PublicQuestion = {
  questionId: string;
  format: QuizFormat;
  formatLabel: string;
  level: number;
  topic: TopicRef;
  secondTopic: TopicRef | null;
  comeback: boolean;
  question_markdown: string;
  options: string[] | null;
  hint: string;
};

export type GradedResult = {
  kind: "graded";
  format: QuizFormat;
  verdict: "correct" | "partial" | "incorrect";
  score: number;
  hits: number;
  total: number;
  key_points: { point: string; page: number; hit: boolean }[];
  mistake_type: string;
  mixed_up_with: string | null;
  feedback: string;
  what_happened: string | null;
  very_sure_warning: boolean;
  reread_pages: number[];
  low_confidence_page: number | null;
  comeback_format_label: string | null;
  reveal: {
    model_answer: string;
    correct_option: number | null;
    chosen_option: number | null;
    original_statement: { text: string; page: number } | null;
  };
  mastery: { level: number; leveled_up: boolean; danger_zone: boolean; topic_id: string };
};

export type GradeResponse = GradedResult | { kind: "wellbeing"; message: string };

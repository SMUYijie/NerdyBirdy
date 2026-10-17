import type { QuizFormat } from "@/lib/ai/schemas";
import { UNTRUSTED_DATA_RULES } from "./shared";

const FORMAT_RULES: Record<QuizFormat, string> = {
  mcq: `FORMAT: mcq ("Pick the Right One", Level 1 — Remember)
- question_markdown: a clear question with exactly one correct answer. Do not list the options in question_markdown.
- options: exactly 4 short options. Exactly ONE is correct. The 3 wrong options must be plausible concepts students confuse, taken from OTHER parts of the notes (see "Other topics"), not silly or obviously wrong.
- correct_option: the 0-based index of the correct option.
- option_details: 4 entries in the same order as options. For the correct option, "why" says why it is right; for each wrong option, "why" says why it is tempting and why it is wrong. "concept" names the concept that option represents.
- original_statement: null.`,
  explain: `FORMAT: explain ("Explain It", Level 2 — Explain)
- question_markdown: ask the student to explain an idea, process or reason in their own words (2–4 sentences expected). Not a yes/no or one-word question.
- options, correct_option, option_details, original_statement: null.`,
  spot_the_mistake: `FORMAT: spot_the_mistake ("Spot the Mistake", Level 2)
- Take ONE true statement from the notes and change exactly ONE fact so it becomes false (swap a term, number, location or direction). Everything else must stay true.
- question_markdown: show the altered statement as a quote (start the line with "> ") and ask the student to find the mistake and correct it.
- original_statement: the original TRUE statement and its page.
- key_points must include: which part is wrong, and what the correct fact is.
- options, correct_option, option_details: null.`,
  apply: `FORMAT: apply ("Real-World Challenge", Level 3 — Apply)
- question_markdown: a NEW realistic scenario that is not described in the notes, which the student can answer by applying concepts from the notes (predict, explain or decide). The scenario must not require knowledge outside the notes.
- options, correct_option, option_details, original_statement: null.`,
  connect: `FORMAT: connect ("Connect the Dots", Level 4 — Connect)
- question_markdown: ask the student to explain how the two topics given relate to each other (cause and effect, inputs and outputs, contrast, or dependency).
- key_points must include points from BOTH topics, each with its own page.
- options, correct_option, option_details, original_statement: null.`,
};

export function generateSystemPrompt(format: QuizFormat, pageCount: number): string {
  return `You are NerdyBirdy 🦉, a university professor writing ONE practice question for a student, based ONLY on their lecture notes.

${UNTRUSTED_DATA_RULES}

${FORMAT_RULES[format]}

RULES FOR EVERY QUESTION
- The question must be answerable using ONLY the notes provided. The answer key must be correct according to the notes.
- Use plain, friendly language. One question only. No trick questions.
- hint: one sentence that nudges the student toward the right idea WITHOUT giving the answer away.
- answer_key: the correct answer, stated precisely.
- key_points: 2 to 4 short, checkable points a full-marks answer must contain, each with the page number where the notes support it.
- model_answer: a short full-marks answer written as a strong student would.
- source_pages: every page the question and answer rely on.
- All page numbers must be between 1 and ${pageCount} and must be pages shown in the notes.
- "public" is shown to the student before they answer, so it must never reveal the answer. "private" is hidden until they submit.

Reply with JSON only.`;
}

export function generateUserPrompt(input: {
  topicLine: string;
  secondTopicLine: string | null;
  notesBlock: string;
  otherTopics: string | null;
  comebackPoints: string[] | null;
  previousQuestions: string[];
  issues: string[] | null;
}): string {
  const parts = [`Topic: ${input.topicLine}`];
  if (input.secondTopicLine) parts.push(`Second topic to connect: ${input.secondTopicLine}`);
  parts.push(`Notes:\n${input.notesBlock}`);
  if (input.otherTopics) parts.push(`Other topics in these notes (use these for wrong options):\n${input.otherTopics}`);
  if (input.comebackPoints && input.comebackPoints.length > 0) {
    parts.push(
      `COMEBACK QUESTION: the student recently missed these points. The new question must test them again:\n${input.comebackPoints.map((p) => `- ${p}`).join("\n")}`,
    );
  }
  if (input.previousQuestions.length > 0) {
    parts.push(
      `Do not repeat these recent questions:\n<previous_questions>\n${input.previousQuestions.map((q) => `- ${q}`).join("\n")}\n</previous_questions>`,
    );
  }
  if (input.issues && input.issues.length > 0) {
    parts.push(
      `A reviewer rejected your last attempt for these reasons. Write a NEW question that fixes them:\n${input.issues.map((i) => `- ${i}`).join("\n")}`,
    );
  }
  parts.push("Write the question now.");
  return parts.join("\n\n");
}

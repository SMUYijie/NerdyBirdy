// Untrusted-text handling: sanitizing, delimiter neutralizing, wrapping for
// prompts, and scanning for instruction-like text. Pure functions, no I/O.

// Strip null bytes and control characters (keep \n and \t), normalize spaces.
export function sanitizeText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\uFEFF]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Our prompts wrap untrusted text in tags like <untrusted_notes>. Anything in
// the text that looks like one of our tags (or a chat-template token) is
// defanged so it can't close the block or open a fake one.
const TAG_LIKE =
  /<\s*\/?\s*(untrusted[\w-]*|notes?|page|student[\w-]*|answer|question|system|instructions?|data|context|key_points?)\b[^>]*>/gi;
const CHAT_TOKENS = /<\|[^|>]{0,40}\|>/g;

export function neutralizeDelimiters(text: string): string {
  return text
    .replace(TAG_LIKE, (m) => m.replace(/</g, "‹").replace(/>/g, "›"))
    .replace(CHAT_TOKENS, (m) => m.replace(/</g, "‹").replace(/>/g, "›"))
    .replace(/<<<|>>>/g, "«");
}

export function wrapNotes(pages: { page: number; text: string }[]): string {
  const body = pages
    .map((p) => `<page number="${p.page}">\n${neutralizeDelimiters(p.text)}\n</page>`)
    .join("\n");
  return `<untrusted_notes>\n${body}\n</untrusted_notes>`;
}

export function wrapStudentText(tag: "student_question" | "student_answer", text: string): string {
  return `<untrusted_${tag}>\n${neutralizeDelimiters(text)}\n</untrusted_${tag}>`;
}

// ---------- Injection scanner ----------

const PATTERNS: { id: string; re: RegExp }[] = [
  {
    id: "ignore_instructions",
    re: /\b(ignore|forget|override|bypass)\b[^.\n]{0,40}\b(previous|prior|above|all|earlier|preceding|any|your|the)\b[^.\n]{0,25}\b(instructions?|prompts?|rules|directions|guidelines|rubric)\b/i,
  },
  { id: "disregard", re: /\bdisregard\b/i },
  { id: "you_are_now", re: /\byou are now\b/i },
  { id: "system_prompt", re: /\bsystem\s+prompt\b/i },
  { id: "new_instructions", re: /\bnew\s+instructions?\b/i },
  {
    id: "mark_correct",
    re: /\b(mark|grade|score|treat)\b[^.\n]{0,40}\b(answers?|responses?|submissions?)\b[^.\n]{0,25}\b(correct|right|full marks|100)\b/i,
  },
  { id: "full_marks", re: /\b(give|award|grant)\b[^.\n]{0,30}\b(full|maximum|perfect)\s+(marks|score|points)\b/i },
  {
    id: "addressed_to_ai",
    re: /\b(note|message|instructions?|reminder)\s+(to|for)\s+(the\s+|any\s+|all\s+)?(ai|a\.i\.|assistants?|llms?|chatbots?|language models?|ai tutors?|graders?)\b/i,
  },
  { id: "role_tag", re: /^\s*(assistant|system|developer)\s*:/im },
  { id: "chat_token", re: /<\|?\s*(im_start|im_end|system|assistant|endoftext)\s*\|?>/i },
  { id: "jailbreak", re: /\b(jailbreak|DAN mode|developer mode)\b/i },
];

export type ScanResult = { flagged: boolean; patterns: string[] };

export function scanForInjection(text: string): ScanResult {
  const patterns = PATTERNS.filter((p) => p.re.test(text)).map((p) => p.id);
  return { flagged: patterns.length > 0, patterns };
}

export function wrapConversation(history: { role: "user" | "assistant"; content: string }[]): string {
  const body = history
    .map((m) => `${m.role === "user" ? "Student" : "NerdyBirdy"}: ${neutralizeDelimiters(m.content)}`)
    .join("\n");
  return `<untrusted_conversation>\n${body}\n</untrusted_conversation>`;
}

// Wellbeing keyword pre-check and the HARD-CODED support resources.
// The resources text is never model-generated.

export const WELLBEING_RESOURCES =
  "Samaritans of Singapore (SOS): 24-hour hotline 1767 · 24-hour CareText (WhatsApp) 9151 1767. In an emergency, call 995. Outside Singapore? Contact your local emergency number.";

export const TRUSTED_PERSON_MESSAGE =
  "Talking to someone you trust — a friend, family member, or your school's counselling service — can really help. You don't have to carry this alone.";

// Shown when the keyword pre-check fires (no model involved).
export const WELLBEING_KEYWORD_MESSAGE =
  "It sounds like you're going through something really painful right now, and I'm glad you said something. Your safety matters far more than any exam. Please reach out to someone who can support you right now.";

const SELF_HARM_PATTERNS: RegExp[] = [
  /\bsuicid(e|al)\b/i,
  /\bkill(ing)?\s+my\s*self\b/i,
  /\bend(ing)?\s+(my|it)\s+(life|all)\b/i,
  /\bend\s+it\s+all\b/i,
  /\bself[\s-]*harm/i,
  /\b(hurt|harm|cut)(ing)?\s+my\s*self\b/i,
  /\bwant(ed)?\s+to\s+die\b/i,
  /\bwanna\s+die\b/i,
  /\b(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+alive|exist)\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\boverdos(e|ing)\b/i,
];

export function detectSelfHarm(text: string): boolean {
  const normalized = text.replace(/[’‘]/g, "'");
  return SELF_HARM_PATTERNS.some((re) => re.test(normalized));
}

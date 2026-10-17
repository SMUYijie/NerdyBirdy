// Deterministic citation validation for grounded answers.

const INLINE_CITATION = /\[p\.?\s*(\d{1,4})\]/gi;

export function inlineCitedPages(markdown: string): number[] {
  return [...markdown.matchAll(INLINE_CITATION)].map((m) => Number(m[1]));
}

export type CitationCheck = { ok: true } | { ok: false; problems: string[]; message: string };

export function validateCitations(
  answer: { answer_markdown: string; cited_pages: number[] },
  retrievedPages: number[],
): CitationCheck {
  const retrieved = new Set(retrievedPages);
  const cited = new Set(answer.cited_pages);
  const inline = inlineCitedPages(answer.answer_markdown);
  const problems: string[] = [];
  const messages: string[] = [];

  if (cited.size === 0) {
    problems.push("no_cited_pages");
    messages.push("cited_pages is empty.");
  }
  if (inline.length === 0) {
    problems.push("no_inline_citations");
    messages.push("The answer has no inline [p. N] citations.");
  }
  const notRetrieved = [...cited].filter((p) => !retrieved.has(p));
  if (notRetrieved.length > 0) {
    problems.push("cited_page_not_retrieved");
    messages.push(
      `These cited pages are not in the excerpts: ${notRetrieved.join(", ")}. Only cite pages ${[...retrieved].sort((a, b) => a - b).join(", ")}.`,
    );
  }
  const inlineNotListed = [...new Set(inline)].filter((p) => !cited.has(p));
  if (inlineNotListed.length > 0) {
    problems.push("inline_not_in_cited_pages");
    messages.push(`Inline citations ${inlineNotListed.join(", ")} are missing from cited_pages.`);
  }

  return problems.length === 0 ? { ok: true } : { ok: false, problems, message: messages.join(" ") };
}

export function stripCitations(markdown: string): string {
  return markdown.replace(INLINE_CITATION, "").replace(/\s+([.,;:!?])/g, "$1");
}

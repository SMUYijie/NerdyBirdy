export const CHUNK_MAX_CHARS = 1_500;
export const CHUNK_OVERLAP_CHARS = 150;
const MIN_CHUNK_CHARS = 30;

export type Chunk = { page: number; content: string };

// Splits each page into chunks of at most 1,500 chars with ~150 chars of
// overlap. Chunks never cross pages, so every chunk keeps its page number.
export function chunkPages(pages: { page: number; text: string }[]): Chunk[] {
  const chunks: Chunk[] = [];
  for (const { page, text } of pages) {
    for (const content of chunkText(text)) chunks.push({ page, content });
  }
  return chunks;
}

export function chunkText(text: string): string[] {
  const clean = text.trim();
  if (clean.length < MIN_CHUNK_CHARS) return [];
  if (clean.length <= CHUNK_MAX_CHARS) return [clean];

  const out: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + CHUNK_MAX_CHARS, clean.length);
    if (end < clean.length) {
      // Prefer to break at a paragraph, sentence or word boundary.
      const window = clean.slice(start, end);
      const minBreak = Math.floor(CHUNK_MAX_CHARS * 0.6);
      const breakAt = Math.max(
        window.lastIndexOf("\n\n"),
        window.lastIndexOf(". "),
        window.lastIndexOf("\n"),
      );
      if (breakAt >= minBreak) end = start + breakAt + 1;
      else {
        const space = window.lastIndexOf(" ");
        if (space >= minBreak) end = start + space;
      }
    }
    const piece = clean.slice(start, end).trim();
    if (piece.length >= MIN_CHUNK_CHARS) out.push(piece);
    if (end >= clean.length) break;
    // Step back for overlap, aligned to a word start.
    let next = Math.max(end - CHUNK_OVERLAP_CHARS, start + 1);
    const space = clean.indexOf(" ", next);
    if (space !== -1 && space < end) next = space + 1;
    start = next;
  }
  return out;
}

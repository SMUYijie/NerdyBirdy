// Browser only. Extracts per-page text from a PDF with pdf.js. The PDF file
// itself never leaves the browser.
import { LIMITS } from "@/lib/ai/schemas";

export type PageText = { page: number; text: string };

export class PdfError extends Error {}

export async function extractPdfPages(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<PageText[]> {
  const pdfjs = await import("pdfjs-dist");
  // Copied from node_modules into /public by the predev/prebuild scripts.
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  let doc;
  try {
    doc = await task.promise;
  } catch {
    await task.destroy();
    throw new PdfError("We couldn't open that PDF. Is it password-protected or damaged?");
  }

  try {
    if (doc.numPages > LIMITS.maxPages) {
      throw new PdfError(
        `This PDF has ${doc.numPages} pages. NerdyBirdy can read up to ${LIMITS.maxPages} pages — try splitting it.`,
      );
    }
    const pages: PageText[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items) {
        if ("str" in item) text += item.str + (item.hasEOL ? "\n" : " ");
      }
      pages.push({ page: i, text: text.replace(/[ \t]+/g, " ").trim().slice(0, LIMITS.maxPageChars) });
      page.cleanup();
      onProgress?.(i, doc.numPages);
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

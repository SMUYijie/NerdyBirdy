// Browser only. Extracts per-page text from a PDF with pdf.js. The PDF file
// itself never leaves the browser.
import { LIMITS } from "@/lib/ai/schemas";

export type PageText = { page: number; text: string };

export class PdfError extends Error {}

export async function extractPdfPages(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<PageText[]> {
  // The legacy build includes polyfills: the modern build uses very new JS
  // APIs (e.g. Uint8Array.prototype.toHex) that many browsers don't have yet.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Copied from node_modules into /public by the predev/prebuild scripts.
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  let doc;
  try {
    doc = await task.promise;
  } catch (err) {
    await task.destroy();
    const name = err instanceof Error ? err.name : "";
    console.warn("[pdf] open failed:", name); // error type only, never content
    if (name === "PasswordException") {
      throw new PdfError("This PDF is password-protected. Remove the password and try again.");
    }
    if (name === "InvalidPDFException") {
      throw new PdfError("That file doesn't look like a valid PDF. Try exporting it again.");
    }
    throw new PdfError("Your browser couldn't read that PDF. Try a different browser or re-export the PDF.");
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

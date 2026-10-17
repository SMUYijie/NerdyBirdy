import type { ReactNode } from "react";

// Minimal, safe markdown: paragraphs, bullet/numbered lists, headings, bold,
// italics, inline code and [p. N] citation chips. Everything is rendered as
// React text nodes (no HTML injection).

const INLINE = /(\*\*[^*]+\*\*|\[p\.?\s*\d{1,4}\]|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/gi;
const LIST_ITEM = /^\s*(?:[-*•]|\d+[.)])\s+/;

function renderInline(text: string, onCite?: (page: number) => void, keyPrefix = ""): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const tok = m[0];
    const key = `${keyPrefix}-${i++}`;
    const cite = tok.match(/^\[p\.?\s*(\d{1,4})\]$/i);
    if (cite) {
      const page = Number(cite[1]);
      out.push(
        onCite ? (
          <button
            key={key}
            type="button"
            onClick={() => onCite(page)}
            className="mx-0.5 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 align-baseline text-xs font-semibold text-indigo-800 hover:bg-indigo-200"
            aria-label={`Open page ${page} of your notes`}
          >
            p. {page}
          </button>
        ) : null,
      );
    } else if (tok.startsWith("**")) {
      out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("`")) {
      out.push(
        <code key={key} className="rounded bg-slate-100 px-1 font-mono text-[0.9em]">
          {tok.slice(1, -1)}
        </code>,
      );
    } else {
      out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    }
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, onCite }: { text: string; onCite?: (page: number) => void }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length === 0) return;
    const k = blocks.length;
    blocks.push(
      <p key={`p${k}`}>
        {para.map((l, j) => (
          <span key={j}>
            {j > 0 && <br />}
            {renderInline(l, onCite, `p${k}-${j}`)}
          </span>
        ))}
      </p>,
    );
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const k = blocks.length;
    const items = list.items.map((it, j) => <li key={j}>{renderInline(it, onCite, `l${k}-${j}`)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={`l${k}`} className="list-decimal space-y-1 pl-5">
          {items}
        </ol>
      ) : (
        <ul key={`l${k}`} className="list-disc space-y-1 pl-5">
          {items}
        </ul>
      ),
    );
    list = null;
  };

  for (const line of lines) {
    if (line.trim() === "") {
      flushPara();
      flushList();
    } else if (LIST_ITEM.test(line)) {
      flushPara();
      const ordered = /^\s*\d/.test(line);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(line.replace(LIST_ITEM, ""));
    } else if (/^#{1,6}\s+/.test(line)) {
      flushPara();
      flushList();
      const k = blocks.length;
      blocks.push(
        <p key={`h${k}`} className="font-semibold">
          {renderInline(line.replace(/^#{1,6}\s+/, ""), onCite, `h${k}`)}
        </p>,
      );
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();

  return <div className="space-y-2 leading-relaxed">{blocks}</div>;
}

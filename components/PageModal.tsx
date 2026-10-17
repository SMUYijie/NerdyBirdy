"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PageModal({
  courseId,
  page,
  onClose,
}: {
  courseId: string;
  page: number;
  onClose: () => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    createClient()
      .from("pages")
      .select("text")
      .eq("course_id", courseId)
      .eq("page_number", page)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) setFailed(true);
        else setText(data.text as string);
      });
    return () => {
      active = false;
    };
  }, [courseId, page]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-modal-title"
        className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 id="page-modal-title" className="font-semibold text-slate-900">
            📄 Page {page} of your notes
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
          {failed
            ? "We couldn't load this page."
            : text === null
              ? "Loading…"
              : text.trim() || "This page has no readable text."}
        </div>
      </div>
    </div>
  );
}

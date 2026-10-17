"use client";

import { useRef, useState } from "react";

export function UploadDropzone({
  file,
  onFile,
  disabled,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) onFile(e.dataTransfer.files?.[0] ?? null);
      }}
      className={`rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
        dragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-white"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        id="pdf-input"
        disabled={disabled}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <p className="text-sm text-slate-800">
          📄 <span className="font-medium">{file.name}</span>{" "}
          <span className="text-slate-500">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
        </p>
      ) : (
        <p className="text-sm text-slate-600">Drop your lecture PDF here</p>
      )}
      <label
        htmlFor="pdf-input"
        className={`mt-3 inline-block cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 ${
          disabled ? "pointer-events-none opacity-50" : ""
        }`}
      >
        {file ? "Choose a different PDF" : "Choose a PDF"}
      </label>
      <p className="mt-2 text-xs text-slate-500">PDF with selectable text · up to 25 MB · 150 pages</p>
    </div>
  );
}

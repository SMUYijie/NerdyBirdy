"use client";

import { useEffect, useState } from "react";

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin text-indigo-600 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Inline "spinner + message" for any wait.
export function Loading({ message, className = "" }: { message: string; className?: string }) {
  return (
    <div role="status" className={`flex items-center gap-2 text-sm text-slate-600 ${className}`}>
      <Spinner />
      <span>{message}</span>
    </div>
  );
}

// A bigger card for long waits; cycles through messages so it feels alive.
export function LoadingCard({ messages, sub }: { messages: string[]; sub?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (messages.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % messages.length), 3500);
    return () => clearInterval(t);
  }, [messages.length]);
  return (
    <div role="status" className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <Spinner className="absolute h-16 w-16" />
        <span className="text-3xl" aria-hidden>
          🦉
        </span>
      </div>
      <p className="mt-3 font-medium text-slate-800">{messages[i % messages.length]}</p>
      {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
    </div>
  );
}

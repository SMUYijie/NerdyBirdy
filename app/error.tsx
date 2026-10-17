"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="space-y-3 py-10 text-center">
      <p className="text-5xl" aria-hidden>
        🦉
      </p>
      <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
      <p className="text-slate-700">Sorry about that. Your notes are safe — please try again.</p>
      <div className="flex justify-center gap-2">
        <button
          onClick={reset}
          className="rounded-xl bg-indigo-700 px-4 py-2.5 font-semibold text-white hover:bg-indigo-800"
        >
          Try again
        </button>
        <Link href="/" className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-800 hover:bg-slate-50">
          Home
        </Link>
      </div>
    </div>
  );
}

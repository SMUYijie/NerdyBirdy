import { Suspense } from "react";
import { QuizClient } from "@/components/QuizClient";

export default function QuizPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">🦉 Loading…</p>}>
      <QuizClient />
    </Suspense>
  );
}

import { Suspense } from "react";
import { ProgressClient } from "@/components/ProgressClient";

export default function ProgressPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">🦉 Loading…</p>}>
      <ProgressClient />
    </Suspense>
  );
}

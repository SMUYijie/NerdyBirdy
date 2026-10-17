import { Suspense } from "react";
import { AskClient } from "@/components/AskClient";

export default function AskPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">🦉 Loading…</p>}>
      <AskClient />
    </Suspense>
  );
}

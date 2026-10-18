import { Suspense } from "react";
import { Loading } from "@/components/Spinner";
import { QuizClient } from "@/components/QuizClient";

export default function QuizPage() {
  return (
    <Suspense fallback={<Loading message="Loading…" />}>
      <QuizClient />
    </Suspense>
  );
}

import { Suspense } from "react";
import { Loading } from "@/components/Spinner";
import { ProgressClient } from "@/components/ProgressClient";

export default function ProgressPage() {
  return (
    <Suspense fallback={<Loading message="Loading…" />}>
      <ProgressClient />
    </Suspense>
  );
}

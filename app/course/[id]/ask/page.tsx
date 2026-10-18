import { Suspense } from "react";
import { Loading } from "@/components/Spinner";
import { AskClient } from "@/components/AskClient";

export default function AskPage() {
  return (
    <Suspense fallback={<Loading message="Loading…" />}>
      <AskClient />
    </Suspense>
  );
}

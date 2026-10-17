import { useEffect, useState } from "react";
import { ensureSession } from "@/lib/supabase/client";

// Client hook: signs in anonymously on first visit, then reports "ready".
export function useSession(): "loading" | "ready" | "error" {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let active = true;
    ensureSession().then(
      () => active && setState("ready"),
      () => active && setState("error"),
    );
    return () => {
      active = false;
    };
  }, []);
  return state;
}

import type { SupabaseClient } from "@supabase/supabase-js";

export type SafetyEventType =
  | "injection_flagged"
  | "citation_invalid"
  | "verification_failed"
  | "integrity_boundary"
  | "wellbeing_support"
  | "unsafe_request"
  | "rate_limited";

// Writes a safety event with the user-scoped client (RLS: own rows only).
// `detail` must never contain note or answer text: only ids, page numbers,
// pattern names and counts. Never throws.
export async function logSafetyEvent(
  supabase: SupabaseClient,
  event: {
    type: SafetyEventType;
    courseId?: string | null;
    detail?: Record<string, string | number | boolean | null | (string | number)[]>;
  },
): Promise<void> {
  try {
    await supabase.from("safety_events").insert({
      type: event.type,
      course_id: event.courseId ?? null,
      detail: event.detail ?? {},
    });
  } catch {
    // Logging must never break the user's request.
  }
}

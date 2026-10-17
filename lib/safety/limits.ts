import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { logSafetyEvent } from "@/lib/safety/events";

export const USER_DAILY_LLM_CALLS = 120;
export const GLOBAL_DAILY_LLM_CALLS = 3_000;
export const RATE_LIMIT_MESSAGE =
  "You've hit today's study limit. Take a break — your brain will thank you 🧠";

export class RateLimitError extends Error {
  constructor() {
    super(RATE_LIMIT_MESSAGE);
    this.name = "RateLimitError";
  }
}

// Atomically counts `calls` LLM calls (chat or embedding) against the user's
// and the global daily budget. Throws RateLimitError when either is exceeded.
export async function spendLLMCalls(
  ctx: { supabase: SupabaseClient; userId: string; courseId?: string | null },
  calls = 1,
): Promise<void> {
  const admin = createAdminClient();
  for (let i = 0; i < calls; i++) {
    const [user, global] = await Promise.all([
      admin.rpc("bump_usage", { p_key: `user:${ctx.userId}`, p_limit: USER_DAILY_LLM_CALLS }),
      admin.rpc("bump_usage", { p_key: "global", p_limit: GLOBAL_DAILY_LLM_CALLS }),
    ]);
    if (user.error || global.error) throw new Error("Usage counter unavailable");
    if (user.data === false || global.data === false) {
      await logSafetyEvent(ctx.supabase, {
        type: "rate_limited",
        courseId: ctx.courseId,
        detail: { scope: user.data === false ? "user" : "global" },
      });
      throw new RateLimitError();
    }
  }
}

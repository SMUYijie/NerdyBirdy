import "server-only";
import { createClient } from "@supabase/supabase-js";

// Secret-key client. Bypasses RLS. Only for: usage counters, question_keys,
// cron cleanup and evals. Never use it to read or write user content on a
// user's behalf when the user-scoped client would do.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  }
  return createClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

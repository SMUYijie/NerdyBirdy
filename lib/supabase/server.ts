import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// User-scoped server client (publishable key + the user's session cookie),
// so RLS applies. Create a new one per request; never share across requests.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // The proxy refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}

export type UserContext = { supabase: SupabaseClient; userId: string };

// For route handlers: the user-scoped client plus the verified user id, or a
// 401 response if there is no session.
export async function requireUser(): Promise<UserContext | Response> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) {
    return Response.json(
      { error: "Your session has expired. Please refresh the page." },
      { status: 401 },
    );
  }
  return { supabase, userId };
}
